import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_PROFILE } from "../lib/bodyMath";
import { DEFAULT_CIRCUMFERENCE_ADJUSTMENTS, type CircumferenceAdjustments, type ModelType, type ProfileSlot, type UnitSystem, type ViewMode } from "../types/body";

interface BodyStore {
  modelType: ModelType;
  unitSystem: UnitSystem;
  activeProfile: ProfileSlot;
  heightCm: number;
  weightKg: number;
  viewMode: ViewMode;
  measurements: CircumferenceAdjustments;
  targetHeightCm: number;
  targetWeightKg: number;
  targetMeasurements: CircumferenceAdjustments;
  showFatLayer: boolean;
  setModelType: (modelType: ModelType) => void;
  setUnitSystem: (unitSystem: UnitSystem) => void;
  setActiveProfile: (profile: ProfileSlot) => void;
  setHeightCm: (heightCm: number) => void;
  setWeightKg: (weightKg: number) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setMeasurements: (measurements: Partial<CircumferenceAdjustments>) => void;
  copyCurrentToTarget: () => void;
  setShowFatLayer: (showFatLayer: boolean) => void;
  reset: () => void;
}

export const useBodyStore = create<BodyStore>()(
  persist(
    (set) => ({
      modelType: "female",
      unitSystem: "metric",
      activeProfile: "current",
      heightCm: DEFAULT_PROFILE.female.heightCm,
      weightKg: DEFAULT_PROFILE.female.weightKg,
      viewMode: "front",
      measurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
      targetHeightCm: DEFAULT_PROFILE.female.heightCm,
      targetWeightKg: DEFAULT_PROFILE.female.weightKg,
      targetMeasurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
      showFatLayer: true,
      setModelType: (modelType) => set({ modelType }),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
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
      setShowFatLayer: (showFatLayer) => set({ showFatLayer }),
      reset: () =>
        set({
          modelType: "female",
          unitSystem: "metric",
          activeProfile: "current",
          heightCm: DEFAULT_PROFILE.female.heightCm,
          weightKg: DEFAULT_PROFILE.female.weightKg,
          viewMode: "front",
          measurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
          targetHeightCm: DEFAULT_PROFILE.female.heightCm,
          targetWeightKg: DEFAULT_PROFILE.female.weightKg,
          targetMeasurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS },
          showFatLayer: true,
        }),
    }),
    {
      name: "body-visualizer-profile",
      // Version 4 persists the preferred display system while keeping stored
      // body data in centimetres and kilograms for the renderer.
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<BodyStore>;
        return {
          ...state,
          measurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS, ...state.measurements },
          targetMeasurements: { ...DEFAULT_CIRCUMFERENCE_ADJUSTMENTS, ...state.targetMeasurements },
          unitSystem: state.unitSystem === "imperial" ? "imperial" : "metric",
          showFatLayer: true,
        } as BodyStore;
      },
    },
  ),
);
