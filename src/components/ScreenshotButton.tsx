export function downloadCanvasImage(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = "body-visualizer.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function ScreenshotButton({ canvas }: { canvas: HTMLCanvasElement | null }) {
  return (
    <button className="screenshot-button" onClick={() => downloadCanvasImage(canvas)} disabled={!canvas}>
      <span>⇩</span> 导出图片
    </button>
  );
}
