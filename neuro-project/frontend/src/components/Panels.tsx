import type { LivePayload } from "../types";

const BANDS = [
  { key: "theta", label: "Theta", range: "4–8 Hz", color: "#818cf8" },
  { key: "alpha", label: "Alpha", range: "8–13 Hz", color: "#38bdf8" },
  { key: "beta", label: "Beta", range: "13–30 Hz", color: "#34d399" },
  { key: "gamma", label: "Gamma", range: "30–45 Hz", color: "#fbbf24", warn: true },
];

export function BandCards({ data }: { data: LivePayload }) {
  const hasData = Boolean(data.bands && Object.keys(data.bands).length);
  if (!hasData) {
    return <p className="muted center">Waiting for band power data…</p>;
  }

  return (
    <div className="band-grid">
      {BANDS.map((b) => {
        const band = data.bands?.[b.key];
        const rel = band ? Math.round(band.relative * 100) : 0;
        const change = data.baselineChange?.[b.key];
        return (
          <div className="band-card" key={b.key} style={{ borderTopColor: b.color }}>
            <div className="band-top">
              <span className="band-title">{b.label}</span>
              <span className="band-range">{b.range}</span>
            </div>
            <div className="band-value">{rel}%</div>
            <div className="band-bar">
              <div className="band-bar-fill" style={{ width: `${Math.min(100, rel)}%`, background: b.color }} />
            </div>
            <div className="band-sub">
              Absolute: {band?.absolute?.toFixed(3) ?? "—"}
              {change !== undefined && (
                <span className={change >= 0 ? "up" : "down"}>
                  {" "}
                  · {change >= 0 ? "+" : ""}
                  {change.toFixed(0)}% vs baseline
                </span>
              )}
            </div>
            {b.warn && <div className="warn">High frequency — may include muscle noise</div>}
          </div>
        );
      })}
    </div>
  );
}

export function StatusPanel({
  status,
  simulation,
  signalQuality,
}: {
  status: Record<string, unknown> | null;
  simulation: boolean;
  signalQuality?: number;
}) {
  if (!status) return <p className="muted">Loading status…</p>;

  const quality = signalQuality ?? 0;
  const qualityLabel = quality >= 70 ? "Good" : quality >= 40 ? "Fair" : "Poor";

  const rows = [
    { label: "ESP32", ok: Boolean(status.esp32_connected), text: status.esp32_connected ? "Connected" : "Not connected" },
    { label: "ADS1015", ok: Boolean(status.ads1015_detected), text: status.ads1015_detected ? "Detected" : "Not detected" },
    { label: "Sample rate", ok: true, text: `~${(status.sample_rate_hz as number) ?? 0} Hz` },
    { label: "Lead", ok: status.lead_status !== "off", text: String(status.lead_status ?? "—") },
    { label: "Quality", ok: quality >= 40, text: `${quality} (${qualityLabel})` },
  ];

  return (
    <div className="status-grid">
      {simulation && <div className="sim-badge">Simulation mode — synthetic data</div>}
      {rows.map((r) => (
        <div className={`status-item ${r.ok ? "ok-item" : "warn-item"}`} key={r.label}>
          <span className="status-label">{r.label}</span>
          <span className="status-value">{r.text}</span>
        </div>
      ))}
      {!status.ads1015_detected && Boolean(status.esp32_connected) && !simulation && (
        <div className="ads-help">
          <strong>ADS1015 not detected</strong> — check wiring:
          <ul>
            <li>VDD → ESP32 <strong>3.3V</strong> (not 5V)</li>
            <li>GND → ESP32 GND (common with AD8232 + LM358)</li>
            <li>SDA → GPIO<strong>21</strong>, SCL → GPIO<strong>22</strong></li>
            <li>ADDR → <strong>GND</strong> (address 0x48)</li>
            <li>A0 → LM358 pin 1</li>
          </ul>
          <p className="hint">See neuro-project/docs/ADS1015_WIRING.md — then re-upload firmware.</p>
        </div>
      )}
      <p className="safety">Educational research prototype. Not a medical device.</p>
    </div>
  );
}

export function AiPanel({ data }: { data: LivePayload }) {
  const probs = data.probabilities ?? {};
  const entries = Object.entries(probs);
  const pred = data.prediction?.replace(/_/g, " ") ?? "—";
  const conf = Math.round((data.confidence ?? 0) * 100);

  return (
    <div className="ai-panel">
      <div className="prediction">{pred}</div>
      <div className="conf-bar-wrap">
        <div className="conf-bar" style={{ width: `${conf}%` }} />
      </div>
      <p className="conf-label">Confidence: {conf}%</p>
      {entries.length > 0 && (
        <ul className="prob-list">
          {entries.map(([k, v]) => (
            <li key={k}>
              <span>{k.replace(/_/g, " ")}</span>
              <span>{Math.round(v * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
      {!entries.length && <p className="muted">Train a model from the sidebar to see predictions.</p>}
    </div>
  );
}

export function ArtifactPanel({ data }: { data: LivePayload }) {
  const a = data.artifact;
  const items = [
    { label: "Status", value: a?.detected ? `Detected: ${a.type}` : "Clean", warn: Boolean(a?.detected) },
    { label: "Lead off", value: a?.type === "lead_off" ? "Yes" : "No", warn: a?.type === "lead_off" },
    { label: "Blink", value: a?.type === "blink_candidate" ? "Possible" : "No", warn: a?.type === "blink_candidate" },
    { label: "Clipping", value: a?.type === "clipping" ? "Yes" : "No", warn: a?.type === "clipping" },
  ];

  return (
    <ul className="artifact-list">
      {items.map((i) => (
        <li key={i.label} className={i.warn ? "warn-item" : ""}>
          <span>{i.label}</span>
          <span>{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
