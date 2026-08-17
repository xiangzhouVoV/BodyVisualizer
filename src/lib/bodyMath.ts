import type { ModelType } from "../types/body";

export const DEFAULT_PROFILE: Record<ModelType, { heightCm: number; weightKg: number }> = {
  female: { heightCm: 165, weightKg: 55 },
  male: { heightCm: 175, weightKg: 70 },
};

export function calculateBMI(heightCm: number, weightKg: number) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function getWeightMorphs(heightCm: number, weightKg: number) {
  const bmi = calculateBMI(heightCm, weightKg);

  return {
    bodyFat: clamp((bmi - 17) / 18),
    belly: clamp((bmi - 21) / 13),
    chest: clamp((bmi - 18) / 18),
    waist: clamp((bmi - 20) / 14),
    hip: clamp((bmi - 19) / 15),
    thigh: clamp((bmi - 19) / 15),
    calf: clamp((bmi - 21) / 18),
    arm: clamp((bmi - 19) / 15),
  };
}

export function getBmiLabel(bmi: number) {
  if (bmi < 18.5) return "偏瘦";
  if (bmi < 24) return "健康范围";
  if (bmi < 28) return "偏高";
  return "较高";
}
