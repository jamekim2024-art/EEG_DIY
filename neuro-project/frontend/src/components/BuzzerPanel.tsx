import type { SystemStatus } from "../types";

type Props = {
  status: SystemStatus | null;
  simulation: boolean;
};

/** Mirrors ESP32 GPIO2 LED + GPIO4 buzzer (lead-off alarm). */
export function BuzzerPanel({ status, simulation }: Props) {
  const hardware = Boolean(status?.esp32_connected && !simulation);
  const leadOff = status?.lead_status === "disconnected" || status?.lead_status === "off";
  const buzzerOn = Boolean(status?.buzzer_active);
  const ledOn = Boolean(status?.led_active);

  if (simulation) {
    return (
      <div className="hardware-alerts card">
        <h3 className="card-title">Buzzer &amp; LED (hardware)</h3>
        <p className="muted">Demo mode — connect ESP32 to see live buzzer/LED state.</p>
        <p className="hint">
          On hardware: buzzer sounds when electrodes are off (lead-off). LED is on when leads are connected.
        </p>
      </div>
    );
  }

  if (!hardware) {
    return (
      <div className="hardware-alerts card">
        <h3 className="card-title">Buzzer &amp; LED (hardware)</h3>
        <p className="muted">Not connected — buzzer state appears after Connect hardware.</p>
      </div>
    );
  }

  return (
    <div className="hardware-alerts card">
      <h3 className="card-title">Buzzer &amp; LED (live from ESP32)</h3>
      <div className="alert-grid">
        <div className={`alert-tile buzzer-tile ${buzzerOn ? "active alarm" : "idle"}`}>
          <div className="alert-icon-wrap">
            <span className="alert-icon" aria-hidden>
              🔊
            </span>
            {buzzerOn && (
              <span className="sound-waves" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          <div className="alert-label">Buzzer</div>
          <div className="alert-state">{buzzerOn ? "SOUNDING" : "Silent"}</div>
          <p className="alert-detail">
            {buzzerOn
              ? "Lead-off detected — re-seat electrodes. Buzzer on GPIO4."
              : "Leads OK — buzzer is off."}
          </p>
        </div>

        <div className={`alert-tile led-tile ${ledOn ? "active ok" : "idle warn"}`}>
          <div className="alert-icon-wrap">
            <span className={`led-dot ${ledOn ? "on" : "off"}`} aria-hidden />
          </div>
          <div className="alert-label">Status LED</div>
          <div className="alert-state">{ledOn ? "ON" : "OFF"}</div>
          <p className="alert-detail">
            {ledOn ? "Good contact — GPIO2 LED lit." : "Lead-off — LED off while buzzer sounds."}
          </p>
        </div>
      </div>

      {leadOff && (
        <div className="lead-off-banner">
          <strong>Lead off</strong> — AD8232 LO+ / LO− triggered. Attach electrodes; buzzer stops when contact returns.
        </div>
      )}

      <p className="hint rule-hint">
        Rule: <strong>Buzzer ON + LED OFF</strong> = electrodes disconnected.{" "}
        <strong>Buzzer OFF + LED ON</strong> = ready to record.
      </p>
    </div>
  );
}
