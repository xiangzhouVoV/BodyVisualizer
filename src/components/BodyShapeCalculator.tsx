import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  BODY_SHAPE_COPY,
  calculateBodyShape,
  createCalculatorBodyProfile,
  DEFAULT_BODY_SHAPE_MEASUREMENTS,
  type BodyShapeMeasurements,
} from "../lib/bodyShapeCalculator";
import type { ModelType, ViewMode } from "../types/body";

const BodyCanvas = lazy(() => import("./BodyCanvas"));
const CM_PER_INCH = 2.54;

type Unit = "metric" | "imperial";

const shapeCards = [
  ["Hourglass", "/images/Hourglass.png", 1149, 1369, "Hourglass shapes have shoulders and hips that are roughly equal in width, with a clearly defined waist. A waist-to-hip ratio is often below 0.75. This balanced proportion is a descriptive visual category, not a rule every person must fit."],
  ["Pear / Triangle", "/images/PearOrtriangle.png", 1149, 1369, "Pear, or triangle, shapes have hips that are wider than the shoulders and upper body. The waist may be defined while visual weight is carried lower on the body. Measurements show this relationship without assigning a health judgement."],
  ["Inverted Triangle", "/images/InvertedTriangle.png", 1148, 1370, "Inverted triangle shapes have shoulders that are visibly broader than the hips. The upper body can read as stronger or wider while the waist and lower body appear comparatively narrow. Classification uses proportion, not BMI or weight."],
  ["Apple / Round", "/images/appleOrRound.png", 1148, 1370, "Apple, or round, shapes tend to carry more visible proportion through the waist and midsection. Shoulders and hips can be similar in size while the waist is less sharply defined. This category does not describe body-fat percentage or health."],
  ["Rectangle / Straight", "/images/Rectangle.png", 1148, 1370, "Rectangle, or straight, shapes have shoulders, waist, and hips that stay relatively close in proportion. The silhouette may show fewer dramatic curves through the waist. Posture, muscle, clothing, and natural variation can still change its appearance."],
] as const;
const shapeHowToTell = [
  "Compare your shoulder and hip measurements, then check whether your waist is at least about 25% smaller than your hips.",
  "Your hip measurement is noticeably larger than your shoulder or bust measurement, usually by around 5% or more.",
  "Your shoulder measurement is noticeably larger than your hip measurement, usually by around 5% or more.",
  "Your waist is close to your hip and upper-body measurements, so the middle is not sharply narrower than the rest.",
  "Your shoulder, waist, and hip measurements are relatively close, with less than roughly a 25% waist reduction from the hips.",
] as const;

const maleShapeCards = [
  ["Trapezoid", "/images/male-trapezoid.png", 1365, 1152, "Shoulders are slightly broader than the waist and hips, creating a naturally balanced upper body."],
  ["Inverted Triangle", "/images/male-inverted-triangle.png", 1199, 1312, "The shoulders and chest are noticeably wider than the waist and hips."],
  ["Rectangle", "/images/male-rectangle.png", 1199, 1312, "Shoulders, waist, and hips stay relatively close in width, creating a straighter silhouette."],
  ["Oval", "/images/male-oval.png", 1199, 1312, "The waist and midsection carry more visible width than the shoulders and hips."],
  ["Triangle", "/images/male-triangle.png", 1201, 1309, "The waist and hips are wider than the shoulders, creating a broader lower silhouette."],
] as const;

const maleShapeHowToTell = [
  "Your shoulders are moderately wider than your waist, while your hips stay close to your waist measurement.",
  "Your shoulders or chest are substantially wider than both your waist and hips.",
  "Your shoulder, waist, and hip measurements sit fairly close together without a strong taper.",
  "Your waist is the widest or close to the widest measurement, creating more fullness through the middle.",
  "Your waist or hips are noticeably wider than your shoulders, creating a broader lower body.",
] as const;

