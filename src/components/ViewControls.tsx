import { useBodyStore } from "../stores/bodyStore";
import type { ViewMode } from "../types/body";

const views: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: "front", label: "正面", icon: "◎" },
  { id: "left", label: "左侧", icon: "◐" },
  { id: "right", label: "右侧", icon: "◑" },
  { id: "back", label: "背面", icon: "◌" },
  { id: "free", label: "自由", icon: "✧" },
];

export function ViewControls() {
  const viewMode = useBodyStore((state) => state.viewMode);
  const setViewMode = useBodyStore((state) => state.setViewMode);

  return (
    <div className="view-controls" aria-label="视角控制">
      <span className="view-label">VIEW</span>
      <div className="view-buttons">
        {views.map((view) => (
          <button key={view.id} className={viewMode === view.id ? "active" : ""} onClick={() => setViewMode(view.id)}>
            <span>{view.icon}</span>{view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
