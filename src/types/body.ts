export type ModelType = "female" | "male";

export type ViewMode = "front" | "left" | "right" | "back" | "free";

export type ProfileSlot = "current" | "target";
export type UnitSystem = "metric" | "imperial";

/** Optional visual offsets layered on top of height/weight-derived proportions. */
export interface CircumferenceAdjustments {
  bustAdjustCm: number;
  waistAdjustCm: number;
  hipAdjustCm: number;
  armAdjustCm: number;
  legAdjustCm: number;
}

export const DEFAULT_CIRCUMFERENCE_ADJUSTMENTS: CircumferenceAdjustments = {
  bustAdjustCm: 0,
  waistAdjustCm: 0,
  hipAdjustCm: 0,
  armAdjustCm: 0,
  legAdjustCm: 0,
};

export interface BodyProfile {
  modelType: ModelType;
  heightCm: number;
  weightKg: number;
  viewMode: ViewMode;
  measurements: CircumferenceAdjustments;
}