const questions = [
  ["What is the difference between body shape and BMI?", "BMI is a single number based on height and weight, while body shape describes your actual proportions. Two people can have the same BMI but completely different body shapes."],
  ["How accurate is the body shape calculator?", "It uses standard shoulder-to-hip and waist-to-hip ratios to classify your shape. For the best result, measure carefully with a soft tape measure."],
  ["Can I use this without creating an account?", "Yes. It is free to use, with no signup or email required."],
  ["What are the 5 main body shapes?", "Hourglass, pear (triangle), inverted triangle, apple (round), and rectangle (straight)."],
  ["How can I see my body shape in 3D?", "Enter your measurements and the 3D engine renders your body type instantly. You can then explore the full 3D body simulator for more detail."],
  ["What is the difference between body shape and body type?", "Body shape usually describes your visible shoulder, waist, and hip proportions, while body type is a broader phrase that may also include frame, muscle, or styling context. In this calculator, the terms refer to the same five proportion-based categories."],
  ["Do men have the same body shapes?", "Men can also have hourglass, pear, inverted triangle, apple, or rectangle-like proportions. The same category names can be used, although typical shoulder, chest, waist, and hip proportions may differ."],
  ["What waist-to-hip ratio indicates each body shape?", "A waist-to-hip ratio below about 0.75 often suggests a defined-waist hourglass pattern. A relatively larger hip measurement can suggest pear, a larger shoulder measurement can suggest inverted triangle, and a higher waist ratio can suggest apple. These are visual guidelines, not strict medical cutoffs."],
] as const;

