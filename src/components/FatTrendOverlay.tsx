import { useEffect, useMemo } from "react";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";

import { calculateBMI, DEFAULT_PROFILE, getWeightMorphs } from "../lib/bodyMath";
import type { BodyProfile } from "../types/body";

type Region = {
  name: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  growth: [number, number, number];
};

const REGIONS: Region[] = [
  { name: "chest", position: [0, 1.17, 0], scale: [0.21, 0.15, 0.13], growth: [0.05, 0.04, 0.04] },
  { name: "waist", position: [0, 0.95, 0], scale: [0.18, 0.14, 0.12], growth: [0.07, 0.05, 0.05] },
  { name: "hip", position: [0, 0.72, 0], scale: [0.22, 0.12, 0.14], growth: [0.07, 0.04, 0.05] },
  { name: "left-upper-arm", position: [-0.29, 1.08, 0], scale: [0.05, 0.18, 0.055], rotation: [0, 0, -0.18], growth: [0.025, 0.05, 0.025] },
  { name: "right-upper-arm", position: [0.29, 1.08, 0], scale: [0.05, 0.18, 0.055], rotation: [0, 0, 0.18], growth: [0.025, 0.05, 0.025] },
  { name: "left-thigh", position: [-0.11, 0.48, 0], scale: [0.095, 0.23, 0.10], growth: [0.04, 0.05, 0.04] },
  { name: "right-thigh", position: [0.11, 0.48, 0], scale: [0.095, 0.23, 0.10], growth: [0.04, 0.05, 0.04] },
  { name: "left-calf", position: [-0.09, 0.18, 0], scale: [0.07, 0.18, 0.07], growth: [0.025, 0.035, 0.025] },
  { name: "right-calf", position: [0.09, 0.18, 0], scale: [0.07, 0.18, 0.07], growth: [0.025, 0.035, 0.025] },
];

function isDetailMesh(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return /eye|teeth|tongue|hair|lash|nail|mouth|pupil/i.test(
    [mesh.name, ...materials.map((material) => material.name)].join(" "),
  );
}

