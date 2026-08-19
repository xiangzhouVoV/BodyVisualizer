import { lazy, Suspense } from "react";

import { BodyControls } from "../components/BodyControls";
import { ViewControls } from "../components/ViewControls";
import { useBodyStore } from "../stores/bodyStore";

const BodyCanvas = lazy(() => import("../components/BodyCanvas"));

export function App() {
  const modelType = useBodyStore((state) => state.modelType);
  const heightCm = useBodyStore((state) => state.heightCm);
  const weightKg = useBodyStore((state) => state.weightKg);
  const measurements = useBodyStore((state) => state.measurements);
  const targetHeightCm = useBodyStore((state) => state.targetHeightCm);
  const targetWeightKg = useBodyStore((state) => state.targetWeightKg);
  const targetMeasurements = useBodyStore((state) => state.targetMeasurements);
  const activeProfile = useBodyStore((state) => state.activeProfile);
  const showFatLayer = useBodyStore((state) => state.showFatLayer);
  const viewMode = useBodyStore((state) => state.viewMode);
  const setViewMode = useBodyStore((state) => state.setViewMode);
  const reset = useBodyStore((state) => state.reset);
  const previewProfile = activeProfile === "current"
    ? { heightCm, weightKg, measurements }
    : { heightCm: targetHeightCm, weightKg: targetWeightKg, measurements: targetMeasurements };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>BODY<span className="brand-accent">FORM</span></span>
          <span className="brand-subtitle">Body Shape Visualizer</span>
        </div>
        <div className="topbar-actions">
          <span className="live-dot"><i />Live Preview</span>
          <button className="reset-button" onClick={reset}>↻ <span>Reset</span></button>
        </div>
      </header>

      <div className="workspace">
        <section className="stage-card" aria-label="3D body shape preview">
          <div className="stage-heading">
            <div><span className="section-kicker">3D PREVIEW · {activeProfile === "current" ? "CURRENT" : "TARGET"}</span><p className="stage-title">{activeProfile === "current" ? "Current Shape, " : "Target Shape, "}<em>Defined by You</em></p></div>
            <span className="asset-status"><i />PARAMETRIC MODEL</span>
          </div>
          <div className="canvas-wrap" aria-label="Interactive 3D body shape visualizer">
            <Suspense fallback={<div className="canvas-loading">Loading 3D body visualizer…</div>}>
              <BodyCanvas profile={{ modelType, ...previewProfile, viewMode }} showFatLayer={showFatLayer} viewMode={viewMode} onViewModeChange={setViewMode} />
            </Suspense>
            <span className="sr-only">Interactive 3D body model. Enter height, weight, and optional measurements, then rotate and zoom to explore the body shape.</span>
            <div className="canvas-hint">Drag to rotate&nbsp; · &nbsp;Scroll to zoom</div>
          </div>
          <div className="stage-footer"><ViewControls /></div>
        </section>

        <aside className="side-panel"><BodyControls /></aside>
      </div>

      <footer className="disclaimer"><span>ⓘ</span> Results are based on a parametric 3D body model for visual reference only. They do not represent real body measurements, medical diagnosis, or health advice.</footer>
    </main>
  );
}