function numberFromSearch(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function getInitialState() {
  const params = new URLSearchParams(window.location.search);
  const modelType: ModelType = params.get("gender") === "male" ? "male" : "female";
  const defaults = DEFAULT_BODY_SHAPE_MEASUREMENTS[modelType];
  return {
    modelType,
    measurements: {
      heightCm: numberFromSearch(params.get("height"), defaults.heightCm, 140, 200),
      shoulderCm: numberFromSearch(params.get("shoulder"), defaults.shoulderCm, 55, 160),
      bustCm: numberFromSearch(params.get("bust"), defaults.bustCm, 50, 170),
      waistCm: numberFromSearch(params.get("waist"), defaults.waistCm, 40, 160),
      hipCm: numberFromSearch(params.get("hip"), defaults.hipCm, 55, 180),
    },
  };
}

function formatValue(valueCm: number, unit: Unit) {
  return unit === "metric" ? String(Math.round(valueCm)) : (valueCm / CM_PER_INCH).toFixed(1);
}

function MeasurementSlider({
  id,
  label,
  valueCm,
  unit,
  minCm,
  maxCm,
  onChange,
}: {
  id: string;
  label: string;
  valueCm: number;
  unit: Unit;
  minCm: number;
  maxCm: number;
  onChange: (valueCm: number) => void;
}) {
  const factor = unit === "metric" ? 1 : CM_PER_INCH;
  const sliderValue = unit === "metric"
    ? Math.round(valueCm)
    : Number((valueCm / factor).toFixed(1));
  const unitLabel = unit === "metric" ? "cm" : "in";
  return (
    <label className="range-control calculator-range" htmlFor={id}>
      <span className="range-heading">
        <span>{label}</span>
        <strong>{formatValue(valueCm, unit)}<small> {unitLabel}</small></strong>
      </span>
      <input
        id={id}
        type="range"
        min={minCm / factor}
        max={maxCm / factor}
        step={unit === "metric" ? 1 : 0.1}
        value={sliderValue}
        onChange={(event) => onChange(Number(event.target.value) * factor)}
      />
      <span className="range-limits"><span>{formatValue(minCm, unit)} {unitLabel}</span><span>{formatValue(maxCm, unit)} {unitLabel}</span></span>
    </label>
  );
}

export function BodyShapeCalculator() {
  const initial = useMemo(getInitialState, []);
  const [modelType, setModelType] = useState<ModelType>(initial.modelType);
  const [measurements, setMeasurements] = useState<BodyShapeMeasurements>(initial.measurements);
  const [unit, setUnit] = useState<Unit>("metric");
  const [viewMode, setViewMode] = useState<ViewMode>("front");
  const [bodyHue, setBodyHue] = useState(120);
  const [modelLoading, setModelLoading] = useState(true);
  const result = calculateBodyShape(measurements);
  const resultCopy = BODY_SHAPE_COPY[result];
  const profile = createCalculatorBodyProfile(modelType, measurements, viewMode);
  // Three.js Color#set accepts the comma-separated CSS HSL syntax.
  const bodyColor = `hsl(${bodyHue}, 78%, 64%)`;

  useEffect(() => {
    const params = new URLSearchParams({
      gender: modelType,
      height: String(Math.round(measurements.heightCm)),
      shoulder: String(Math.round(measurements.shoulderCm)),
      bust: String(Math.round(measurements.bustCm)),
      waist: String(Math.round(measurements.waistCm)),
      hip: String(Math.round(measurements.hipCm)),
    });
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [measurements, modelType]);

  const updateMeasurement = (field: keyof BodyShapeMeasurements, value: number) => {
    if (!Number.isFinite(value)) return;
    setMeasurements((current) => ({ ...current, [field]: value }));
  };
  const selectModel = (nextModelType: ModelType) => {
    setModelType(nextModelType);
    setMeasurements(DEFAULT_BODY_SHAPE_MEASUREMENTS[nextModelType]);
  };
  const simulatorUrl = "/";

  return (
    <main className="calculator-page">
      <header className="calculator-topbar">
        <a className="calculator-brand" href="/" aria-label="BodyForm home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>BODY<span>FORM</span></span></a>
      </header>

      <div className="calculator-layout">
        <aside className="tool-sidebar calculator-sidebar">
          <span className="tool-sidebar-label">EXPLORE</span>
          <nav aria-label="Tools">
            <a href="/"><span aria-hidden="true">◎</span>3D Body Simulator</a>
            <a className="current" href="/body-shape-calculator/"><span aria-hidden="true">◇</span>Body Shape Calculator</a>
          </nav>
          <div className="tool-sidebar-section">
            <span className="tool-sidebar-label">RESOURCES</span>
            <nav aria-label="Resources">
              <a className="blog-menu-item" href="/blog/"><span aria-hidden="true">✎</span>Blog</a>
            </nav>
          </div>
        </aside>
        <div className="calculator-content">
      <div className="workspace calculator-workspace">
        <section className="stage-card calculator-stage-card" aria-labelledby="calculator-title">
          <div className="stage-heading calculator-stage-heading">
            <div><span className="section-kicker">FREE 3D BODY TYPE TOOL</span><h1 id="calculator-title" className="stage-title">Body Shape <em>Calculator</em></h1></div>
            <span className="asset-status"><i />LIVE 3D PREVIEW</span>
          </div>
          <div className="canvas-wrap calculator-preview" aria-label="Interactive 3D body shape preview">
            <div className="calculator-result"><span>YOUR BODY SHAPE</span><strong>{resultCopy.label}</strong></div>
            <Suspense fallback={<div className="calculator-canvas-loading">Preparing 3D preview…</div>}>
              <BodyCanvas profile={profile} modelSurface="calculator" showFatLayer={false} viewMode={viewMode} onViewModeChange={setViewMode} onLoadingChange={setModelLoading} backgroundColor="#070707" bodyColor={bodyColor} showGround={false} />
            </Suspense>
            {modelLoading && <div className="calculator-model-loading">Loading model…</div>}
            <div className="calculator-view-buttons" aria-label="View controls">{(["front", "left", "right", "back"] as const).map((view) => <button key={view} type="button" className={viewMode === view ? "active" : ""} onClick={() => setViewMode(view)}>{view}</button>)}</div>
            <label className="calculator-color-control" htmlFor="calculator-body-color">
              <span><b>MODEL COLOR</b><i style={{ backgroundColor: bodyColor }} aria-hidden="true" /></span>
              <input id="calculator-body-color" type="range" min="0" max="360" value={bodyHue} onChange={(event) => setBodyHue(Number(event.target.value))} aria-label="Body color" style={{ "--model-color": bodyColor } as CSSProperties} />
            </label>
          </div>
          <p className="calculator-stage-note">Adjust the parameters on the right to see a proportion-based 3D body-shape estimate.</p>
        </section>

        <aside className="side-panel calculator-panel">
          <section className="control-card calculator-control-card" aria-label="Body shape measurements">
            <span className="section-kicker">CUSTOMIZE</span>
            <h2>Body Shape Measurements</h2>
            <p className="section-description">Use the sliders to match your measurements.</p>
            <div className="calculator-segmented" role="group" aria-label="Gender">
              <button type="button" aria-pressed={modelType === "female"} onClick={() => selectModel("female")}>♀ Female</button>
              <button type="button" aria-pressed={modelType === "male"} onClick={() => selectModel("male")}>♂ Male</button>
            </div>
            <div className="calculator-unit-switch" role="group" aria-label="Measurement unit"><span>Measurements</span><button type="button" className={unit === "metric" ? "selected" : ""} onClick={() => setUnit("metric")}>cm</button><button type="button" className={unit === "imperial" ? "selected" : ""} onClick={() => setUnit("imperial")}>inches</button></div>
            <div className="controls-divider" />
            <div className="calculator-fields">
              <MeasurementSlider id="calculator-height" label="Height" valueCm={measurements.heightCm} unit={unit} minCm={140} maxCm={200} onChange={(value) => updateMeasurement("heightCm", value)} />
              <MeasurementSlider id="calculator-shoulder" label="Shoulders (around)" valueCm={measurements.shoulderCm} unit={unit} minCm={55} maxCm={160} onChange={(value) => updateMeasurement("shoulderCm", value)} />
              <MeasurementSlider id="calculator-bust" label="Bust" valueCm={measurements.bustCm} unit={unit} minCm={50} maxCm={170} onChange={(value) => updateMeasurement("bustCm", value)} />
              <MeasurementSlider id="calculator-waist" label="Waist" valueCm={measurements.waistCm} unit={unit} minCm={40} maxCm={160} onChange={(value) => updateMeasurement("waistCm", value)} />
              <MeasurementSlider id="calculator-hip" label="Hips" valueCm={measurements.hipCm} unit={unit} minCm={55} maxCm={180} onChange={(value) => updateMeasurement("hipCm", value)} />
            </div>
          </section>
        </aside>
      </div>

      <section className="calculator-section" aria-labelledby="five-body-shapes"><span className="section-kicker">BODY TYPE GUIDE</span><h2 id="five-body-shapes">Female Body Shapes</h2><div className="calculator-shape-grid">{shapeCards.map(([name, image, width, height, description], index) => <article key={name}><img className="shape-thumbnail" src={image} alt={`${name} body shape illustration`} width={width} height={height} loading="lazy" /><h3>{name}</h3><p>{description}</p><p className="shape-how-to"><strong>How to tell:</strong> {shapeHowToTell[index]}</p></article>)}</div></section>
      <section className="calculator-section" aria-labelledby="five-male-body-shapes"><span className="section-kicker">MALE BODY TYPE GUIDE</span><h2 id="five-male-body-shapes">Male Body Shapes</h2><div className="calculator-shape-grid">{maleShapeCards.map(([name, image, width, height, description], index) => <article key={name}><img className="shape-thumbnail" src={image} alt={`${name} male body shape illustration`} width={width} height={height} loading="lazy" /><h3>{name}</h3><p>{description}</p><p className="shape-how-to"><strong>How to tell:</strong> {maleShapeHowToTell[index]}</p></article>)}</div></section>

      <div className="calculator-information-grid">
        <section className="calculator-section" aria-labelledby="measurement-title"><span className="section-kicker">MEASUREMENT GUIDE</span><h2 id="measurement-title">How to Measure for Accurate Results</h2><ol className="calculator-steps"><li><strong>Shoulders</strong> — measure around the widest point of your shoulders, keeping the tape level.</li><li><strong>Bust</strong> — measure around the fullest part of your chest.</li><li><strong>Waist</strong> — measure at the narrowest point, usually just above the belly button.</li><li><strong>Hips</strong> — measure around the widest part of your hips and buttocks.</li></ol><p className="calculator-tip"><strong>Tip:</strong> keep the tape measure snug but not tight, and stand naturally. Once measured, enter the numbers above to see your 3D body shape.</p></section>
        <section className="calculator-section" aria-labelledby="calculator-faq"><span className="section-kicker">FAQ</span><h2 id="calculator-faq">Frequently Asked Questions</h2><div className="calculator-faq">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
      </div>

      <section className="calculator-cta"><div><span className="section-kicker">NEXT STEP</span><h2>Want a full 3D view?</h2><p>Explore weight, height, and local body-proportion adjustments in the Body Simulator.</p></div><a href={simulatorUrl}>See Full 3D Body Simulator →</a></section>
      <section className="calculator-references" aria-labelledby="calculator-references"><h2 id="calculator-references">References</h2><p>Body-shape categories are simplified visual descriptions, not medical diagnoses. For health guidance, consider measurements alongside professional advice.</p><ul><li><a href="https://www.cdc.gov/bmi/about/index.html" target="_blank" rel="noopener">CDC — About BMI</a></li><li><a href="https://pubmed.ncbi.nlm.nih.gov/15230982/" target="_blank" rel="noopener">PubMed — Waist circumference and cardiometabolic risk</a></li></ul></section>
      <footer className="calculator-footer">
        <span>© 2026 Body Visualizer</span>
        <a className="fazier-badge" href="https://fazier.com" target="_blank" rel="nofollow noopener noreferrer">
          <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=neutral" width={120} height={36} alt="Launched on Fazier" loading="lazy" />
        </a>
      </footer>
        </div>
      </div>
    </main>
  );
}