function createRegionalFatMaterial(bounds: THREE.Box3, opacity: number, profile: BodyProfile, useShapeShader: boolean) {
  const height = Math.max(bounds.max.y - bounds.min.y, 0.001);
  const halfWidth = Math.max((bounds.max.x - bounds.min.x) / 2, 0.001);
  const halfDepth = Math.max((bounds.max.z - bounds.min.z) / 2, 0.001);
  const baseBmi = calculateBMI(DEFAULT_PROFILE[profile.modelType].heightCm, DEFAULT_PROFILE[profile.modelType].weightKg);
  const bmiDelta = calculateBMI(profile.heightCm, profile.weightKg) - baseBmi;
  const baseFat = getWeightMorphs(
    DEFAULT_PROFILE[profile.modelType].heightCm,
    DEFAULT_PROFILE[profile.modelType].weightKg,
  ).bodyFat;
  const bodyFatDelta = getWeightMorphs(profile.heightCm, profile.weightKg).bodyFat - baseFat;
  // The male source model has a broader base mesh than the female remesh.
  // Use a smaller outer-volume gain so its fat layer stays attached rather
  // than reading as a detached shell.
  const weightShapeGain = profile.modelType === "female" ? "0.80" : "0.72";
  const abdomenProjectionGain = profile.modelType === "female" ? "0.012" : "0.035";
  const hipBandWidth = profile.modelType === "female" ? "0.11" : "0.16";
  const regionalBias = profile.modelType === "female"
    ? { chest: 0.38, waist: 1.55, hip: 1.65, thigh: 1.5, calf: 0.18, arm: 0.28 }
    : { chest: 0.6, waist: 2.35, hip: 0.42, thigh: 0.95, calf: 0.25, arm: 0.36 };
  // Keep the mask envelope shared by both models. Gender-specific fat
  // distribution still comes from regionalBias; the mask itself should not
  // erase the female surface at high weight.
  const fatMaskGrowth = 0.82;
  const fatMaskBase = "0.02";
  const fatMaskGain = "0.62";
  const uniforms = {
    fatLevel: { value: 0 },
    minY: { value: bounds.min.y },
    height: { value: height },
    centerX: { value: (bounds.min.x + bounds.max.x) / 2 },
    centerZ: { value: (bounds.min.z + bounds.max.z) / 2 },
    halfWidth: { value: halfWidth },
    halfDepth: { value: halfDepth },
    bmiDelta: { value: bmiDelta },
    bodyFatDelta: { value: bodyFatDelta },
    bustAdjustCm: { value: profile.measurements.bustAdjustCm },
    waistAdjustCm: { value: profile.measurements.waistAdjustCm },
    hipAdjustCm: { value: profile.measurements.hipAdjustCm },
    armAdjustCm: { value: profile.measurements.armAdjustCm },
    legAdjustCm: { value: profile.measurements.legAdjustCm },
    chestBias: { value: regionalBias.chest },
    waistBias: { value: regionalBias.waist },
    hipBias: { value: regionalBias.hip },
    thighBias: { value: regionalBias.thigh },
    calfBias: { value: regionalBias.calf },
    armBias: { value: regionalBias.arm },
    faceBias: { value: profile.modelType === "female" ? 0.34 : 0.24 },
    // Only the fat above the asset's baseline is pushed outward. This gives
    // the added layer a visible edge without separating a normal-weight body.
    fatShellDepth: { value: Math.max(0, bodyFatDelta) * (profile.modelType === "female" ? 0.045 : 0.022) },
  };
  // Keep one stable material type for both assets. This avoids shader-cache
  // mismatches while the shared regional fat shader is compiled.
  const material = new THREE.MeshStandardMaterial({
    color: "#f4ce63",
    transparent: true,
    opacity,
    roughness: 0.94,
    metalness: 0,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
varying float vFatMask;
uniform float fatLevel;
uniform float minY;
uniform float height;
uniform float centerX;
uniform float centerZ;
uniform float halfWidth;
uniform float chestBias;
uniform float waistBias;
uniform float hipBias;
uniform float thighBias;
uniform float calfBias;
uniform float armBias;
uniform float faceBias;
uniform float fatShellDepth;
${useShapeShader ? `uniform float halfDepth;
uniform float bmiDelta;
uniform float bodyFatDelta;
uniform float bustAdjustCm;
uniform float waistAdjustCm;
uniform float hipAdjustCm;
uniform float armAdjustCm;
uniform float legAdjustCm;` : ""}
float fatBell(float value, float center, float width) {
  float distanceToCenter = value - center;
  return exp(-(distanceToCenter * distanceToCenter) / (2.0 * width * width));
}`,
    );
    const shapeVertexShader = useShapeShader
      ? `
float shapeVertical = clamp((position.y - minY) / height, 0.0, 1.0);
float shapeLateral = abs(position.x - centerX) / halfWidth;
float shapeArmZone = clamp((shapeLateral - 0.42) / 0.22, 0.0, 1.0);
// Blend the arm layer out through the forearm and wrist. It keeps the shell
// attached to the arm while preventing a hard, floating cuff around the hand.
float shapeArm = shapeArmZone * smoothstep(0.34, 0.58, shapeVertical);
float shapeChest = fatBell(shapeVertical, 0.74, 0.09) * (1.0 - shapeArmZone * 0.90);
float shapeWaist = fatBell(shapeVertical, 0.56, 0.10) * (1.0 - shapeArmZone);
float shapeHip = fatBell(shapeVertical, 0.43, ${hipBandWidth}) * (1.0 - shapeArmZone);
float shapeThigh = fatBell(shapeVertical, 0.28, 0.12) * (1.0 - shapeArmZone);
float shapeCalf = fatBell(shapeVertical, 0.11, 0.09) * (1.0 - shapeArmZone);
float shapeFace = fatBell(shapeVertical, 0.84, 0.08) * (1.0 - smoothstep(0.18, 0.56, shapeLateral));
float shapeHead = smoothstep(0.94, 0.99, shapeVertical);
float shapeDistribution = shapeChest * chestBias + shapeWaist * waistBias + shapeHip * hipBias + shapeThigh * thighBias + shapeCalf * calfBias + shapeArm * armBias + shapeFace * faceBias;
float shapeFatEligible = max(max(max(shapeChest, shapeWaist), max(shapeHip, shapeThigh)), max(max(shapeCalf, shapeArm), shapeFace)) * (1.0 - shapeHead * 0.97);
float shapeBodyMask = clamp(shapeFatEligible * (0.32 + shapeDistribution * 0.48), 0.0, 0.9);
float shapeMeasurementX = shapeChest * bustAdjustCm * 0.002 + shapeWaist * waistAdjustCm * 0.010 + shapeHip * hipAdjustCm * 0.007 + shapeArm * armAdjustCm * 0.0065 + (shapeThigh + shapeCalf * 0.6) * legAdjustCm * 0.0065;
float shapeMeasurementZ = shapeChest * bustAdjustCm * 0.0012 + shapeWaist * waistAdjustCm * 0.002 + shapeHip * hipAdjustCm * 0.007 + shapeArm * armAdjustCm * 0.006 + (shapeThigh + shapeCalf * 0.6) * legAdjustCm * 0.006;
float shapeWeightX = (bmiDelta * 0.002 * shapeBodyMask + bodyFatDelta * shapeFatEligible * (0.018 + shapeDistribution * 0.10)) * ${weightShapeGain};
float shapeWeightZ = (bmiDelta * 0.0018 * shapeBodyMask + bodyFatDelta * shapeFatEligible * (0.02 + shapeDistribution * 0.12)) * ${weightShapeGain};
// Concentrate male weight gain in the abdomen with a forward projection,
// rather than enlarging the full torso uniformly.
shapeWeightZ += shapeWaist * bodyFatDelta * ${abdomenProjectionGain};
float shapeXDirection = position.x >= centerX ? 1.0 : -1.0;
float shapeZDirection = position.z >= centerZ ? 1.0 : -1.0;
float shapeXSurface = clamp(shapeLateral, 0.0, 1.0);
float shapeZSurface = clamp(abs(position.z - centerZ) / halfDepth, 0.0, 1.0);
float shapeFrontDepth = clamp((position.z - centerZ) / halfDepth, 0.0, 1.0);
float shapeBustProjection = shapeChest * bustAdjustCm * 0.010 * (0.12 + shapeFrontDepth * 0.88);
transformed.x += shapeXDirection * (shapeWeightX + shapeMeasurementX) * shapeXSurface;
transformed.z += shapeZDirection * (shapeWeightZ + shapeMeasurementZ) * shapeZSurface + shapeBustProjection;`
      : "";
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>${shapeVertexShader}
float vertical = clamp((position.y - minY) / height, 0.0, 1.0);
float lateral = abs(position.x - centerX) / halfWidth;
float armZone = smoothstep(0.42, 0.64, lateral);
// Match the body-shape arm envelope above, so the fat surface cannot end in
// a visibly detached ring at either wrist.
float arm = armZone * smoothstep(0.34, 0.58, vertical);
float chest = fatBell(vertical, 0.74, 0.10) * (1.0 - armZone * 0.90);
float waist = fatBell(vertical, 0.56, 0.11) * (1.0 - armZone);
float hip = fatBell(vertical, 0.43, ${profile.modelType === "female" ? "0.12" : "0.16"}) * (1.0 - armZone);
float thigh = fatBell(vertical, 0.27, 0.16) * (1.0 - armZone);
float calf = fatBell(vertical, 0.11, 0.09) * (1.0 - armZone);
float face = fatBell(vertical, 0.84, 0.08) * (1.0 - smoothstep(0.18, 0.56, lateral));
float distribution = chest * chestBias + waist * waistBias + hip * hipBias + thigh * thighBias + calf * calfBias + arm * armBias + face * faceBias;
float fatEligible = max(max(max(chest, waist), max(hip, thigh)), max(max(calf, arm), face)) * (1.0 - smoothstep(0.94, 0.99, vertical) * 0.97);
// Separate the excess-fat portion from the base body with a shallow normal
// offset. The shell still follows every body deformation and slider change.
transformed += normalize(objectNormal) * fatShellDepth * clamp(distribution, 0.0, 1.0);
  // At normal BMI this remains a translucent trend overlay. At high BMI it
  // becomes an almost opaque regional shell, so the original slim surface is
  // no longer visually dominant beneath the added fat volume.
  vFatMask = clamp(fatEligible * (${fatMaskBase} + distribution * (${fatMaskGain} + fatLevel * ${fatMaskGrowth})), 0.0, 1.0);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      "#include <common>\nvarying float vFatMask;",
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.a *= vFatMask;",
    );
  };
  material.customProgramCacheKey = () => useShapeShader ? "regional-fat-overlay-shape-v6" : "regional-fat-overlay-v5";
  material.userData.fatUniforms = uniforms;
  return material;
}

/**
 * A temporary, non-destructive fat visualization for GLBs without adipose
 * meshes or Shape Keys. It intentionally shows a trend rather than claiming
 * medically accurate fat distribution.
 */
export function FatTrendOverlay({
  profile,
  model,
  rootPosition = [0, 0, 0],
  rootScale = [1, 1, 1],
}: {
  profile: BodyProfile;
  model?: THREE.Object3D;
  rootPosition?: [number, number, number];
  rootScale?: [number, number, number];
}) {
  const fat = getWeightMorphs(profile.heightCm, profile.weightKg).bodyFat;
  // Keep the body surface readable at every weight. The overlay is a visual
  // fat trend, not a replacement shell: use the same coverage envelope for
  // both models so the female view does not turn into a flat yellow cutout.
  const normalVisibility = profile.modelType === "female" ? 0.18 : 0.20;
  const fatGrowth = profile.modelType === "female" ? 0.32 : 0.38;
  const obesityGrowth = profile.modelType === "female" ? 0.65 : 0.76;
  const maxCoverage = profile.modelType === "female" ? 0.72 : 0.78;
  const opacity = Math.min(maxCoverage, normalVisibility + fat * fatGrowth + Math.max(0, fat - 0.38) * obesityGrowth);

  // A duplicate of the actual body surface is used when a GLB is available.
  // Unlike free-floating ellipsoids, this keeps the fat layer on the same
  // silhouette and makes it possible to follow the source armature.
  const surface = useMemo(() => {
    if (!model) return null;
    const cloned = cloneSkeleton(model);
    cloned.name = "fat-surface-overlay";
    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (isDetailMesh(object)) {
        object.visible = false;
        return;
      }
      object.renderOrder = 4;
      object.geometry.computeBoundingBox();
      const position = object.geometry.getAttribute("position");
      object.material = createRegionalFatMaterial(
        object.geometry.boundingBox ?? new THREE.Box3(),
        opacity,
        profile,
        (position?.count ?? 0) > 100_000,
      );
    });
    return cloned;
  }, [model, profile.modelType]);

  useEffect(() => {
    if (!model || !surface) return;
    const sync = () => {
      const sourceObjects: THREE.Object3D[] = [];
      const overlayObjects: THREE.Object3D[] = [];
      model.traverse((object) => sourceObjects.push(object));
      surface.traverse((object) => overlayObjects.push(object));
      sourceObjects.forEach((source, index) => {
        const target = overlayObjects[index];
        if (!target) return;
        target.position.copy(source.position);
        target.quaternion.copy(source.quaternion);
        target.scale.copy(source.scale);
        target.visible = source.visible && !(target instanceof THREE.Mesh && isDetailMesh(target));
        // SkeletonUtils normally shares geometry, but explicit attribute sync
        // keeps the overlay attached even when an imported GLB clone owns its
        // own BufferGeometry instance.
        if (source instanceof THREE.Mesh && target instanceof THREE.Mesh) {
          const sourcePosition = source.geometry.getAttribute("position");
          const targetPosition = target.geometry.getAttribute("position");
          if (sourcePosition && targetPosition && sourcePosition.count === targetPosition.count) {
            // Always sync, including when the clone happens to share the same
            // BufferGeometry reference. This guarantees the overlay cannot keep
            // a pre-deformation snapshot after a profile update.
            if (targetPosition.array !== sourcePosition.array) {
              targetPosition.array.set(sourcePosition.array);
              targetPosition.needsUpdate = true;
            }
            target.geometry.computeBoundingBox();
          }
        }
        if (source instanceof THREE.Mesh && target instanceof THREE.Mesh && source.morphTargetInfluences && target.morphTargetInfluences) {
          target.morphTargetInfluences = [...source.morphTargetInfluences];
        }
      });
      surface.updateMatrixWorld(true);
      surface.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const material = object.material as THREE.MeshBasicMaterial;
        material.opacity = opacity;
        const uniforms = material.userData.fatUniforms as Record<string, { value: number }> | undefined;
        if (!uniforms) return;
        uniforms.fatLevel.value = fat;
        const currentBmi = calculateBMI(profile.heightCm, profile.weightKg);
        const baseBmi = calculateBMI(DEFAULT_PROFILE[profile.modelType].heightCm, DEFAULT_PROFILE[profile.modelType].weightKg);
        const baseFat = getWeightMorphs(
          DEFAULT_PROFILE[profile.modelType].heightCm,
          DEFAULT_PROFILE[profile.modelType].weightKg,
        ).bodyFat;
        uniforms.bmiDelta.value = currentBmi - baseBmi;
        uniforms.bodyFatDelta.value = fat - baseFat;
        uniforms.fatShellDepth.value = Math.max(0, fat - baseFat) * (profile.modelType === "female" ? 0.045 : 0.022);
        uniforms.bustAdjustCm.value = profile.measurements.bustAdjustCm;
        uniforms.waistAdjustCm.value = profile.measurements.waistAdjustCm;
        uniforms.hipAdjustCm.value = profile.measurements.hipAdjustCm;
        uniforms.armAdjustCm.value = profile.measurements.armAdjustCm;
        uniforms.legAdjustCm.value = profile.measurements.legAdjustCm;
      });
    };

    // The body deformation is applied by a sibling effect. Repeat after the
    // browser commits the frame so a newly deformed source cannot leave the
    // transparent shell one update behind.
    sync();
    const frame = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frame);
  }, [model, opacity, surface, profile]);

  if (surface) return <primitive object={surface} />;

  return (
    <group name="fat-trend-overlay" position={rootPosition} scale={rootScale} renderOrder={3}>
      {REGIONS.map((region) => (
        <mesh
          key={region.name}
          name={`fat-trend-${region.name}`}
          position={[
            (region.position[0] - rootPosition[0]) / rootScale[0],
            (region.position[1] - rootPosition[1]) / rootScale[1],
            (region.position[2] - rootPosition[2]) / rootScale[2],
          ]}
          rotation={region.rotation}
          scale={[
            (region.scale[0] + region.growth[0] * fat) / rootScale[0],
            (region.scale[1] + region.growth[1] * fat) / rootScale[1],
            (region.scale[2] + region.growth[2] * fat) / rootScale[2],
          ]}
          renderOrder={3}
        >
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial
            color="#f4ce63"
            transparent
            opacity={opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
