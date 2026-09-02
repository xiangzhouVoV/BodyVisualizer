export type ModelType = "female" | "male";
export type ModelSurface = "simulator" | "calculator";

export type ViewMode = "front" | "left" | "right" | "back" | "free";
export type BodyShapeRenderMode = "simulator" | "calculator";

export type ProfileSlot = "current" | "target";
export type UnitSystem = "metric" | "imperial";

/** Optional visual offsets layered on top of height/weight-derived proportions. */
export interface CircumferenceAdjustments {
  shoulderAdjustCm: number;
  bustAdjustCm: number;
  waistAdjustCm: number;
  hipAdjustCm: number;
  armAdjustCm: number;
  legAdjustCm: number;
}

export const DEFAULT_CIRCUMFERENCE_ADJUSTMENTS: CircumferenceAdjustments = {
  shoulderAdjustCm: 0,
  bustAdjustCm: 0,
  waistAdjustCm: 0,
  hipAdjustCm: 0,
  armAdjustCm: 0,
  legAdjustCm: 0,
};

export type SimulatorCircumference = "bust" | "waist" | "hip" | "arm" | "leg";

export interface SimulatorCircumferenceRange {
  label: string;
  minCm: number;
  maxCm: number;
  restingCm: number;
  adjustmentKey: keyof Pick<
    CircumferenceAdjustments,
    "bustAdjustCm" | "waistAdjustCm" | "hipAdjustCm" | "armAdjustCm" | "legAdjustCm"
  >;
}

/**
 * The simulator presents circumference inputs as practical measurement ranges.
 * The renderer continues to use bounded local offsets internally, so every
 * value in a range maps predictably to the same safe visual response.
 */
export const SIMULATOR_CIRCUMFERENCE_RANGES: Record<
  ModelType,
  Record<SimulatorCircumference, SimulatorCircumferenceRange>
> = {
  female: {
    bust: { label: "Bust", minCm: 65, maxCm: 140, restingCm: 90, adjustmentKey: "bustAdjustCm" },
    waist: { label: "Waist", minCm: 50, maxCm: 155, restingCm: 70, adjustmentKey: "waistAdjustCm" },
    hip: { label: "Hips", minCm: 70, maxCm: 165, restingCm: 95, adjustmentKey: "hipAdjustCm" },
    arm: { label: "Upper arm", minCm: 20, maxCm: 55, restingCm: 29, adjustmentKey: "armAdjustCm" },
    leg: { label: "Thigh", minCm: 40, maxCm: 95, restingCm: 55, adjustmentKey: "legAdjustCm" },
  },
  male: {
    bust: { label: "Chest", minCm: 70, maxCm: 160, restingCm: 102, adjustmentKey: "bustAdjustCm" },
    waist: { label: "Waist", minCm: 60, maxCm: 175, restingCm: 85, adjustmentKey: "waistAdjustCm" },
    hip: { label: "Hips", minCm: 70, maxCm: 165, restingCm: 100, adjustmentKey: "hipAdjustCm" },
    arm: { label: "Upper arm", minCm: 22, maxCm: 65, restingCm: 34, adjustmentKey: "armAdjustCm" },
    leg: { label: "Thigh", minCm: 40, maxCm: 100, restingCm: 58, adjustmentKey: "legAdjustCm" },
  },
};

export interface BodyProfile {
  modelType: ModelType;
  heightCm: number;
  weightKg: number;
  viewMode: ViewMode;
  measurements: CircumferenceAdjustments;
  /** Calculator measurements use their own isolated regional deformation. */
  shapeRenderMode?: BodyShapeRenderMode;
}
