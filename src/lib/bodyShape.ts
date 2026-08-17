import { DEFAULT_PROFILE, getWeightMorphs } from "./bodyMath";
import type { BodyProfile } from "../types/body";

/**
 * Stable names for the modular renderer. A future GLB adapter can map these
 * semantic names to scene nodes, bones, or morph target groups as needed.
 */
export type BodyPartName =
  | "pelvis"
  | "torso"
  | "waist"
  | "neck"
  | "head"
  | "left-foot"
  | "right-foot"
  | "left-calf"
  | "right-calf"
  | "left-thigh"
  | "right-thigh"
  | "left-upper-arm"
  | "right-upper-arm"
  | "left-forearm"
  | "right-forearm"
  | "fat-chest"
  | "fat-waist"
  | "fat-hip"
  | "fat-left-upper-arm"
  | "fat-right-upper-arm"
  | "fat-left-forearm"
  | "fat-right-forearm"
  | "fat-left-thigh"
  | "fat-right-thigh"
  | "fat-left-calf"
  | "fat-right-calf";

export interface BodyDimensions {
  armLength: number;
  armRadius: number;
  bodyFat: number;
  calfLength: number;
  chestDepth: number;
  chestWidth: number;
  isFemale: boolean;
  legRadius: number;
  legTop: number;
  pelvisWidth: number;
  shoulderWidth: number;
  thighLength: number;
  torsoLength: number;
  waistDepth: number;
  waistWidth: number;
}

/**
 * The only conversion from profile input to visual proportions for the current
 * modular mannequin. UI components and state management do not know these
 * geometry values, so this function can be replaced by a GLB adapter later.
 */
export function calculateBodyDimensions({ modelType, heightCm, weightKg, measurements }: BodyProfile): BodyDimensions {
  const base = DEFAULT_PROFILE[modelType];
  const heightRatio = heightCm / base.heightCm;
  const morphs = getWeightMorphs(heightCm, weightKg);
  const isFemale = modelType === "female";
  const fat = morphs.bodyFat;
  const calfLength = 0.38 * (1 + (heightRatio - 1) * 0.25);
  const thighLength = 0.43 * (1 + (heightRatio - 1) * 0.4);
  const bustAdjustment = measurements.bustAdjustCm * 0.005;
  const waistAdjustment = measurements.waistAdjustCm * 0.005;
  const hipAdjustment = measurements.hipAdjustCm * 0.005;
  const armAdjustment = measurements.armAdjustCm * 0.005;
  const legAdjustment = measurements.legAdjustCm * 0.005;

  return {
    armLength: 0.38 * (1 + (heightRatio - 1) * 0.1),
    armRadius: 0.065 + morphs.arm * 0.034 + armAdjustment * 0.43,
    bodyFat: morphs.bodyFat,
    calfLength,
    chestDepth: 0.15 + morphs.chest * 0.06 + bustAdjustment * 0.72,
    chestWidth: (isFemale ? 0.4 : 0.48) + morphs.chest * 0.12 + bustAdjustment,
    isFemale,
    legRadius: 0.1 + morphs.thigh * 0.055 + legAdjustment * 0.5,
    legTop: 0.08 + calfLength + thighLength,
    pelvisWidth: (isFemale ? 0.42 : 0.36) + morphs.hip * 0.15 + hipAdjustment,
    shoulderWidth: (isFemale ? 0.5 : 0.62) + fat * 0.08,
    thighLength,
    torsoLength: 0.49 * (1 + (heightRatio - 1) * 0.25),
    waistDepth: 0.13 + morphs.belly * 0.1 + waistAdjustment * 0.72,
    waistWidth: (isFemale ? 0.29 : 0.33) + morphs.waist * 0.14 + waistAdjustment,
  };
}
