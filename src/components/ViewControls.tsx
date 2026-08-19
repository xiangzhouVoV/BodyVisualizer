import { useBodyStore } from "../stores/bodyStore";
import type { ViewMode } from "../types/body";

const views: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: "front", label: "Front", icon: "◎" },
  { id: "left", label: "Left", icon: "◐" },
  { id: "right", label: "Right", icon: "◑" },
  { id: "back", label: "Back", icon: "◌" },
  { id: "free", label: "Free", icon: "✧" },
];

export function ViewControls() {
  const viewMode = useBodyStore((state) => state.viewMode);
  const setViewMode = useBodyStore((state) => state.setViewMode);

  return (
    <div className="view-controls" aria-label="View controls">
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
