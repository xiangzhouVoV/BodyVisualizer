import { useState } from "react";

import { calculateBMI, getBmiLabel, getWeightMorphs } from "../lib/bodyMath";
import { useBodyStore } from "../stores/bodyStore";
import type { ModelType } from "../types/body";

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  signed = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  signed?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span className="range-heading">
        <span>{label}</span>
        <strong>{signed && value > 0 ? "+" : ""}{value}<small>{unit}</small></strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-limits"><span>{min}{unit}</span><span>{max}{unit}</span></span>
    </label>
  );
}

export function BodyControls() {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const {
    activeProfile, heightCm, measurements, modelType, targetHeightCm,
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

      <div className="controls-divider" />
      <RangeControl label={`${activeLabel} Height`} value={activeHeightCm} min={140} max={200} unit=" cm" onChange={setHeightCm} />
      <RangeControl label={`${activeLabel} Weight`} value={activeWeightKg} min={35} max={130} unit=" kg" onChange={setWeightKg} />

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
          <RangeControl label="Bust" value={activeMeasurements.bustAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(bustAdjustCm) => setMeasurements({ bustAdjustCm })} />
          <RangeControl label="Waist" value={activeMeasurements.waistAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(waistAdjustCm) => setMeasurements({ waistAdjustCm })} />
          <RangeControl label="Hip" value={activeMeasurements.hipAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(hipAdjustCm) => setMeasurements({ hipAdjustCm })} />
          <RangeControl label="Arm" value={activeMeasurements.armAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(armAdjustCm) => setMeasurements({ armAdjustCm })} />
          <RangeControl label="Leg" value={activeMeasurements.legAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(legAdjustCm) => setMeasurements({ legAdjustCm })} />
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
