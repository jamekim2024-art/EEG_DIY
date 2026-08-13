import { useCallback, useEffect, useRef, useState } from "react";
import { apiPost, useLiveStream } from "../hooks/useLiveStream";
import { useDashboardPrefs } from "../hooks/useDashboardPrefs";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { TestingGuide } from "../components/TestingGuide";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { ToastStack, type ToastItem } from "../components/Toast";
import { AiPanel, ArtifactPanel, BandCards, StatusPanel } from "../components/Panels";
import { BuzzerPanel } from "../components/BuzzerPanel";
import { LiveBiosignalChart, SerialPlotterPanel, SpectrumChart } from "../components/Charts";

export function DashboardPage() {
  const { status, data, wsConnected, hasSignal, backendOnline, checkBackend, apiBase } = useLiveStream();
  const { prefs, setPrefs, toggleSection, resetSections } = useDashboardPrefs();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [autoStarted, setAutoStarted] = useState(false);
  const toastId = useRef(0);
  const simulation = Boolean(status?.simulation_mode);

  const pushToast = useCallback((text: string, type: ToastItem["type"] = "info") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    if (!prefs.autoConnect || autoStarted) return;
    setAutoStarted(true);
    if (!prefs.hardwareMode) return;
    apiPost("/connect/serial", { port: prefs.serialPort })
      .then(() => pushToast(`Connected to ${prefs.serialPort} — real hardware`, "ok"))
      .catch((e) =>
        pushToast(
          e instanceof Error ? e.message : "Connect hardware manually (COM5, electrodes on subject)",
          "err"
        )
      );
  }, [prefs.autoConnect, prefs.hardwareMode, prefs.serialPort, autoStarted, pushToast]);

  return (
    <div className="dashboard">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      <header className="dash-header">
        <div>
          <h1>Neuro Biosignal Dashboard</h1>
          <p className="subtitle">Live brain-wave visualization · educational prototype only</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => setPrefs({ sidebarOpen: !prefs.sidebarOpen })}
            title="Toggle settings sidebar"
          >
            {prefs.sidebarOpen ? "Hide settings" : "Show settings"}
          </button>
        </div>
      </header>

      {!hasSignal && (
        <div className="welcome-banner">
          <strong>Live subject mode.</strong> Stick electrodes on the subject, pick <strong>COM5</strong>, click{" "}
          <strong>Connect hardware</strong>. No simulation unless you choose demo below.
        </div>
      )}

      {backendOnline === false && (
        <div className="backend-offline-banner">
          <strong>Backend offline</strong> — start the server, then refresh this page:
          <code>cd neuro-project && npm start</code>
          <button type="button" className="btn secondary" onClick={() => checkBackend()}>
            Retry connection
          </button>
          <small className="hint">
            Open dashboard at <strong>http://localhost:5173</strong> (not the 8000 URL). API: {apiBase}
          </small>
        </div>
      )}

      <div className={`dash-layout ${prefs.sidebarOpen ? "" : "sidebar-hidden"}`}>
        <DashboardSidebar
          prefs={prefs}
          status={status}
          wsConnected={wsConnected}
          backendOnline={backendOnline}
          onPrefsChange={setPrefs}
          onToggleSection={toggleSection}
          onResetSections={resetSections}
          onMessage={pushToast}
        />

        <main className="dash-main">
          <TestingGuide />

          {prefs.sections.status && (
            <CollapsibleSection title="System status" subtitle="Hardware, sampling, and signal quality" defaultOpen>
              <BuzzerPanel status={status} simulation={simulation} />
              <StatusPanel status={status as Record<string, unknown>} simulation={simulation} signalQuality={data.signalQuality} />
            </CollapsibleSection>
          )}

          {prefs.sections.waveform && (
            <CollapsibleSection
              title="Live brain-wave trace"
              subtitle={`${prefs.waveMode} signal · ~8 s rolling window`}
              defaultOpen
            >
              <LiveBiosignalChart data={data} mode={prefs.waveMode} height={prefs.chartHeight} onTryDemo={() => apiPost("/connect/demo", { mode: prefs.demoMode }).then(() => pushToast("Demo mode on", "ok"))} />
            </CollapsibleSection>
          )}

          {prefs.sections.plotter && (
            <CollapsibleSection title="Serial plotter view" subtitle="Same style as Arduino IDE plotter" defaultOpen={false}>
              <SerialPlotterPanel data={data} height={Math.max(160, prefs.chartHeight - 80)} />
            </CollapsibleSection>
          )}

          {prefs.sections.bands && (
            <CollapsibleSection title="Frequency bands" subtitle="Relative power — theta, alpha, beta, gamma">
              <BandCards data={data} />
            </CollapsibleSection>
          )}

          {prefs.sections.spectrum && (
            <CollapsibleSection title="Power spectrum" subtitle="Welch PSD 1–45 Hz" defaultOpen={false}>
              <SpectrumChart data={data} height={Math.max(180, prefs.chartHeight - 60)} />
            </CollapsibleSection>
          )}

          {prefs.sections.ai && (
            <CollapsibleSection title="AI classifier" subtitle="Experimental state guess" defaultOpen={false}>
              <AiPanel data={data} />
            </CollapsibleSection>
          )}

          {prefs.sections.artifacts && (
            <CollapsibleSection title="Artifacts" subtitle="Lead-off, blinks, clipping" defaultOpen={false}>
              <ArtifactPanel data={data} />
            </CollapsibleSection>
          )}

          {prefs.sections.experiment && (
            <CollapsibleSection title="Experiment" subtitle="Guided eyes open / closed protocol" defaultOpen={false}>
              <ExperimentPanel status={status} />
            </CollapsibleSection>
          )}
        </main>
      </div>

      <footer className="dash-footer">
        Not a medical device. For learning and research exploration only.
      </footer>
    </div>
  );
}

function ExperimentPanel({ status }: { status: Record<string, unknown> | null }) {
  const exp = (status?.experiment as Record<string, unknown>) ?? {};
  const cur = exp.current as Record<string, unknown> | null;
  const active = Boolean(exp.protocol);

  return (
    <div className="experiment-panel">
      {!active ? (
        <p className="muted">No experiment running. Start one from the sidebar under Actions.</p>
      ) : (
        <>
          <div className="experiment-instruction">{cur ? String(cur.instruction) : "Follow the protocol…"}</div>
          <div className="experiment-meta">
            <span>Protocol: {String(exp.protocol)}</span>
            <span>Trial {cur ? `${cur.trial_number} / ${cur.total_trials}` : "—"}</span>
            <span>{cur ? `${Number(cur.remaining_seconds).toFixed(0)}s left` : ""}</span>
          </div>
        </>
      )}
    </div>
  );
}
