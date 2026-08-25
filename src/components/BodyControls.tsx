import { useState } from "react";

import { calculateBMI, getBmiLabel, getWeightMorphs } from "../lib/bodyMath";
import { useBodyStore } from "../stores/bodyStore";
import type { ModelType } from "../types/body";

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

function roundTo(value: number, decimals = 0) {
  const precision = 10 ** decimals;
  return Math.round(value * precision) / precision;
}

function formatFeetAndInches(totalInches: number) {
  const rounded = Math.round(totalInches);
  return `${Math.floor(rounded / 12)} ft ${rounded % 12} in`;
}

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  signed = false,
  step = 1,
  formatValue,
  formatLimit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  signed?: boolean;
  step?: number;
  formatValue?: (value: number) => string;
  formatLimit?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const visibleValue = formatValue ? formatValue(value) : String(value);
  const visibleMin = formatLimit ? formatLimit(min) : `${min}${unit}`;
  const visibleMax = formatLimit ? formatLimit(max) : `${max}${unit}`;
  return (
    <label className="range-control">
      <span className="range-heading">
        <span>{label}</span>
        <strong>{signed && value > 0 ? "+" : ""}{visibleValue}<small>{unit}</small></strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-limits"><span>{visibleMin}</span><span>{visibleMax}</span></span>
    </label>
  );
}

