import { lazy, Suspense, useLayoutEffect, useState, type CSSProperties } from "react";

import { BodyControls } from "../components/BodyControls";
import { ViewControls } from "../components/ViewControls";
import { useBodyStore } from "../stores/bodyStore";

const BodyCanvas = lazy(() => import("../components/BodyCanvas"));

export function App() {
  const [modelLoading, setModelLoading] = useState(true);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  // A cool model colour gives the warm fat layer an immediately legible
  // contrast without needing to exaggerate its volume or opacity.
  const [bodyHue, setBodyHue] = useState(214);
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

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "1") return;
    reset();
    window.history.replaceState(null, "", window.location.pathname);
  }, [reset]);
  const previewProfile = activeProfile === "current"
    ? { heightCm, weightKg, measurements }
    : { heightCm: targetHeightCm, weightKg: targetWeightKg, measurements: targetMeasurements };
  const bodyColor = `hsl(${bodyHue}, 78%, 64%)`;

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

      <div className="app-layout">
        <aside className="tool-sidebar">
          <span className="tool-sidebar-label">EXPLORE</span>
          <nav aria-label="Tools">
            <a className="current" href="/"><span aria-hidden="true">◎</span>3D Body Simulator</a>
            <a href="/body-shape-calculator/"><span aria-hidden="true">◇</span>Body Shape Calculator</a>
          </nav>
          <div className="tool-sidebar-section">
            <span className="tool-sidebar-label">RESOURCES</span>
            <nav aria-label="Resources">
              <a className="blog-menu-item" href="/blog/"><span aria-hidden="true">✎</span>Blog</a>
            </nav>
          </div>
        </aside>
        <div className="app-content">
      <div className="workspace">
        <section className="stage-card" aria-label="3D body shape preview">
          <div className="stage-heading">
            <div><span className="section-kicker">3D PREVIEW · {activeProfile === "current" ? "CURRENT" : "TARGET"}</span><p className="stage-title">Your Body, <em>Worthy of Care</em></p></div>
            <span className="asset-status"><i />PARAMETRIC MODEL</span>
          </div>
          <div className="canvas-wrap simulator-preview" aria-label="Interactive 3D body shape visualizer">
            <Suspense fallback={<div className="canvas-loading">Loading 3D body visualizer…</div>}>
              <BodyCanvas profile={{ modelType, ...previewProfile, viewMode }} showFatLayer={showFatLayer} viewMode={viewMode} onViewModeChange={setViewMode} onLoadingChange={setModelLoading} onLoadingProgress={setModelLoadProgress} backgroundColor="#111827" bodyColor={bodyColor} showGround={false} />
            </Suspense>
            {modelLoading && (
              <div className="model-loading-overlay" role="status" aria-live="polite">
                <div className="model-loading-content">
                  <span>Loading 3D body model… {modelLoadProgress}%</span>
                  <div className="model-loading-track" role="progressbar" aria-label="3D model loading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={modelLoadProgress}>
                    <i style={{ width: `${modelLoadProgress}%` }} />
                  </div>
                </div>
              </div>
            )}
            <span className="sr-only">Interactive 3D body model. Enter height, weight, and optional measurements, then rotate and zoom to explore the body shape.</span>
            <div className="canvas-hint">Drag to rotate&nbsp; · &nbsp;Scroll to zoom</div>
            <label className="simulator-color-control" htmlFor="simulator-body-color">
              <span><b>MODEL COLOR</b><i style={{ backgroundColor: bodyColor }} aria-hidden="true" /></span>
              <input id="simulator-body-color" type="range" min="0" max="360" value={bodyHue} onChange={(event) => setBodyHue(Number(event.target.value))} aria-label="Body color" style={{ "--model-color": bodyColor } as CSSProperties} />
            </label>
          </div>
          <div className="stage-footer"><ViewControls /></div>
        </section>

        <aside className="side-panel"><BodyControls /></aside>
      </div>

      <footer className="disclaimer">
        <span>ⓘ</span> Results are based on a parametric 3D body model for visual reference only. They do not represent real body measurements, medical diagnosis, or health advice.
        <a href="https://github.com/xiangzhouVoV/BodyVisualizer" target="_blank" rel="noreferrer">Open Source on GitHub</a>
      </footer>
        </div>
      </div>
    </main>
  );
}
