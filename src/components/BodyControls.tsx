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
  const activeLabel = isCurrent ? "当前体型" : "目标体型";
  const setActiveProfile = useBodyStore((state) => state.setActiveProfile);
  const setHeightCm = useBodyStore((state) => state.setHeightCm);
  const setModelType = useBodyStore((state) => state.setModelType);
  const setWeightKg = useBodyStore((state) => state.setWeightKg);
  const setMeasurements = useBodyStore((state) => state.setMeasurements);
  const copyCurrentToTarget = useBodyStore((state) => state.copyCurrentToTarget);
  const setShowFatLayer = useBodyStore((state) => state.setShowFatLayer);
  const bmi = calculateBMI(activeHeightCm, activeWeightKg);
  const fatIndex = getWeightMorphs(activeHeightCm, activeWeightKg).bodyFat;
  const fatLabel = fatIndex < 0.33 ? "较低" : fatIndex < 0.66 ? "中等" : "较高";

  const selectModel = (next: ModelType) => {
    setModelType(next);
  };

  return (
    <section className="control-card" aria-label="体型参数">
      <div className="section-kicker">CUSTOMIZE</div>
      <h2>调整体型</h2>
      <p className="section-description">分别录入当前与目标数据，切换预览体型</p>

      <div className="profile-switch" role="group" aria-label="编辑体型">
        <button className={isCurrent ? "selected" : ""} onClick={() => setActiveProfile("current")}>当前体型</button>
        <button className={!isCurrent ? "selected" : ""} onClick={() => setActiveProfile("target")}>目标体型</button>
      </div>
      {!isCurrent && <button className="copy-profile-button" onClick={copyCurrentToTarget}>↙ 复制当前数据作为目标</button>}

      <div className="model-switch" role="group" aria-label="模型类型">
        <button className={modelType === "female" ? "selected" : ""} onClick={() => selectModel("female")}>
          <span className="model-icon">♀</span>女性
        </button>
        <button className={modelType === "male" ? "selected" : ""} onClick={() => selectModel("male")}>
          <span className="model-icon">♂</span>男性
        </button>
      </div>

      <div className="controls-divider" />
      <RangeControl label={`${activeLabel}身高`} value={activeHeightCm} min={140} max={200} unit=" cm" onChange={setHeightCm} />
      <RangeControl label={`${activeLabel}体重`} value={activeWeightKg} min={35} max={130} unit=" kg" onChange={setWeightKg} />

      <button
        className={`measurements-toggle ${showMeasurements ? "open" : ""}`}
        onClick={() => setShowMeasurements((open) => !open)}
        aria-expanded={showMeasurements}
      >
        <span><b>＋</b> 围度微调</span><small>{showMeasurements ? "收起" : "三围 / 臂围 / 腿围"}</small>
      </button>

      {showMeasurements && (
        <div className="measurements-panel">
          <p>基于{activeLabel}的身高、体重做局部视觉校准</p>
          <RangeControl label="胸围" value={activeMeasurements.bustAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(bustAdjustCm) => setMeasurements({ bustAdjustCm })} />
          <RangeControl label="腰围" value={activeMeasurements.waistAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(waistAdjustCm) => setMeasurements({ waistAdjustCm })} />
          <RangeControl label="臀围" value={activeMeasurements.hipAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(hipAdjustCm) => setMeasurements({ hipAdjustCm })} />
          <RangeControl label="臂围" value={activeMeasurements.armAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(armAdjustCm) => setMeasurements({ armAdjustCm })} />
          <RangeControl label="腿围" value={activeMeasurements.legAdjustCm} min={-15} max={15} unit=" cm" signed onChange={(legAdjustCm) => setMeasurements({ legAdjustCm })} />
        </div>
      )}

      <div className="bmi-panel">
        <div>
          <span className="bmi-label">身体质量指数 BMI</span>
          <span className="bmi-note">仅供体型趋势参考</span>
        </div>
        <div className="bmi-value"><strong>{bmi.toFixed(1)}</strong><span>{getBmiLabel(bmi)}</span></div>
      </div>

      <div className="fat-trend-card">
        <div className="fat-trend-heading">
          <div><span className="bmi-label">脂肪趋势指数</span><span className="bmi-note">基于 BMI 的可视化参考</span></div>
          <strong>{Math.round(fatIndex * 100)}<small>/ 100</small></strong>
        </div>
        <div className="fat-meter"><i style={{ width: `${Math.max(5, fatIndex * 100)}%` }} /></div>
        <div className="fat-trend-footer"><span>{fatLabel}趋势</span><button className={showFatLayer ? "enabled" : ""} onClick={() => setShowFatLayer(!showFatLayer)} aria-pressed={showFatLayer}>{showFatLayer ? "已显示脂肪层" : "显示脂肪层"}</button></div>
      </div>
    </section>
  );
}
