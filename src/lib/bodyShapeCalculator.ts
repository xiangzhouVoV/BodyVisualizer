import { clamp, DEFAULT_PROFILE } from "./bodyMath";
import type { BodyProfile, ModelType } from "../types/body";

export type CalculatedBodyShape = "hourglass" | "pear" | "inverted-triangle" | "apple" | "rectangle";

export interface BodyShapeMeasurements {
  heightCm: number;
  shoulderCm: number;
  bustCm: number;
  waistCm: number;
  hipCm: number;
}

export const BODY_SHAPE_COPY: Record<CalculatedBodyShape, { label: string; description: string }> = {
  hourglass: {
    label: "Hourglass",
    description: "Your shoulders and hips are balanced with a clearly defined waist.",
  },
  pear: {
    label: "Pear",
    description: "Your hips are wider than your shoulders, with a defined upper body.",
  },
  "inverted-triangle": {
    label: "Inverted Triangle",
    description: "Your shoulders are broader than your hips, creating a stronger upper silhouette.",
  },
  apple: {
    label: "Apple",
    description: "Your proportions carry more volume through the waist and midsection.",
  },
  rectangle: {
    label: "Rectangle",
    description: "Your shoulders, waist, and hips have a more even, straighter proportion.",
  },
};

export const DEFAULT_BODY_SHAPE_MEASUREMENTS: Record<ModelType, BodyShapeMeasurements> = {
  female: { heightCm: 165, shoulderCm: 96, bustCm: 90, waistCm: 70, hipCm: 95 },
  male: { heightCm: 175, shoulderCm: 112, bustCm: 102, waistCm: 85, hipCm: 100 },
};

export function calculateBodyShape({ shoulderCm, bustCm, waistCm, hipCm }: BodyShapeMeasurements): CalculatedBodyShape {
  const upperCm = Math.max(shoulderCm, bustCm);
  const shoulderHipDifference = (shoulderCm - hipCm) / Math.max(shoulderCm, hipCm, 1);
  const waistToHip = waistCm / Math.max(hipCm, 1);
  const waistToUpper = waistCm / Math.max(upperCm, 1);
  const upperHipDifference = Math.abs(upperCm - hipCm) / Math.max(upperCm, hipCm, 1);

  if (waistToHip >= 0.86 && waistToUpper >= 0.84) return "apple";
  if (shoulderHipDifference <= -0.05) return "pear";
  if (shoulderHipDifference >= 0.05) return "inverted-triangle";
  if (upperHipDifference <= 0.05 && waistToHip < 0.75) return "hourglass";
  return "rectangle";
}

/** Maps calculator measurements onto the existing visual-only GLB controls. */
export function createCalculatorBodyProfile(
  modelType: ModelType,
  measurements: BodyShapeMeasurements,
  viewMode: BodyProfile["viewMode"],
): BodyProfile {
  const base = DEFAULT_BODY_SHAPE_MEASUREMENTS[modelType];
  const shoulderDelta = measurements.shoulderCm - base.shoulderCm;

  return {
    modelType,
    heightCm: clamp(measurements.heightCm, 140, 200),
    weightKg: DEFAULT_PROFILE[modelType].weightKg,
    viewMode,
    measurements: {
      // Shoulder/upper-body girth has its own clavicle/deltoid deformation.
      // It must not be mapped to the Arm control, which changes arm volume.
      shoulderAdjustCm: clamp(shoulderDelta, -15, 15),
      bustAdjustCm: clamp(measurements.bustCm - base.bustCm, -15, 15),
      waistAdjustCm: clamp(measurements.waistCm - base.waistCm, -15, 15),
      hipAdjustCm: clamp(measurements.hipCm - base.hipCm, -15, 15),
      armAdjustCm: 0,
      legAdjustCm: clamp((measurements.hipCm - base.hipCm) * 0.35, -10, 10),
    },
  };
}
