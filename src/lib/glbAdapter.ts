import * as THREE from "three";

import { calculateBMI, clamp, DEFAULT_PROFILE, getWeightMorphs } from "./bodyMath";
import {
  getCalculatorCircumferenceResponse,
  getCircumferenceVertexShader,
  getSimulatorCircumferenceResponse,
} from "./circumferenceDeformation";
import type { BodyProfile, ModelType } from "../types/body";

export const MODEL_ASSET_PATHS: Record<ModelType, string> = {
  female: "/models/female-adult-v4.glb",
  male: "/models/male-adult-v1.glb",
};

type BoneScaleMap = Map<string, THREE.Vector3>;
type MeshScaleMap = Map<string, THREE.Vector3>;
type MeshGeometryMap = Map<string, { positions: Float32Array; bounds: THREE.Box3 }>;
type RegionalShapeUniforms = Record<string, { value: number }>;
export interface ModelTransform {
  position: THREE.Vector3;
  scale: THREE.Vector3;
}

export function captureBaseBoneScales(scene: THREE.Object3D): BoneScaleMap {
  const scales: BoneScaleMap = new Map();
  scene.traverse((object) => {
    if (object instanceof THREE.Bone) scales.set(object.uuid, object.scale.clone());
  });
  return scales;
}

export function captureBaseMeshScales(scene: THREE.Object3D): MeshScaleMap {
  const scales: MeshScaleMap = new Map();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) scales.set(object.uuid, object.scale.clone());
  });
  return scales;
}

export function captureBaseMeshGeometry(scene: THREE.Object3D): MeshGeometryMap {
  const geometry = new Map<string, { positions: Float32Array; bounds: THREE.Box3 }>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!position) return;
    object.geometry.computeBoundingBox();
    if (!object.geometry.boundingBox) return;
    geometry.set(object.uuid, {
      positions: new Float32Array(position.array),
      bounds: object.geometry.boundingBox.clone(),
    });
  });
  return geometry;
}

export function captureBaseModelTransform(scene: THREE.Object3D): ModelTransform {
  return {
    position: scene.position.clone(),
    scale: scene.scale.clone(),
  };
}

