import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../hooks/useLiveStream";
import type { ModelMetadata, ModelMetrics, ModelsResponse } from "../types/model";

function fmtPct(v?: number) {
  if (v === undefined || Number.isNaN(v)) return "—";
  return `${Math.round(v * 1000) / 10}%`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function modelLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  if (!matrix.length) return null;
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div className="cm-wrap">
      <table className="cm-table">
        <thead>
          <tr>
            <th />
            {labels.map((l) => (
              <th key={l}>{l.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i] ?? i}>
              <th>{labels[i]?.replace(/_/g, " ") ?? `Class ${i}`}</th>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="cm-cell"
                  style={{ background: `rgba(59, 130, 246, ${0.12 + (cell / max) * 0.55})` }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Rows = actual class · Columns = predicted class</p>
    </div>
  );
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="metric-tile">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}

function ModelComparison({ allModels }: { allModels: Record<string, ModelMetrics> }) {
  const entries = Object.entries(allModels);
  if (!entries.length) return null;
  const best = entries.reduce((a, b) =>
    (b[1].balanced_accuracy_cv ?? 0) > (a[1].balanced_accuracy_cv ?? 0) ? b : a
  )[0];

  return (
    <div className="card">
      <h3 className="card-title">Model comparison</h3>
      <p className="hint">Selected by highest cross-validated balanced accuracy.</p>
      <div className="model-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Balanced acc (CV)</th>
              <th>Train accuracy</th>
              <th>F1 macro</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, m]) => (
              <tr key={name} className={name === best ? "row-selected" : undefined}>
                <td>
                  {modelLabel(name)}
                  {name === best && <span className="badge-best">Selected</span>}
                </td>
                <td>{fmtPct(m.balanced_accuracy_cv)}</td>
                <td>{fmtPct(m.accuracy_train)}</td>
                <td>{fmtPct(m.f1_macro_train)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ModelPage() {
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" | "info" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await apiGet("/models")) as ModelsResponse;
      setData(res);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Failed to load model", type: "err" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleTrain() {
    setTraining(true);
    setMessage(null);
    try {
      await apiPost("/models/train", {}, 120000);
      await load();
      setMessage({ text: "Model trained successfully", type: "ok" });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : "Training failed", type: "err" });
    } finally {
      setTraining(false);
    }
  }

  const meta: ModelMetadata | undefined = data?.metadata;
  const metrics = meta?.validation_metrics;
  const classes = meta?.classes ?? [];

  return (
    <div className="page model-page">
      <header className="page-header">
        <div>
          <h1>Model evaluation</h1>
          <p className="subtitle">Experimental state classifier — not diagnostic</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn ghost" onClick={load} disabled={loading || training}>
            Refresh
          </button>
          <button type="button" className="btn primary" onClick={handleTrain} disabled={training}>
            {training ? "Training…" : data?.trained ? "Retrain model" : "Train model"}
          </button>
        </div>
      </header>

      {message && (
        <div className={`banner banner-${message.type}`} role="status">
          {message.text}
          <button type="button" aria-label="Dismiss" onClick={() => setMessage(null)}>
            ×
          </button>
        </div>
      )}

      {loading && !data && <p className="muted center">Loading model info…</p>}

      {!loading && !data?.trained && (
        <div className="empty-state card">
          <h2>No trained model yet</h2>
          <p>
            Train on recorded sessions or the built-in synthetic bootstrap dataset. You need at least a few labeled
            windows from experiments (eyes open / closed) or manual recordings.
          </p>
          <ol>
            <li>
              Record data on the <Link to="/">Dashboard</Link> (Start recording or Eyes open / closed experiment).
            </li>
            <li>
              Check sessions on the <Link to="/dataset">Dataset</Link> page.
            </li>
            <li>Click <strong>Train model</strong> above — takes about a minute.</li>
          </ol>
          <button type="button" className="btn primary" onClick={handleTrain} disabled={training}>
            {training ? "Training…" : "Train model now"}
          </button>
        </div>
      )}

      {data?.trained && meta && (
        <div className="model-layout">
          <div className="model-main">
            <div className="card model-hero">
              <div className="model-hero-top">
                <div>
                  <span className="pill pill-ok">Trained</span>
                  <h2>{modelLabel(meta.model_type)}</h2>
                  <p className="hint">Last trained: {fmtDate(meta.training_date)}</p>
                </div>
                <div className="class-chips">
                  {classes.map((c) => (
                    <span key={c} className="class-chip">
                      {c.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="metric-grid">
                <MetricTile
                  label="Balanced accuracy (CV)"
                  value={fmtPct(metrics?.balanced_accuracy_cv)}
                  sub="Primary selection metric"
                />
                <MetricTile label="Train accuracy" value={fmtPct(metrics?.accuracy_train)} />
                <MetricTile label="F1 macro (train)" value={fmtPct(metrics?.f1_macro_train)} />
                <MetricTile label="Window" value={`${meta.window_duration}s`} sub={`${meta.sampling_frequency} Hz`} />
              </div>
            </div>

            {metrics?.confusion_matrix && classes.length > 0 && (
              <div className="card">
                <h3 className="card-title">Confusion matrix</h3>
                <ConfusionMatrix matrix={metrics.confusion_matrix} labels={classes} />
              </div>
            )}

            {meta.all_models && <ModelComparison allModels={meta.all_models} />}
          </div>

          <aside className="model-aside">
            <div className="card">
              <h3 className="card-title">Pipeline config</h3>
              <dl className="kv-list">
                <dt>High-pass</dt>
                <dd>{meta.filter_config.highpass_hz} Hz</dd>
                <dt>Low-pass</dt>
                <dd>{meta.filter_config.lowpass_hz} Hz</dd>
                <dt>Mains notch</dt>
                <dd>{meta.filter_config.mains_frequency} Hz</dd>
                <dt>Sample rate</dt>
                <dd>{meta.sampling_frequency} Hz</dd>
                <dt>Window</dt>
                <dd>{meta.window_duration} s</dd>
              </dl>
            </div>

            <div className="card">
              <h3 className="card-title">Features ({meta.feature_list.length})</h3>
              <div className="feature-chips">
                {meta.feature_list.map((f) => (
                  <span key={f} className="feature-chip">
                    {f.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="card tip-card">
              <h3 className="card-title">Live predictions</h3>
              <p className="hint">
                After training, open the <Link to="/">Dashboard</Link> AI classifier panel to see real-time experimental
                state guesses from spectral features.
              </p>
              <p className="safety-inline">Not validated for medical or diagnostic use.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
