import type { SectionKey, DashboardPrefs } from "../hooks/useDashboardPrefs";
import { apiPost } from "../hooks/useLiveStream";
import { ConnectionBar } from "./ConnectionBar";
import type { SystemStatus } from "../types";

const SECTION_LABELS: { key: SectionKey; label: string }[] = [
  { key: "status", label: "System status" },
  { key: "waveform", label: "Live waveform" },
  { key: "plotter", label: "Serial plotter view" },
  { key: "bands", label: "Frequency bands" },
  { key: "spectrum", label: "Spectrum chart" },
  { key: "ai", label: "AI classifier" },
  { key: "artifacts", label: "Artifacts" },
  { key: "experiment", label: "Experiment" },
];

type Props = {
  prefs: DashboardPrefs;
  status: SystemStatus | null;
  wsConnected: boolean;
  backendOnline: boolean | null;
  onPrefsChange: (patch: Partial<DashboardPrefs>) => void;
  onToggleSection: (key: SectionKey) => void;
  onResetSections: () => void;
  onMessage: (text: string, type?: "ok" | "err" | "info") => void;
};

export function DashboardSidebar({
  prefs,
  status,
  wsConnected,
  backendOnline,
  onPrefsChange,
  onToggleSection,
  onResetSections,
  onMessage,
}: Props) {
  async function safeAction(label: string, path: string, body?: unknown) {
    if (backendOnline === false) {
      onMessage("Backend offline — run npm start in neuro-project folder", "err");
      return;
    }
    try {
      await apiPost(path, body);
      onMessage(label, "ok");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Failed", "err");
    }
  }

  const actionsDisabled = backendOnline === false;

  return (
    <aside className={`dash-sidebar ${prefs.sidebarOpen ? "open" : "closed"}`}>
      <ConnectionBar
        serialPort={prefs.serialPort}
        demoMode={prefs.demoMode}
        status={status}
        wsConnected={wsConnected}
        onPortChange={(serialPort) => onPrefsChange({ serialPort })}
        onDemoModeChange={(demoMode) => onPrefsChange({ demoMode })}
        onMessage={onMessage}
      />

      <div className="card">
        <h3 className="card-title">Display</h3>
        <label className="field">
          <span>Waveform source</span>
          <select
            value={prefs.waveMode}
            onChange={(e) => onPrefsChange({ waveMode: e.target.value as "raw" | "filtered" })}
          >
            <option value="filtered">Filtered (recommended)</option>
            <option value="raw">Raw ADC</option>
          </select>
        </label>
        <label className="field">
          <span>Chart height — {prefs.chartHeight}px</span>
          <input
            type="range"
            min={180}
            max={480}
            step={20}
            value={prefs.chartHeight}
            onChange={(e) => onPrefsChange({ chartHeight: Number(e.target.value) })}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={prefs.hardwareMode}
            onChange={(e) => onPrefsChange({ hardwareMode: e.target.checked })}
          />
          Live subject mode (real electrodes, no auto-demo)
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={prefs.autoConnect}
            onChange={(e) => onPrefsChange({ autoConnect: e.target.checked })}
          />
          Auto-connect on load
        </label>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h3 className="card-title">Visible panels</h3>
          <button type="button" className="btn-link" onClick={onResetSections}>
            Reset
          </button>
        </div>
        <div className="check-grid">
          {SECTION_LABELS.map(({ key, label }) => (
            <label key={key} className="check-row">
              <input type="checkbox" checked={prefs.sections[key]} onChange={() => onToggleSection(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Actions</h3>
        <div className="btn-stack">
          <button className="btn secondary" disabled={actionsDisabled} onClick={() => safeAction("Recording started", "/recording/start", {})}>
            Start recording
          </button>
          <button className="btn ghost" disabled={actionsDisabled} onClick={() => safeAction("Recording stopped", "/recording/stop")}>
            Stop recording
          </button>
          <button
            className="btn secondary"
            disabled={actionsDisabled}
            onClick={() => safeAction("Experiment started", "/experiment/start", { protocol: "eyes_open_vs_closed" })}
          >
            Eyes open / closed
          </button>
          <button className="btn ghost" disabled={actionsDisabled} onClick={() => safeAction("Experiment stopped", "/experiment/stop")}>
            Stop experiment
          </button>
          <button className="btn secondary" disabled={actionsDisabled} onClick={() => safeAction("Training started (may take a minute)", "/models/train", {})}>
            Train model
          </button>
        </div>
      </div>
    </aside>
  );
}
