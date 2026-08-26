import { useEffect, useMemo, useRef, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";

import { DEFAULT_PROFILE } from "../lib/bodyMath";
import {
  applyProfileToGlb,
  captureBaseBoneScales,
  captureBaseMeshGeometry,
  captureBaseMeshScales,
  captureBaseModelTransform,
  MODEL_ASSET_PATHS,
} from "../lib/glbAdapter";
import type { BodyProfile, ModelType } from "../types/body";
import { FatTrendOverlay } from "./FatTrendOverlay";

function useGlbAsset(modelType: ModelType) {
  const cache = useRef<Partial<Record<ModelType, THREE.Object3D>>>({});
  const [asset, setAsset] = useState<{ modelType: ModelType; scene: THREE.Object3D } | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const path = MODEL_ASSET_PATHS[modelType];
    setAsset(null);
    setLoading(true);
    setProgress(0);
    const cached = cache.current[modelType];
    if (cached) {
      setAsset({ modelType, scene: cached });
      setLoading(false);
      setProgress(100);
      return () => controller.abort();
    }

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const updateProgress = (event: ProgressEvent<EventTarget>) => {
      if (controller.signal.aborted) return;

      // Some CDNs omit Content-Length. In that case, keep the progress bar
      // moving without claiming a false exact percentage.
      const percentage = event.lengthComputable && event.total > 0
        ? Math.round((event.loaded / event.total) * 100)
        : Math.min(90, Math.max(8, Math.round(event.loaded / 60_000)));
      setProgress(percentage);
    };

    // Load the production asset directly. The progress overlay gives users
    // clear feedback, so a visibly different low-poly placeholder is avoided.
    loader.load(
      path,
      (gltf) => {
        cache.current[modelType] = gltf.scene;
        if (!controller.signal.aborted) {
          setAsset({ modelType, scene: gltf.scene });
          setLoading(false);
          setProgress(100);
        }
      },
      updateProgress,
      () => {
        if (!controller.signal.aborted) setLoading(false);
      },
    );

    return () => {
      controller.abort();
    };
  }, [modelType]);

  return { asset, loading, progress };
}

function getModelBounds(root: THREE.Object3D) {
  const bounds = new THREE.Box3();
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.name === "Cube") return;
    object.geometry.computeBoundingBox();
    if (object.geometry.boundingBox) bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });

  return bounds;
}

/**
 * Meshopt reduces transfer size by quantizing vertex attributes. The decoded
 * attributes are normalized integers, which are ideal for rendering but not
 * for our runtime body-shape deformation (it writes vertex coordinates).
 * Convert only the editable attributes back to Float32 after loading.
 */
function createEditableGeometry(source: THREE.BufferGeometry) {
  const geometry = source.clone();

  (["position", "normal"] as const).forEach((name) => {
    const attribute = geometry.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!attribute || (attribute.array instanceof Float32Array && !attribute.normalized)) return;

    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let index = 0; index < attribute.count; index += 1) {
      values[index * attribute.itemSize] = attribute.getX(index);
      if (attribute.itemSize > 1) values[index * attribute.itemSize + 1] = attribute.getY(index);
      if (attribute.itemSize > 2) values[index * attribute.itemSize + 2] = attribute.getZ(index);
      if (attribute.itemSize > 3) values[index * attribute.itemSize + 3] = attribute.getW(index);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  });

  return geometry;
}

/**
 * The remeshed female source contains one isolated 7-vertex fragment near the
 * centre of the glutes. It is inconspicuous on the base mesh, but becomes a
 * visible yellow block when the fat surface is offset. Exclude tiny detached
 * islands from rendering while retaining the complete connected body mesh.
 */
