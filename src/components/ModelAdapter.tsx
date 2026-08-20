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
  MODEL_PREVIEW_PATHS,
} from "../lib/glbAdapter";
import type { BodyProfile, ModelType } from "../types/body";
import { FatTrendOverlay } from "./FatTrendOverlay";

function useGlbAsset(modelType: ModelType) {
  const cache = useRef<Partial<Record<ModelType, THREE.Object3D>>>({});
  const [asset, setAsset] = useState<{ modelType: ModelType; scene: THREE.Object3D } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const path = MODEL_ASSET_PATHS[modelType];
    const previewPath = MODEL_PREVIEW_PATHS[modelType];
    setAsset(null);
    setLoading(true);
    const cached = cache.current[modelType];
    if (cached) {
      setAsset({ modelType, scene: cached });
      setLoading(false);
      return () => controller.abort();
    }

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    // Paint the lightweight preview first. It is intentionally independent of
    // the high-detail cache so the production model can replace it in place.
    if (previewPath) {
      loader.load(previewPath, (gltf) => {
        if (!controller.signal.aborted && !cache.current[modelType]) {
          setAsset({ modelType, scene: gltf.scene });
          setLoading(false);
        }
      });
    }
    // Start the high-detail GLB shortly after the preview gets a chance to
    // paint. This prevents a 30MB download from competing with first paint.
    const loadHighDetail = () => loader.load(
      path,
      (gltf) => {
        cache.current[modelType] = gltf.scene;
        if (!controller.signal.aborted) {
          setAsset({ modelType, scene: gltf.scene });
          setLoading(false);
        }
      },
      undefined,
      () => {
        if (!controller.signal.aborted) setLoading(false);
      },
    );
    const highDetailTimer = window.setTimeout(loadHighDetail, previewPath ? 250 : 0);

    return () => {
      window.clearTimeout(highDetailTimer);
      controller.abort();
    };
  }, [modelType]);

  return { asset, loading };
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

function RiggedGlbModel({ source, profile, showFatLayer }: { source: THREE.Object3D; profile: BodyProfile; showFatLayer: boolean }) {
  const instance = useMemo(() => {
    const cloned = cloneSkeleton(source);

    // A default Blender cube is not part of the body asset and must never appear in-app.
    cloned.traverse((object) => {
      if (object.name === "Cube") object.visible = false;
      if (object instanceof THREE.Mesh) {
        object.geometry = object.geometry.clone();
        const hasMultipleMaterials = Array.isArray(object.material);
        const materials: THREE.Material[] = hasMultipleMaterials
          ? object.material as THREE.Material[]
          : [object.material as THREE.Material];
        const styledMaterials = materials.map((material) => {
          const next = material.clone() as THREE.MeshStandardMaterial;
          // Preserve authored textured models, while neutralising untextured
          // anatomy assets so the yellow fat layer remains visually distinct.
          // Use a deeper neutral body tone so the silhouette remains readable
          // against the light preview canvas and the yellow fat overlay.
          if (!next.map) next.color.set("#625d56");
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
export function ModelAdapter({ profile, showFatLayer, onLoadingChange }: { profile: BodyProfile; showFatLayer: boolean; onLoadingChange?: (loading: boolean) => void }) {
  const { asset, loading } = useGlbAsset(profile.modelType);
  useEffect(() => onLoadingChange?.(loading), [loading, onLoadingChange]);
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