function setBoneHeightScale(
  bones: Record<string, THREE.Bone>,
  baseScales: BoneScaleMap,
  names: string[],
  heightScale: number,
) {
  const bone = names.map((name) => bones[name]).find(Boolean);
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

function isBodySurface(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const labels = [mesh.name, ...materials.map((material) => material.name)].join(" ");
  return !/eye|teeth|tongue|hair|lash|nail|mouth|pupil/i.test(labels);
}

function bell(value: number, center: number, width: number) {
  return Math.exp(-((value - center) ** 2) / (2 * width ** 2));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = clamp((value - edge0) / (edge1 - edge0));
  return progress * progress * (3 - 2 * progress);
}

/**
 * The static GLBs currently used by the product do not have authored body
 * Shape Keys. These weights are therefore deliberately illustrative: they
 * steer the fallback toward recognisable, gender-appropriate silhouettes
 * without presenting the result as a medical body-composition simulation.
 */
function getRegionalFatBias(modelType: ModelType) {
  return modelType === "female"
    ? { chest: 0.38, waist: 1.55, hip: 1.65, thigh: 1.5, calf: 0.18, arm: 0.28 }
    : { chest: 0.6, waist: 2.35, hip: 0.42, thigh: 0.95, calf: 0.25, arm: 0.36 };
}

function getRegionalShapeUniforms(
  bounds: THREE.Box3,
  profile: BodyProfile,
  bmiDelta: number,
  bodyFatDelta: number,
): RegionalShapeUniforms {
  const bias = getRegionalFatBias(profile.modelType);
  return {
    minY: { value: bounds.min.y },
    height: { value: Math.max(bounds.max.y - bounds.min.y, 0.001) },
    centerX: { value: (bounds.min.x + bounds.max.x) / 2 },
    centerZ: { value: (bounds.min.z + bounds.max.z) / 2 },
    halfWidth: { value: Math.max((bounds.max.x - bounds.min.x) / 2, 0.001) },
    halfDepth: { value: Math.max((bounds.max.z - bounds.min.z) / 2, 0.001) },
    bmiDelta: { value: bmiDelta },
    bodyFatDelta: { value: bodyFatDelta },
    shoulderAdjustCm: { value: profile.measurements.shoulderAdjustCm },
    bustAdjustCm: { value: profile.measurements.bustAdjustCm },
    waistAdjustCm: { value: profile.measurements.waistAdjustCm },
    hipAdjustCm: { value: profile.measurements.hipAdjustCm },
    armAdjustCm: { value: profile.measurements.armAdjustCm },
    legAdjustCm: { value: profile.measurements.legAdjustCm },
    chestBias: { value: bias.chest },
    waistBias: { value: bias.waist },
    hipBias: { value: bias.hip },
    thighBias: { value: bias.thigh },
    calfBias: { value: bias.calf },
    armBias: { value: bias.arm },
  };
}

function applyRegionalShaderShape(
  mesh: THREE.Mesh,
  bounds: THREE.Box3,
  profile: BodyProfile,
  bmiDelta: number,
  bodyFatDelta: number,
) {
  const deformationMode = profile.shapeRenderMode === "calculator" ? "calculator" : "simulator";
  const circumferenceVertexShader = getCircumferenceVertexShader(deformationMode);
  // The female sculpt already has a broad hip/chest silhouette. Keep the
  // weight-driven shell subtle so high weights do not make the whole figure
  // balloon beyond the intended body proportions.
  const weightShapeGain = profile.modelType === "female" ? "0.80" : "1.00";
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    const existing = material.userData.regionalShapeUniforms as RegionalShapeUniforms | undefined;
    const uniforms = existing ?? getRegionalShapeUniforms(bounds, profile, bmiDelta, bodyFatDelta);
    if (!existing) {
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
uniform float minY;
uniform float height;
uniform float centerX;
uniform float centerZ;
uniform float halfWidth;
uniform float halfDepth;
uniform float bmiDelta;
uniform float bodyFatDelta;
uniform float shoulderAdjustCm;
uniform float bustAdjustCm;
uniform float waistAdjustCm;
uniform float hipAdjustCm;
uniform float armAdjustCm;
uniform float legAdjustCm;
uniform float chestBias;
uniform float waistBias;
uniform float hipBias;
uniform float thighBias;
uniform float calfBias;
uniform float armBias;
float regionalBell(float value, float center, float width) {
  float distanceToCenter = value - center;
  return exp(-(distanceToCenter * distanceToCenter) / (2.0 * width * width));
}`,
        );
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
float relativeY = clamp((position.y - minY) / height, 0.0, 1.0);
float horizontalDistance = abs(position.x - centerX) / halfWidth;
float armZone = clamp((horizontalDistance - 0.42) / 0.22, 0.0, 1.0);
// The upper arm joins the torso close to the waist band. Waist therefore uses
// its own narrow 2D torso envelope rather than the broad body/arm masks.
// This deliberately keeps the edit inside the abdomen core, clear of both
// upper-arm roots and the outer torso edge.
float waistTorsoMask = 1.0 - smoothstep(0.30, 0.40, horizontalDistance);
float arm = armZone * smoothstep(0.34, 0.58, relativeY);
// Shoulder/upper-body girth affects only the clavicle and deltoid cap. The
// lateral fade finishes before the upper-arm cylinder, so it cannot lengthen
// or thin the arm when this input changes.
float shoulderVertical = regionalBell(relativeY, 0.78, 0.048);
float shoulderLateral = smoothstep(0.18, 0.46, horizontalDistance) * (1.0 - smoothstep(0.56, 0.66, horizontalDistance));
float shoulder = shoulderVertical * shoulderLateral;
float chest = regionalBell(relativeY, 0.74, 0.09) * (1.0 - armZone * 0.90);
float depthOffset = (position.z - centerZ) / halfDepth;
float rearSurface = smoothstep(0.0, 0.25, -depthOffset);
${circumferenceVertexShader}
float thigh = regionalBell(relativeY, 0.28, 0.12) * (1.0 - armZone);
float calf = regionalBell(relativeY, 0.11, 0.09) * (1.0 - armZone);
float headMask = smoothstep(0.86, 0.96, relativeY);
float distribution = chest * chestBias + waist * waistBias + hip * hipBias + thigh * thighBias + calf * calfBias + arm * armBias;
float fatEligible = max(max(max(chest, waist), max(hip, thigh)), max(calf, arm)) * (1.0 - headMask * 0.97);
float bodyMask = clamp(fatEligible * (0.32 + distribution * 0.48), 0.0, 0.9);
float measurementX = chest * bustAdjustCm * 0.002 + waistLateral * waistAdjustCm * waistLateralGain + hipLateral * hipAdjustCm * hipLateralGain + arm * armAdjustCm * 0.0065 + (thigh + calf * 0.6) * legAdjustCm * 0.0065;
float measurementZ = chest * bustAdjustCm * 0.0012 + waistDepth * waistAdjustCm * waistDepthGain + hipDepth * hipAdjustCm * hipDepthGain + arm * armAdjustCm * 0.006 + (thigh + calf * 0.6) * legAdjustCm * 0.006;
float weightX = (bmiDelta * 0.002 * bodyMask + bodyFatDelta * fatEligible * (0.018 + distribution * 0.10)) * ${weightShapeGain};
float weightZ = (bmiDelta * 0.0018 * bodyMask + bodyFatDelta * fatEligible * (0.02 + distribution * 0.12)) * ${weightShapeGain};
float xDirection = position.x >= centerX ? 1.0 : -1.0;
float zDirection = position.z >= centerZ ? 1.0 : -1.0;
float xSurface = clamp(horizontalDistance, 0.0, 1.0);
float zSurface = clamp(abs(position.z - centerZ) / halfDepth, 0.0, 1.0);
float frontDepth = clamp((position.z - centerZ) / halfDepth, 0.0, 1.0);
float bustProjection = chest * bustAdjustCm * 0.010 * (0.12 + frontDepth * 0.88);
transformed.x += xDirection * ((weightX + measurementX) * xSurface + shoulderOffset);
transformed.z += zDirection * (weightZ + measurementZ) * zSurface + bustProjection;`,
        );
      };
      material.customProgramCacheKey = () => `regional-static-shape-${deformationMode}-v14`;
      material.userData.regionalShapeUniforms = uniforms;
      material.needsUpdate = true;
    }

    Object.entries(uniforms).forEach(([name, uniform]) => {
      if (name === "bmiDelta") uniform.value = bmiDelta;
      else if (name === "bodyFatDelta") uniform.value = bodyFatDelta;
      else if (name === "shoulderAdjustCm") uniform.value = profile.measurements.shoulderAdjustCm;
      else if (name === "bustAdjustCm") uniform.value = profile.measurements.bustAdjustCm;
      else if (name === "waistAdjustCm") uniform.value = profile.measurements.waistAdjustCm;
      else if (name === "hipAdjustCm") uniform.value = profile.measurements.hipAdjustCm;
      else if (name === "armAdjustCm") uniform.value = profile.measurements.armAdjustCm;
      else if (name === "legAdjustCm") uniform.value = profile.measurements.legAdjustCm;
    });
  });
}