function removeTinyDetachedIslands(geometry: THREE.BufferGeometry, minimumVertices = 32) {
  const index = geometry.getIndex();
  const position = geometry.getAttribute("position");
  if (!index || !position || position.count < minimumVertices) return geometry;

  const parents = new Int32Array(position.count);
  const ranks = new Uint8Array(position.count);
  const componentSize = new Uint32Array(position.count);
  for (let vertex = 0; vertex < parents.length; vertex += 1) parents[vertex] = vertex;

  const find = (vertex: number) => {
    let root = vertex;
    while (parents[root] !== root) root = parents[root];
    while (parents[vertex] !== vertex) {
      const next = parents[vertex];
      parents[vertex] = root;
      vertex = next;
    }
    return root;
  };
  const join = (left: number, right: number) => {
    let leftRoot = find(left);
    let rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    if (ranks[leftRoot] < ranks[rightRoot]) [leftRoot, rightRoot] = [rightRoot, leftRoot];
    parents[rightRoot] = leftRoot;
    if (ranks[leftRoot] === ranks[rightRoot]) ranks[leftRoot] += 1;
  };

  const source = index.array;
  for (let offset = 0; offset < source.length; offset += 3) {
    join(source[offset], source[offset + 1]);
    join(source[offset + 1], source[offset + 2]);
  }
  for (let vertex = 0; vertex < position.count; vertex += 1) componentSize[find(vertex)] += 1;

  let keptIndexCount = 0;
  for (let offset = 0; offset < source.length; offset += 3) {
    if (componentSize[find(source[offset])] >= minimumVertices) keptIndexCount += 3;
  }
  if (keptIndexCount === source.length) return geometry;

  const filtered = new Uint32Array(keptIndexCount);
  let target = 0;
  for (let offset = 0; offset < source.length; offset += 3) {
    if (componentSize[find(source[offset])] < minimumVertices) continue;
    filtered[target] = source[offset];
    filtered[target + 1] = source[offset + 1];
    filtered[target + 2] = source[offset + 2];
    target += 3;
  }
  geometry.setIndex(new THREE.BufferAttribute(filtered, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function RiggedGlbModel({ source, profile, showFatLayer }: { source: THREE.Object3D; profile: BodyProfile; showFatLayer: boolean }) {
  const instance = useMemo(() => {
    const cloned = cloneSkeleton(source);

    // A default Blender cube is not part of the body asset and must never appear in-app.
    cloned.traverse((object) => {
      if (object.name === "Cube") object.visible = false;
      if (object instanceof THREE.Mesh) {
        object.geometry = createEditableGeometry(object.geometry);
        if (profile.modelType === "female") {
          object.geometry = removeTinyDetachedIslands(object.geometry);
        }
        const hasMultipleMaterials = Array.isArray(object.material);
        const materials: THREE.Material[] = hasMultipleMaterials
          ? object.material as THREE.Material[]
          : [object.material as THREE.Material];
        const styledMaterials = materials.map((material) => {
          const next = material.clone() as THREE.MeshStandardMaterial;
          // Preserve authored textured models, while neutralising untextured
          // anatomy assets so the yellow fat layer remains visually distinct.
          // Match the warm, natural skin tone used by the body-shape guide
          // illustrations while retaining authored textures when an asset has
          // them. The warmer surface still reads clearly beneath the fat layer.
          if (!next.map) next.color.set("#c78363");
          next.roughness = Math.max(next.roughness, 0.62);
          next.metalness = 0;
          return next;
        });
        object.material = hasMultipleMaterials ? styledMaterials : styledMaterials[0];
      }
    });

    // The female Sketchfab export contains a rotated/scaled FBX hierarchy.
    // Bake that static hierarchy into the mesh once so regional deformation
    // uses the same upright local axes as the male asset. This is limited to
    // the female static asset and does not affect the male model's established
    // transform path.
    if (profile.modelType === "female") {
      cloned.updateMatrixWorld(true);
      const bakedMeshes: THREE.Mesh[] = [];
      cloned.traverse((object) => {
        if (object instanceof THREE.Mesh) bakedMeshes.push(object);
      });
      bakedMeshes.forEach((mesh) => {
        mesh.geometry.applyMatrix4(mesh.matrixWorld);
      });
      cloned.traverse((object) => {
        object.position.set(0, 0, 0);
        object.quaternion.identity();
        object.scale.set(1, 1, 1);
        object.updateMatrix();
      });
      cloned.updateMatrixWorld(true);

    }

    // Different source tools use different units and origins. Normalize every
    // completed asset to the product's default height and place its feet at y=0.
    const bounds = getModelBounds(cloned);
    const sourceHeight = bounds.max.y - bounds.min.y;
    const targetHeight = DEFAULT_PROFILE[profile.modelType].heightCm / 100;
    const modelScale = sourceHeight > 0 ? targetHeight / sourceHeight : 1;
    cloned.scale.setScalar(modelScale);
    cloned.position.y = -bounds.min.y * modelScale;

    return cloned;
  }, [profile.modelType, source]);
  const baseScales = useMemo(() => captureBaseBoneScales(instance), [instance]);
  const baseMeshScales = useMemo(() => captureBaseMeshScales(instance), [instance]);
  const baseMeshGeometry = useMemo(() => captureBaseMeshGeometry(instance), [instance]);
  const baseModelTransform = useMemo(() => captureBaseModelTransform(instance), [instance]);
  const overlayTransform = useMemo(() => {
    const heightRigNames = ["Spine", "Spine1", "LeftThigh", "LeftUpLeg", "RightThigh", "RightUpLeg", "LeftLeg", "RightLeg"];
    let hasHeightRig = false;
    instance.traverse((object) => {
      if (object instanceof THREE.Bone && heightRigNames.includes(object.name)) hasHeightRig = true;
    });

    const heightRatio = profile.heightCm / DEFAULT_PROFILE[profile.modelType].heightCm;
    const scale = baseModelTransform.scale.clone();
    const position = baseModelTransform.position.clone();
    if (!hasHeightRig) {
      scale.y *= heightRatio;
      position.y *= heightRatio;
    }

    return {
      position: [position.x, position.y, position.z] as [number, number, number],
      scale: [scale.x, scale.y, scale.z] as [number, number, number],
    };
  }, [baseModelTransform, instance, profile.heightCm, profile.modelType]);

  useEffect(() => {
    applyProfileToGlb(instance, profile, baseScales, baseMeshScales, baseMeshGeometry, baseModelTransform, showFatLayer);
  }, [baseMeshGeometry, baseMeshScales, baseModelTransform, baseScales, instance, profile, showFatLayer]);

  return (
    <>
      <primitive object={instance} />
      {showFatLayer && <FatTrendOverlay profile={profile} model={instance} {...overlayTransform} />}
    </>
  );
}

/**
 * Asset boundary between product features and renderer implementation.
 * Drop correctly named GLBs into public/models to activate the rigged path;
 * otherwise the existing procedural mannequin stays visible.
 */
export function ModelAdapter({ profile, showFatLayer, onLoadingChange, onLoadingProgress }: { profile: BodyProfile; showFatLayer: boolean; onLoadingChange?: (loading: boolean) => void; onLoadingProgress?: (progress: number) => void }) {
  const { asset, loading, progress } = useGlbAsset(profile.modelType);
  useEffect(() => onLoadingChange?.(loading), [loading, onLoadingChange]);
  useEffect(() => onLoadingProgress?.(progress), [onLoadingProgress, progress]);
  // Do not flash the blocky procedural mannequin while the production GLB is
  // downloading. The parent canvas shows a dedicated loading state instead.
  if (!asset) return null;

  // While an uncached model is loading, retain the last complete GLB. Its own
  // defaults avoid a brief female/male scale mismatch before the new asset wins.
  const displayProfile = asset.modelType === profile.modelType
    ? profile
    : { ...profile, modelType: asset.modelType };

  return <RiggedGlbModel source={asset.scene} profile={displayProfile} showFatLayer={showFatLayer} />;
}
