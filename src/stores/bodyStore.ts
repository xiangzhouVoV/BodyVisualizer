import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_PROFILE } from "../lib/bodyMath";
import { DEFAULT_CIRCUMFERENCE_ADJUSTMENTS, type CircumferenceAdjustments, type ModelType, type ProfileSlot, type ViewMode } from "../types/body";

interface BodyStore {
  modelType: ModelType;
  activeProfile: ProfileSlot;
  heightCm: number;
  weightKg: number;
  viewMode: ViewMode;
  measurements: CircumferenceAdjustments;
  targetHeightCm: number;
  targetWeightKg: number;
  targetMeasurements: CircumferenceAdjustments;
  setModelType: (modelType: ModelType) => void;
  setActiveProfile: (profile: ProfileSlot) => void;
  setHeightCm: (heightCm: number) => void;
  setWeightKg: (weightKg: number) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setMeasurements: (measurements: Partial<CircumferenceAdjustments>) => void;
  copyCurrentToTarget: () => void;
  reset: () => void;
}

export const useBodyStore = create<BodyStore>()(
  persist(
    (set) => ({
      modelType: "female",
      activeProfile: "current",
      heightCm: DEFAULT_PROFILE.female.heightCm,
      weightKg: DEFAULT_PROFILE.female.weightKg,
      viewMode: "front",
      measurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
      targetHeightCm: DEFAULT_PROFILE.female.heightCm,
      targetWeightKg: 50,
      targetMeasurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
      setModelType: (modelType) => set({ modelType }),
      setActiveProfile: (activeProfile) => set({ activeProfile }),
      setHeightCm: (heightCm) => set((state) => state.activeProfile === "current" ? { heightCm } : { targetHeightCm: heightCm }),
      setWeightKg: (weightKg) => set((state) => state.activeProfile === "current" ? { weightKg } : { targetWeightKg: weightKg }),
      setViewMode: (viewMode) => set({ viewMode }),
      setMeasurements: (measurements) => set((state) => state.activeProfile === "current"
        ? { measurements: { ...state.measurements, ...measurements } }
        : { targetMeasurements: { ...state.targetMeasurements, ...measurements } }),
      copyCurrentToTarget: () => set((state) => ({
        targetHeightCm: state.heightCm,
        targetWeightKg: state.weightKg,
        targetMeasurements: { ...state.measurements },
      })),
      reset: () =>
        set({
          modelType: "female",
          activeProfile: "current",
          heightCm: DEFAULT_PROFILE.female.heightCm,
          weightKg: DEFAULT_PROFILE.female.weightKg,
          viewMode: "front",
          measurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
          targetHeightCm: DEFAULT_PROFILE.female.heightCm,
          targetWeightKg: 50,
          targetMeasurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
        }),
    }),
    {
      name: "body-visualizer-profile",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<BodyStore>;
        return {
          ...state,
          measurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS, ...state.measurements },
          targetMeasurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS, ...state.targetMeasurements },
        } as BodyStore;
      },
    },
  ),
);