function applyLocalStaticShape(
  mesh: THREE.Mesh,
  baseGeometry: MeshGeometryMap,
  profile: BodyProfile,
  bmiDelta: number,
  bodyFatDelta: number,
) {
  const base = baseGeometry.get(mesh.uuid);
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  // Keep the interactive path bounded. Very dense sculpt meshes use the
  // lightweight fallback scale so dragging a slider cannot freeze the canvas.
  if (!base || !position || position.count > 100_000 || !isBodySurface(mesh)) return false;

  const { min, max } = base.bounds;
  const height = max.y - min.y;
  const centerX = (min.x + max.x) / 2;
  const centerZ = (min.z + max.z) / 2;
  const halfWidth = Math.max((max.x - min.x) / 2, 0.001);
  const halfDepth = Math.max((max.z - min.z) / 2, 0.001);
  const source = base.positions;
  const target = position.array as Float32Array;
  const { shoulderAdjustCm, bustAdjustCm, waistAdjustCm, hipAdjustCm, armAdjustCm, legAdjustCm } = profile.measurements;
  const getCircumferenceResponse = profile.shapeRenderMode === "calculator"
    ? getCalculatorCircumferenceResponse
    : getSimulatorCircumferenceResponse;
  const regionalBias = getRegionalFatBias(profile.modelType);
  const weightShapeGain = profile.modelType === "female" ? 0.80 : 1.0;

  for (let index = 0; index < source.length; index += 3) {
    const x = source[index];
    const y = source[index + 1];
    const z = source[index + 2];
    const relativeY = (y - min.y) / height;
    const horizontalDistance = Math.abs(x - centerX) / halfWidth;
    // Separate the whole lateral limb zone from the part that may receive a
    // small arm-fat response. This keeps torso/leg masks off the hands, and
    // excludes wrists/fingers from both the body deformation and fat overlay.
    const armZone = Math.max(0, Math.min(1, (horizontalDistance - 0.42) / 0.22));
    const waistTorsoMask = 1 - smoothstep(0.30, 0.40, horizontalDistance);
    const armMask = armZone * smoothstep(0.48, 0.58, relativeY);
    const shoulderVertical = bell(relativeY, 0.78, 0.048);
    const shoulderLateral = smoothstep(0.18, 0.46, horizontalDistance) * (1 - smoothstep(0.56, 0.66, horizontalDistance));
    const shoulder = shoulderVertical * shoulderLateral;
    const chest = bell(relativeY, 0.74, 0.09) * (1 - armZone * 0.9);
    const depthOffset = (z - centerZ) / halfDepth;
    const rearSurface = smoothstep(0, 0.25, -depthOffset);
    const circumference = getCircumferenceResponse({
      relativeY,
      horizontalDistance,
      rearSurface,
      armZone,
      waistTorsoMask,
      shoulder,
    });
    const thigh = bell(relativeY, 0.28, 0.12) * (1 - armZone);
    const calf = bell(relativeY, 0.11, 0.09) * (1 - armZone);
    // Keep the skull and neck structurally stable. The remaining areas blend
    // into each other through bell curves, so the fallback avoids hard rings
    // at the waist, hip, or knee when sliders change.
    const headMask = smoothstep(0.86, 0.96, relativeY);
    const fatDistribution =
      chest * regionalBias.chest +
      circumference.waist * regionalBias.waist +
      circumference.hip * regionalBias.hip +
      thigh * regionalBias.thigh +
      calf * regionalBias.calf +
      armMask * regionalBias.arm;
    const fatEligible = Math.max(chest, circumference.waist, circumference.hip, thigh, calf, armMask) * (1 - headMask * 0.97);
    const bodyMask = clamp(fatEligible * (0.32 + fatDistribution * 0.48), 0, 0.9);
    const measurementX =
      chest * bustAdjustCm * 0.002 +
      circumference.waistLateral * waistAdjustCm * circumference.waistLateralGain +
      circumference.hipLateral * hipAdjustCm * circumference.hipLateralGain +
      armMask * armAdjustCm * 0.0065 +
      (thigh + calf * 0.6) * legAdjustCm * 0.0065;
    const measurementZ =
      chest * bustAdjustCm * 0.0012 +
      circumference.waistDepth * waistAdjustCm * circumference.waistDepthGain +
      circumference.hipDepth * hipAdjustCm * circumference.hipDepthGain +
      armMask * armAdjustCm * 0.006 +
      (thigh + calf * 0.6) * legAdjustCm * 0.006;
    // The BMI term provides a gentle overall proportion change. The body-fat
    // term is intentionally stronger and regional, so a jump from a normal
    // weight to obesity produces a visibly rounder silhouette rather than a
    // thin yellow shell sitting over an unchanged body.
    const weightX = (bmiDelta * 0.002 * bodyMask + bodyFatDelta * fatEligible * (0.018 + fatDistribution * 0.10)) * weightShapeGain;
    const weightZ = (bmiDelta * 0.0018 * bodyMask + bodyFatDelta * fatEligible * (0.02 + fatDistribution * 0.12)) * weightShapeGain;
    const xDirection = x >= centerX ? 1 : -1;
    const zDirection = z >= centerZ ? 1 : -1;
    const xSurface = Math.max(0, Math.min(1, horizontalDistance));
    const zSurface = Math.max(0, Math.min(1, Math.abs(z - centerZ) / halfDepth));

    const frontDepth = Math.max(0, Math.min(1, (z - centerZ) / halfDepth));
    // Positive bust adjustment adds volume to the front chest surface instead
    // of equally enlarging the back. Negative values pull that surface back.
    const bustProjection = chest * bustAdjustCm * 0.010 * (0.12 + frontDepth * 0.88);
    const shoulderOffset = shoulderAdjustCm * circumference.shoulderOffsetGain;

    target[index] = x + xDirection * ((weightX + measurementX) * xSurface + shoulderOffset);
    target[index + 1] = y; // Weight and circumferences never alter height.
    target[index + 2] = z + zDirection * (weightZ + measurementZ) * zSurface + bustProjection;
  }

  position.needsUpdate = true;
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeVertexNormals();
  return true;
}

