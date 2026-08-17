import { useState } from "react";

import { BodyCanvas } from "../components/BodyCanvas";
import { BodyControls } from "../components/BodyControls";
import { ScreenshotButton } from "../components/ScreenshotButton";
import { ViewControls } from "../components/ViewControls";
import { useBodyStore } from "../stores/bodyStore";

export function App() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const modelType = useBodyStore((state) => state.modelType);
  const heightCm = useBodyStore((state) => state.heightCm);
  const weightKg = useBodyStore((state) => state.weightKg);
  const measurements = useBodyStore((state) => state.measurements);
  const targetHeightCm = useBodyStore((state) => state.targetHeightCm);
  const targetWeightKg = useBodyStore((state) => state.targetWeightKg);
  const targetMeasurements = useBodyStore((state) => state.targetMeasurements);
  const activeProfile = useBodyStore((state) => state.activeProfile);
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
          <span className="brand-subtitle">体型模拟器</span>
        </div>
        <div className="topbar-actions">
          <span className="live-dot"><i />实时预览</span>
          <button className="reset-button" onClick={reset}>↻ <span>重置</span></button>
        </div>
      </header>

      <div className="workspace">
        <section className="stage-card" aria-label="3D 体型预览">
          <div className="stage-heading">
            <div><span className="section-kicker">3D PREVIEW · {activeProfile === "current" ? "CURRENT" : "TARGET"}</span><h1>{activeProfile === "current" ? "当前体型，" : "目标体型，"}<em>由你定义</em></h1></div>
            <span className="asset-status"><i />PARAMETRIC MODEL</span>
          </div>
          <div className="canvas-wrap"><BodyCanvas profile={{ modelType, ...previewProfile, viewMode }} viewMode={viewMode} onViewModeChange={setViewMode} onCanvasReady={setCanvas} /><div className="canvas-hint">拖动旋转&nbsp; · &nbsp;滚轮缩放</div></div>
          <div className="stage-footer"><ViewControls /><ScreenshotButton canvas={canvas} /></div>
        </section>

        <aside className="side-panel"><BodyControls /></aside>
      </div>

      <footer className="disclaimer"><span>ⓘ</span> 模拟结果基于参数化 3D 人体模型，仅用于体型可视化参考，不代表真实人体测量、医学诊断或健康建议。</footer>
    </main>
  );
}
