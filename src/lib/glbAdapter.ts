import * as THREE from "three";

import { clamp, DEFAULT_PROFILE, getWeightMorphs } from "./bodyMath";
import type { BodyProfile, ModelType } from "../types/body";

export const MODEL_ASSET_PATHS: Record<ModelType, string> = {
  female: "/models/female-adult-v1.glb",
  male: "/models/male-adult-v1.glb",
};

type BoneScaleMap = Map<string, THREE.Vector3>;

export function captureBaseBoneScales(scene: THREE.Object3D): BoneScaleMap {
  const scales: BoneScaleMap = new Map();
  scene.traverse((object) => {
    if (object instanceof THREE.Bone) scales.set(object.uuid, object.scale.clone());
  });
  return scales;
}

function setBoneHeightScale(bones: Record<string, THREE.Bone>, baseScales: BoneScaleMap, name: string, heightScale: number) {
  const bone = bones[name];
  const baseScale = bone && baseScales.get(bone.uuid);
  if (!bone || !baseScale) return;
  bone.scale.copy(baseScale);
  bone.scale.y = baseScale.y * heightScale;
}

function setMorph(mesh: THREE.SkinnedMesh, name: string, value: number) {
  const index = mesh.morphTargetDictionary?.[name];
  if (index === undefined || !mesh.morphTargetInfluences) return;
  mesh.morphTargetInfluences[index] = value;
}

/**
 * Maps the existing front-end profile contract to a rigged GLB. Missing bones
 * or shape keys are intentionally ignored, which keeps partially prepared
 * assets usable while their Blender work is still in progress.
 */
export function applyProfileToGlb(scene: THREE.Object3D, profile: BodyProfile, baseScales: BoneScaleMap, showFatLayer: boolean) {
  const bones: Record<string, THREE.Bone> = {};
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Bone) bones[object.name] = object;
    if (object instanceof THREE.SkinnedMesh) skinnedMeshes.push(object);
    if (/fat|adipose/i.test(object.name)) object.visible = showFatLayer;
  });

  const heightRatio = profile.heightCm / DEFAULT_PROFILE[profile.modelType].heightCm;
  const heightDelta = heightRatio - 1;
  setBoneHeightScale(bones, baseScales, "Spine", 1 + heightDelta * 0.25);
  setBoneHeightScale(bones, baseScales, "Spine1", 1 + heightDelta * 0.25);
  setBoneHeightScale(bones, baseScales, "LeftThigh", 1 + heightDelta * 0.4);
  setBoneHeightScale(bones, baseScales, "RightThigh", 1 + heightDelta * 0.4);
  setBoneHeightScale(bones, baseScales, "LeftCalf", 1 + heightDelta * 0.25);
  setBoneHeightScale(bones, baseScales, "RightCalf", 1 + heightDelta * 0.25);
  setBoneHeightScale(bones, baseScales, "LeftUpperArm", 1 + heightDelta * 0.05);
  setBoneHeightScale(bones, baseScales, "RightUpperArm", 1 + heightDelta * 0.05);
  setBoneHeightScale(bones, baseScales, "LeftForeArm", 1 + heightDelta * 0.05);
  setBoneHeightScale(bones, baseScales, "RightForeArm", 1 + heightDelta * 0.05);

  const weightMorphs = getWeightMorphs(profile.heightCm, profile.weightKg);
  const { bustAdjustCm, waistAdjustCm, hipAdjustCm, armAdjustCm, legAdjustCm } = profile.measurements;
  const heightFix = Math.min(1, Math.abs(profile.heightCm - DEFAULT_PROFILE[profile.modelType].heightCm) / 25);
  const morphs: Record<string, number> = {
    body_fat: weightMorphs.bodyFat,
    belly_large: weightMorphs.belly,
    chest_large: clamp(weightMorphs.chest + bustAdjustCm / 30),
    waist_large: clamp(weightMorphs.waist + waistAdjustCm / 30),
    hip_large: clamp(weightMorphs.hip + hipAdjustCm / 30),
    thigh_large: clamp(weightMorphs.thigh + legAdjustCm / 30),
    calf_large: clamp(weightMorphs.calf + legAdjustCm / 36),
    arm_large: clamp(weightMorphs.arm + armAdjustCm / 30),
    height_torso_fix: heightFix,
    height_leg_fix: heightFix,
    height_arm_fix: heightFix,
  };

  skinnedMeshes.forEach((mesh) => Object.entries(morphs).forEach(([name, value]) => setMorph(mesh, name, value)));
}