/**
 * Maps the existing front-end profile contract to a rigged GLB. Missing bones
 * or shape keys are intentionally ignored, which keeps partially prepared
 * assets usable while their Blender work is still in progress.
 */
export function applyProfileToGlb(
  scene: THREE.Object3D,
  profile: BodyProfile,
  baseBoneScales: BoneScaleMap,
  baseMeshScales: MeshScaleMap,
  baseMeshGeometry: MeshGeometryMap,
  baseModelTransform: ModelTransform,
  showFatLayer: boolean,
) {
  const bones: Record<string, THREE.Bone> = {};
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const renderMeshes: THREE.Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Bone) bones[object.name] = object;
    if (object instanceof THREE.SkinnedMesh) skinnedMeshes.push(object);
    if (object instanceof THREE.Mesh) renderMeshes.push(object);
    if (/fat|adipose/i.test(object.name)) object.visible = showFatLayer;
  });

  const heightRatio = profile.heightCm / DEFAULT_PROFILE[profile.modelType].heightCm;
  const heightRigNames = ["Spine", "Spine1", "LeftThigh", "LeftUpLeg", "RightThigh", "RightUpLeg", "LeftLeg", "RightLeg"];
  const hasHeightRig = heightRigNames.some((name) => bones[name]);

  scene.scale.copy(baseModelTransform.scale);
  scene.position.copy(baseModelTransform.position);

  if (hasHeightRig) {
    setBoneHeightScale(bones, baseBoneScales, ["Spine"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["Spine1"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["LeftThigh", "LeftUpLeg"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["RightThigh", "RightUpLeg"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["LeftCalf", "LeftLeg"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["RightCalf", "RightLeg"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["LeftUpperArm", "LeftArm"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["RightUpperArm", "RightArm"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["LeftForeArm"], heightRatio);
    setBoneHeightScale(bones, baseBoneScales, ["RightForeArm"], heightRatio);
  } else {
    // Static anatomy meshes have no skeleton. Scale around their original
    // ground contact point, not their centre, so height changes keep feet grounded.
    scene.scale.y = baseModelTransform.scale.y * heightRatio;
    scene.position.y = baseModelTransform.position.y * heightRatio;
  }

  // Keep the source body at its baseline weight. Weight-driven volume belongs
  // to FatTrendOverlay; applying it here would make the muscle/body mesh grow
  // even when the user turns the fat layer off.
  const weightMorphs = getWeightMorphs(
    DEFAULT_PROFILE[profile.modelType].heightCm,
    DEFAULT_PROFILE[profile.modelType].weightKg,
  );
  const { shoulderAdjustCm, bustAdjustCm, waistAdjustCm, hipAdjustCm, armAdjustCm, legAdjustCm } = profile.measurements;
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

  const hasBodyMorphs = skinnedMeshes.some((mesh) =>
    Object.keys(morphs).some((name) => mesh.morphTargetDictionary?.[name] !== undefined),
  );

  // A MakeHuman base export has a rig but no body-shape morphs. Keep the
  // height behaviour above and provide a visible, reversible BMI fallback
  // until Blender-authored Shape Keys replace it.
  // The body mesh deliberately receives no BMI/weight delta. The fat overlay
  // computes that delta independently and renders it as the outer layer.
  const bmiDelta = 0;
  const bodyFatDelta = 0;
  // Do not scale the entire female mesh for weight: that would enlarge
  // fingers, toes, and facial details along with the torso. The regional
  // deformation path below supplies the weight volume only where fat is
  // eligible (waist, hips, thighs, and a small arm contribution).
  const femaleWeightVolume = 1;
  // Static source meshes have no regional Shape Keys. Apply each circumference
  // control directly (rather than diluting one slider across five controls),
  // so a single +15 cm adjustment remains clearly visible in this MVP fallback.
  const circumferenceWidthDelta =
    shoulderAdjustCm * 0.0025 +
    bustAdjustCm * 0.0045 +
    waistAdjustCm * 0.006 +
    hipAdjustCm * 0.006 +
    armAdjustCm * 0.004 +
    legAdjustCm * 0.004;
  const circumferenceDepthDelta =
    bustAdjustCm * 0.003 +
    waistAdjustCm * 0.007 +
    hipAdjustCm * 0.006 +
    armAdjustCm * 0.003 +
    legAdjustCm * 0.003;
  const widthScale = clamp(1 + bmiDelta * 0.014 + circumferenceWidthDelta, 0.82, 1.42);
  const depthScale = clamp(1 + bmiDelta * 0.012 + circumferenceDepthDelta, 0.84, 1.34);

  renderMeshes.forEach((mesh) => {
    const baseScale = baseMeshScales.get(mesh.uuid);
    if (!baseScale) return;
    mesh.scale.copy(baseScale);
    if (!isBodySurface(mesh)) return;
    let globalWidth = 1;
    let globalDepth = 1;
    // The active female asset is now a closed Remesh surface, so it can use
    // the same continuous GPU regional deformation path as the male model.
    if (!hasBodyMorphs) {
      const hasLocalShape = applyLocalStaticShape(mesh, baseMeshGeometry, profile, bmiDelta, bodyFatDelta);
      const base = baseMeshGeometry.get(mesh.uuid);
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
      const hasShaderShape = !hasLocalShape && !!base && !!position && position.count > 100_000;
      if (hasShaderShape && base) {
        applyRegionalShaderShape(mesh, base.bounds, profile, bmiDelta, bodyFatDelta);
      }
      // Regional CPU and GPU paths already provide the circumference response;
      // only assets without either path use the coarse whole-body fallback.
      globalWidth = hasLocalShape || hasShaderShape ? 1 : widthScale;
      globalDepth = hasLocalShape || hasShaderShape ? 1 : depthScale;
    }
    if (profile.modelType === "female" && hasBodyMorphs) {
      // Keep authored female Shape Keys authoritative when a future asset
      // provides them; the current remeshed asset uses the shader path above.
      globalWidth = clamp(1 + circumferenceWidthDelta, 0.92, 1.18);
      globalDepth = clamp(1 + circumferenceDepthDelta, 0.92, 1.16);
    }
    // Female weight volume is independent from the asset's Shape Key status.
    mesh.scale.x = baseScale.x * globalWidth * femaleWeightVolume;
    mesh.scale.z = baseScale.z * globalDepth * femaleWeightVolume;
  });
}
