export interface CircumferencePoint {
  relativeY: number;
  horizontalDistance: number;
  rearSurface: number;
  armZone: number;
  waistTorsoMask: number;
  shoulder: number;
}

export interface CircumferenceResponse {
  waistLateral: number;
  waistDepth: number;
  waist: number;
  hipLateral: number;
  hipDepth: number;
  hip: number;
  waistLateralGain: number;
  waistDepthGain: number;
  hipLateralGain: number;
  hipDepthGain: number;
  shoulderOffsetGain: number;
}

function bell(value: number, center: number, width: number) {
  return Math.exp(-((value - center) ** 2) / (2 * width ** 2));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const progress = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return progress * progress * (3 - 2 * progress);
}

/** Homepage: broad, smooth regional changes for a natural body-volume preview. */
export function getSimulatorCircumferenceResponse(point: CircumferencePoint): CircumferenceResponse {
  const waist = bell(point.relativeY, 0.56, 0.10) * (1 - point.armZone);
  const hip = bell(point.relativeY, 0.43, 0.11) * (1 - point.armZone);
  return {
    waistLateral: waist,
    waistDepth: waist,
    waist,
    hipLateral: hip,
    hipDepth: hip,
    hip,
    waistLateralGain: 0.010,
    waistDepthGain: 0.002,
    hipLateralGain: 0.007,
    hipDepthGain: 0.007,
    shoulderOffsetGain: 0,
  };
}

/** Calculator: proportion-focused bands for shoulder, waist, and hip comparison. */
export function getCalculatorCircumferenceResponse(point: CircumferencePoint): CircumferenceResponse {
  const waistLateralBand = bell(point.relativeY, 0.60, 0.075)
    * smoothstep(0.52, 0.585, point.relativeY)
    * (1 - smoothstep(0.68, 0.715, point.relativeY));
  const waistRearBand = bell(point.relativeY, 0.665, 0.045)
    * smoothstep(0.62, 0.64, point.relativeY)
    * (1 - smoothstep(0.71, 0.73, point.relativeY));
  const waistLateral = waistLateralBand * point.waistTorsoMask;
  const waistDepth = (waistLateralBand * (1 - point.rearSurface) + waistRearBand * point.rearSurface)
    * point.waistTorsoMask;
  const hipLateralBand = bell(point.relativeY, 0.43, 0.125)
    * smoothstep(0.27, 0.33, point.relativeY)
    * (1 - smoothstep(0.54, 0.60, point.relativeY));
  const hipRearBand = bell(point.relativeY, 0.445, 0.115)
    * smoothstep(0.27, 0.33, point.relativeY)
    * (1 - smoothstep(0.56, 0.62, point.relativeY));
  const hipLateral = hipLateralBand * (1 - point.armZone);
  const hipDepth = (hipLateralBand * (1 - point.rearSurface) + hipRearBand * point.rearSurface)
    * (1 - point.armZone);

  return {
    waistLateral,
    waistDepth,
    waist: Math.max(waistLateral, waistDepth),
    hipLateral,
    hipDepth,
    hip: Math.max(hipLateral, hipDepth),
    waistLateralGain: 0.009,
    waistDepthGain: 0.0068 - 0.0033 * point.rearSurface,
    hipLateralGain: 0.011,
    hipDepthGain: 0.0084 + 0.0004 * point.rearSurface,
    shoulderOffsetGain: point.shoulder * 0.0036,
  };
}

/**
 * Each surface gets a distinct GLSL snippet and shader-program key. Keep this
 * separate from the CPU functions above so a Calculator proportion edit can
 * never change the Simulator's body-volume shader.
 */
export function getCircumferenceVertexShader(mode: "simulator" | "calculator") {
  if (mode === "simulator") {
    return `
float waistLateral = regionalBell(relativeY, 0.56, 0.10) * (1.0 - armZone);
float waistDepth = waistLateral;
float waist = waistLateral;
float hipLateral = regionalBell(relativeY, 0.43, 0.11) * (1.0 - armZone);
float hipDepth = hipLateral;
float hip = hipLateral;
float waistLateralGain = 0.010;
float waistDepthGain = 0.002;
float hipLateralGain = 0.007;
float hipDepthGain = 0.007;
float shoulderOffset = 0.0;`;
  }

  return `
float calculatorWaistLateralBand = regionalBell(relativeY, 0.60, 0.075)
  * smoothstep(0.52, 0.585, relativeY)
  * (1.0 - smoothstep(0.68, 0.715, relativeY));
float calculatorWaistRearBand = regionalBell(relativeY, 0.665, 0.045)
  * smoothstep(0.62, 0.64, relativeY)
  * (1.0 - smoothstep(0.71, 0.73, relativeY));
float waistLateral = calculatorWaistLateralBand * waistTorsoMask;
float waistDepth = mix(calculatorWaistLateralBand, calculatorWaistRearBand, rearSurface) * waistTorsoMask;
float waist = max(waistLateral, waistDepth);
float calculatorHipLateralBand = regionalBell(relativeY, 0.43, 0.125)
  * smoothstep(0.27, 0.33, relativeY)
  * (1.0 - smoothstep(0.54, 0.60, relativeY));
float calculatorHipRearBand = regionalBell(relativeY, 0.445, 0.115)
  * smoothstep(0.27, 0.33, relativeY)
  * (1.0 - smoothstep(0.56, 0.62, relativeY));
float hipLateral = calculatorHipLateralBand * (1.0 - armZone);
float hipDepth = mix(calculatorHipLateralBand, calculatorHipRearBand, rearSurface) * (1.0 - armZone);
float hip = max(hipLateral, hipDepth);
float waistLateralGain = 0.0090;
float waistDepthGain = mix(0.0068, 0.0035, rearSurface);
float hipLateralGain = 0.0110;
float hipDepthGain = mix(0.0084, 0.0088, rearSurface);
float shoulderOffset = shoulder * shoulderAdjustCm * 0.0036;`;
}
