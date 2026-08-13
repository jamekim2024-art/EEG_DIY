import { createPortal } from "react-dom";

export type PortDetail = {
  device: string;
  description: string;
  recommended?: boolean;
  esp32_candidate?: boolean;
  skip?: boolean;
};

type Props = {
  port: string;
  ports: PortDetail[];
  recommended?: string | null;
  open: boolean;
  uploading: boolean;
  error?: string | null;
  onPortChange: (port: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BootUploadModal({
  port,
  ports,
  recommended,
  open,
  uploading,
  error,
  onPortChange,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const selected = ports.find((p) => p.device === port);

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="boot-upload-title">
      <div className="modal modal-top">
        <h2 id="boot-upload-title">Upload firmware to ESP32</h2>

        <label className="field">
          <span>Upload port</span>
          <select value={port} onChange={(e) => onPortChange(e.target.value)} disabled={uploading}>
            {!ports.length && <option value={port}>{port || "No ports detected"}</option>}
            {ports.map((p) => (
              <option key={p.device} value={p.device}>
                {p.device} — {p.description}
                {p.recommended ? " ★ ESP32" : ""}
              </option>
            ))}
          </select>
          <small className="field-hint">
            {recommended
              ? `Recommended: ${recommended} (Silicon Labs CP210x). Do not use Intel COM4.`
              : "Plug in ESP32 via USB if no ports appear."}
          </small>
          {selected?.skip && (
            <small className="field-warn">This port is not the ESP32 — select the CP210x port instead.</small>
          )}
        </label>

        <p className="modal-lead">Before clicking upload:</p>
        <ol className="boot-steps">
          <li>Click <strong>Disconnect</strong> in the sidebar if connected.</li>
          <li>
            <strong>Hold BOOT</strong> on the ESP32 board.
          </li>
          <li>
            While holding BOOT, <strong>tap EN / RESET</strong> once.
          </li>
          <li>Keep holding BOOT, then click <strong>Start upload</strong>.</li>
          <li>Release BOOT when you see “Connecting….” (~2–3 s).</li>
        </ol>

        {error && <div className="modal-error">{error}</div>}

        {uploading ? (
          <p className="modal-status">Uploading to {port}… up to 2 minutes. Do not unplug USB.</p>
        ) : (
          <p className="modal-hint">Hold BOOT first, then start upload.</p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={uploading}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={onConfirm} disabled={uploading || !port}>
            {uploading ? "Uploading…" : "Start upload"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
