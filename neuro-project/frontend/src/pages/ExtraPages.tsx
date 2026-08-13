import { useEffect, useState } from "react";
import { apiGet } from "../hooks/useLiveStream";

export function DatasetPage() {
  const [sessions, setSessions] = useState<unknown[]>([]);
  useEffect(() => {
    apiGet("/sessions").then(setSessions);
  }, []);
  return (
    <div className="page">
      <h1>Dataset</h1>
      <p>Sessions recorded: {sessions.length}</p>
      <ul>
        {sessions.map((s: any) => (
          <li key={s.session_id}>{s.session_id} — {s.sample_count} samples — {s.experiment_protocol}</li>
        ))}
      </ul>
      <p className="hint">Export CSV from data/raw/ directory. No medical interpretations.</p>
    </div>
  );
}

export function ResearchPage() {
  return (
    <div className="page prose">
      <h1>Research Overview</h1>
      <h2>Research Question</h2>
      <p>Can a low-cost biopotential acquisition platform distinguish controlled physiological/experimental states using spectral features and machine learning?</p>
      <h2>Limitations</h2>
      <ul>
        <li>AD8232 + ADS1015 is not medically validated EEG hardware.</li>
        <li>Frequency bands are experimental biosignal spectral features.</li>
        <li>Gamma is sensitive to muscle and electrical noise.</li>
        <li>Not a medical device — educational prototype only.</li>
      </ul>
      <h2>Future Hardware</h2>
      <p>Architecture supports replacing SerialADS1015Source with ADS1299Source without rewriting the full stack.</p>
    </div>
  );
}