export function BodyControls() {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const {
    activeProfile, heightCm, measurements, modelType, targetHeightCm, unitSystem,
    targetMeasurements, targetWeightKg, weightKg,
    showFatLayer,
  } = useBodyStore();
  const isCurrent = activeProfile === "current";
  const activeHeightCm = isCurrent ? heightCm : targetHeightCm;
  const activeWeightKg = isCurrent ? weightKg : targetWeightKg;
  const activeMeasurements = isCurrent ? measurements : targetMeasurements;
  const activeLabel = isCurrent ? "Current Shape" : "Target Shape";
  const setActiveProfile = useBodyStore((state) => state.setActiveProfile);
  const setHeightCm = useBodyStore((state) => state.setHeightCm);
  const setModelType = useBodyStore((state) => state.setModelType);
  const setUnitSystem = useBodyStore((state) => state.setUnitSystem);
  const setWeightKg = useBodyStore((state) => state.setWeightKg);
  const setMeasurements = useBodyStore((state) => state.setMeasurements);
  const copyCurrentToTarget = useBodyStore((state) => state.copyCurrentToTarget);
  const setShowFatLayer = useBodyStore((state) => state.setShowFatLayer);
  const bmi = calculateBMI(activeHeightCm, activeWeightKg);
  const fatIndex = getWeightMorphs(activeHeightCm, activeWeightKg).bodyFat;
  const fatLabel = fatIndex < 0.33 ? "Low" : fatIndex < 0.66 ? "Moderate" : "High";

  const selectModel = (next: ModelType) => {
    setModelType(next);
  };
  const isImperial = unitSystem === "imperial";
  const measurementUnit = isImperial ? " in" : " cm";
  const cmToInches = (value: number) => roundTo(value / CM_PER_INCH, 1);
  const inchesToCm = (value: number) => roundTo(value * CM_PER_INCH, 1);
  const kilogramToPounds = (value: number) => Math.round(value / KG_PER_POUND);
  const poundsToKilograms = (value: number) => roundTo(value * KG_PER_POUND, 1);

  return (
    <section className="control-card" aria-label="Body shape controls">
      <div className="section-kicker">CUSTOMIZE</div>
      <h2>Customize Body Shape</h2>
      <p className="section-description">Enter current and target data to compare body shapes</p>

      <div className="profile-switch" role="group" aria-label="Body shape profile">
        <button className={isCurrent ? "selected" : ""} onClick={() => setActiveProfile("current")}>Current Shape</button>
        <button className={!isCurrent ? "selected" : ""} onClick={() => setActiveProfile("target")}>Target Shape</button>
      </div>
      {!isCurrent && <button className="copy-profile-button" onClick={copyCurrentToTarget}>↙ Copy Current Data as Target</button>}

      <div className="model-switch" role="group" aria-label="Model type">
        <button className={modelType === "male" ? "selected" : ""} onClick={() => selectModel("male")}>
          <span className="model-icon">♂</span>Male
        </button>
        <button className={modelType === "female" ? "selected" : ""} onClick={() => selectModel("female")}>
          <span className="model-icon">♀</span>Female
        </button>
      </div>

      <div className="unit-switch" role="group" aria-label="Measurement units">
        <button className={unitSystem === "metric" ? "selected" : ""} onClick={() => setUnitSystem("metric")}>Metric <small>cm / kg</small></button>
        <button className={unitSystem === "imperial" ? "selected" : ""} onClick={() => setUnitSystem("imperial")}>Imperial <small>ft / in / lb</small></button>
      </div>

      <div className="controls-divider" />
      {isImperial ? (
        <>
          <RangeControl
            label={`${activeLabel} Height`}
            value={Math.round(activeHeightCm / CM_PER_INCH)}
            min={55}
            max={79}
            unit=""
            formatValue={formatFeetAndInches}
            formatLimit={formatFeetAndInches}
            onChange={(inches) => setHeightCm(Math.round(inches * CM_PER_INCH))}
          />
          <RangeControl label={`${activeLabel} Weight`} value={kilogramToPounds(activeWeightKg)} min={77} max={287} unit=" lb" onChange={(pounds) => setWeightKg(poundsToKilograms(pounds))} />
        </>
      ) : (
        <>
          <RangeControl label={`${activeLabel} Height`} value={activeHeightCm} min={140} max={200} unit=" cm" onChange={setHeightCm} />
          <RangeControl label={`${activeLabel} Weight`} value={activeWeightKg} min={35} max={130} unit=" kg" onChange={setWeightKg} />
        </>
      )}

      <button
        className={`measurements-toggle ${showMeasurements ? "open" : ""}`}
        onClick={() => setShowMeasurements((open) => !open)}
        aria-expanded={showMeasurements}
      >
        <span><b>＋</b> Measurement Adjustments</span><small>{showMeasurements ? "Collapse" : "Bust / Waist / Hip / Arms / Legs"}</small>
      </button>

      {showMeasurements && (
        <div className="measurements-panel">
          <p>Fine-tune local proportions based on {activeLabel.toLowerCase()} height and weight</p>
          <RangeControl label="Bust" value={isImperial ? cmToInches(activeMeasurements.bustAdjustCm) : activeMeasurements.bustAdjustCm} min={isImperial ? -6 : -15} max={isImperial ? 6 : 15} step={0.1} unit={measurementUnit} signed onChange={(value) => setMeasurements({ bustAdjustCm: isImperial ? inchesToCm(value) : value })} />
          <RangeControl label="Waist" value={isImperial ? cmToInches(activeMeasurements.waistAdjustCm) : activeMeasurements.waistAdjustCm} min={isImperial ? -6 : -15} max={isImperial ? 6 : 15} step={0.1} unit={measurementUnit} signed onChange={(value) => setMeasurements({ waistAdjustCm: isImperial ? inchesToCm(value) : value })} />
          <RangeControl label="Hip" value={isImperial ? cmToInches(activeMeasurements.hipAdjustCm) : activeMeasurements.hipAdjustCm} min={isImperial ? -6 : -15} max={isImperial ? 6 : 15} step={0.1} unit={measurementUnit} signed onChange={(value) => setMeasurements({ hipAdjustCm: isImperial ? inchesToCm(value) : value })} />
          <RangeControl label="Arm" value={isImperial ? cmToInches(activeMeasurements.armAdjustCm) : activeMeasurements.armAdjustCm} min={isImperial ? -6 : -15} max={isImperial ? 6 : 15} step={0.1} unit={measurementUnit} signed onChange={(value) => setMeasurements({ armAdjustCm: isImperial ? inchesToCm(value) : value })} />
          <RangeControl label="Leg" value={isImperial ? cmToInches(activeMeasurements.legAdjustCm) : activeMeasurements.legAdjustCm} min={isImperial ? -6 : -15} max={isImperial ? 6 : 15} step={0.1} unit={measurementUnit} signed onChange={(value) => setMeasurements({ legAdjustCm: isImperial ? inchesToCm(value) : value })} />
        </div>
      )}

      <div className="bmi-panel">
        <div>
          <span className="bmi-label">Body Mass Index (BMI)</span>
          <span className="bmi-note">For body-shape reference only</span>
        </div>
        <div className="bmi-value"><strong>{bmi.toFixed(1)}</strong><span>{getBmiLabel(bmi)}</span></div>
      </div>

      <div className="fat-trend-card">
        <div className="fat-trend-heading">
          <div><span className="bmi-label">Fat Trend Index</span><span className="bmi-note">Visual reference based on BMI</span></div>
          <strong>{Math.round(fatIndex * 100)}<small>/ 100</small></strong>
        </div>
        <div className="fat-meter"><i style={{ width: `${Math.max(5, fatIndex * 100)}%` }} /></div>
        <div className="fat-trend-footer"><span>{fatLabel} trend</span><button className={showFatLayer ? "enabled" : ""} onClick={() => setShowFatLayer(!showFatLayer)} aria-pressed={showFatLayer}>{showFatLayer ? "Fat Layer Shown" : "Show Fat Layer"}</button></div>
      </div>
    </section>
  );
}
