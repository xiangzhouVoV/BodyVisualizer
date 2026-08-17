import { useEffect, useMemo, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";

import { applyProfileToGlb, captureBaseBoneScales, MODEL_ASSET_PATHS } from "../lib/glbAdapter";
import type { BodyProfile, ModelType } from "../types/body";
import { BodyModel } from "./BodyModel";

function useGlbAsset(modelType: ModelType) {
  const [scene, setScene] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const path = MODEL_ASSET_PATHS[modelType];
    setScene(null);

    fetch(path, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        if (!response.ok || controller.signal.aborted) return;
        new GLTFLoader().load(
          path,
          (gltf) => {
            if (!controller.signal.aborted) setScene(gltf.scene);
          },
          undefined,
          () => {
            if (!controller.signal.aborted) setScene(null);
          },
        );
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [modelType]);

  return scene;
}

function RiggedGlbModel({ source, profile, showFatLayer }: { source: THREE.Object3D; profile: BodyProfile; showFatLayer: boolean }) {
  const instance = useMemo(() => cloneSkeleton(source), [source]);
  const baseScales = useMemo(() => captureBaseBoneScales(instance), [instance]);

  useEffect(() => {
    applyProfileToGlb(instance, profile, baseScales, showFatLayer);
  }, [baseScales, instance, profile, showFatLayer]);

  return <primitive object={instance} />;
}

/**
 * Asset boundary between product features and renderer implementation.
 * Drop correctly named GLBs into public/models to activate the rigged path;
 * otherwise the existing procedural mannequin stays visible.
 */
export function ModelAdapter({ profile, showFatLayer }: { profile: BodyProfile; showFatLayer: boolean }) {
  const scene = useGlbAsset(profile.modelType);
  return scene ? <RiggedGlbModel source={scene} profile={profile} showFatLayer={showFatLayer} /> : <BodyModel profile={profile} showFatLayer={showFatLayer} />;
}
