import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "../hooks/useLiveStream";
import { BootUploadModal, type PortDetail } from "./BootUploadModal";
import type { SystemStatus } from "../types";

const DEMO_MODES = [
  { id: "alpha", label: "Alpha (relaxed)", hint: "8–13 Hz dominant" },
  { id: "beta", label: "Beta (focused)", hint: "13–30 Hz dominant" },
  { id: "gamma", label: "Gamma (active)", hint: "30–45 Hz — noisy" },
  { id: "blink", label: "Blink artifacts", hint: "Simulated eye blinks" },
  { id: "noise", label: "Noise", hint: "Random interference" },
];

type Props = {
  serialPort: string;
  demoMode: string;
  status: SystemStatus | null;
  wsConnected: boolean;
  onPortChange: (port: string) => void;
  onDemoModeChange: (mode: string) => void;
  onMessage: (text: string, type?: "ok" | "err" | "info") => void;
};

type PortsResponse = {
  ports?: string[];
  details?: PortDetail[];
  recommended?: string | null;
};

export function ConnectionBar({
  serialPort,
  demoMode,
  status,
  wsConnected,
  onPortChange,
  onDemoModeChange,
  onMessage,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [portDetails, setPortDetails] = useState<PortDetail[]>([]);
  const [recommended, setRecommended] = useState<string | null>(null);
  const simulation = Boolean(status?.simulation_mode);
  const hardware = Boolean(status?.esp32_connected && !simulation);

  const onPortChangeRef = useRef(onPortChange);
  onPortChangeRef.current = onPortChange;
  const serialPortRef = useRef(serialPort);
  serialPortRef.current = serialPort;

  const refreshPorts = useCallback(async () => {
    try {
      const r = (await apiGet("/serial/ports")) as PortsResponse;
      setPortDetails(r.details ?? []);
      setRecommended(r.recommended ?? null);
      const rec = r.recommended?.toUpperCase();
      const current = serialPortRef.current.trim().toUpperCase();
      if (rec && rec !== current && (!current || current === "COM5")) {
        onPortChangeRef.current(rec);
      }
    } catch {
      setPortDetails([]);
    }
  }, []);

  useEffect(() => {
    refreshPorts();
    const t = setInterval(refreshPorts, 10000);
    return () => clearInterval(t);
  }, [refreshPorts]);

  useEffect(() => {
    if (uploadOpen) refreshPorts();
  }, [uploadOpen, refreshPorts]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onMessage(label, "ok");
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "Action failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function connectHardware() {
    const port = serialPort.trim().toUpperCase();
    if (!port) {
      onMessage("Select a COM port first (use COM5 for ESP32)", "err");
      return;
    }
    await run(`Connected to ${port}`, async () => {
      await apiPost("/disconnect").catch(() => undefined);
      await new Promise((r) => setTimeout(r, 500));
      await apiPost("/connect/serial", { port });
    });
  }

  function openUploadModal() {
    setUploadError(null);
    setUploadOpen(true);
  }

  async function startFirmwareUpload() {
    const port = serialPort.trim().toUpperCase();
    if (!port) {
      setUploadError("Select a COM port.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await apiPost("/disconnect").catch(() => undefined);
      const result = (await apiPost("/firmware/upload", { port }, 200000)) as { message?: string };
      onMessage(result.message ?? "Firmware uploaded", "ok");
      setUploadOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadError(msg);
      onMessage(msg, "err");
    } finally {
      setUploading(false);
    }
  }

  const portList = portDetails.length ? portDetails : availableFallback(serialPort);

  return (
    <>
      <BootUploadModal
        port={serialPort || recommended || "COM5"}
        ports={portList}
        recommended={recommended}
        open={uploadOpen}
        uploading={uploading}
        error={uploadError}
        onPortChange={(p) => onPortChange(p.toUpperCase())}
        onCancel={() => !uploading && setUploadOpen(false)}
        onConfirm={startFirmwareUpload}
      />

      <div className="card connection-card">
        <h3 className="card-title">Connection</h3>

        <div className="status-pills">
          <span className={`pill ${wsConnected ? "pill-ok" : "pill-warn"}`}>
            {wsConnected ? "Live stream" : "Reconnecting…"}
          </span>
          {simulation && <span className="pill pill-sim">Simulation</span>}
          {hardware && <span className="pill pill-ok">ESP32</span>}
          {status?.recording && <span className="pill pill-rec">Recording</span>}
          {status?.lead_status !== "connected" && status?.lead_status && (
          <span className="pill pill-warn">Lead off</span>
        )}
        {status?.buzzer_active && <span className="pill pill-buzzer">Buzzer ON</span>}
        </div>

        <label className="field">
          <span>Serial port {recommended && `(ESP32: ${recommended})`}</span>
          <select
            value={serialPort || recommended || ""}
            onChange={(e) => onPortChange(e.target.value.toUpperCase())}
            disabled={busy || uploading}
          >
            {!portList.length && <option value="">No USB ports detected</option>}
            {portList.map((p) => (
              <option key={p.device} value={p.device}>
                {p.device} — {p.description}
                {p.recommended ? " ★" : ""}
              </option>
            ))}
          </select>
          {recommended && (
            <small className="field-hint">Use {recommended} (CP210x). COM4 is Intel — not the ESP32.</small>
          )}
        </label>

        <div className="btn-row">
          <button className="btn primary" disabled={busy || uploading} onClick={connectHardware}>
            Connect hardware
          </button>
          <button
            className="btn ghost"
            disabled={busy || uploading}
            onClick={() => run("Disconnected", () => apiPost("/disconnect"))}
          >
            Disconnect
          </button>
        </div>

        <button className="btn secondary full" disabled={busy || uploading} onClick={openUploadModal}>
          Upload firmware to ESP32
        </button>

        <p className="tip">
          Upload uses <strong>{recommended || "COM5"}</strong>. Hold BOOT + tap EN before starting upload.
        </p>

        <label className="field">
          <span>Demo signal</span>
          <select value={demoMode} onChange={(e) => onDemoModeChange(e.target.value)} disabled={busy || uploading}>
            {DEMO_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <small className="field-hint">{DEMO_MODES.find((m) => m.id === demoMode)?.hint}</small>
        </label>

        <button
          className="btn secondary full"
          disabled={busy || uploading}
          onClick={() => run(`Demo: ${demoMode}`, () => apiPost("/connect/demo", { mode: demoMode }))}
        >
          Use demo instead (simulation only)
        </button>
      </div>
    </>
  );
}

function availableFallback(serialPort: string): PortDetail[] {
  if (!serialPort) return [];
  return [{ device: serialPort, description: "Manual entry" }];
}
