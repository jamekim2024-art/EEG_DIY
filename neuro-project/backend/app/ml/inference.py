"""Real-time inference."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np

from backend.app.config import MODELS_DIR
from backend.app.ml.schemas import CLASS_LABELS, FEATURE_COLUMNS
from backend.app.signal_processing.artifacts import ArtifactResult, artifact_to_dict
from backend.app.signal_processing.band_power import calculate_band_powers
from backend.app.signal_processing.features import extract_features
from backend.app.signal_processing.filters import preprocess_signal
from backend.app.signal_processing.normalization import baseline_changes
from backend.app.signal_processing.psd import calculate_psd
from backend.app.signal_processing.signal_quality import compute_signal_quality


class InferenceEngine:
    def __init__(self) -> None:
        self.model = None
        self.metadata: Dict = {}
        self.baseline_bands: Dict[str, float] = {}
        self._load_model()

    def _load_model(self) -> None:
        path = MODELS_DIR / "model.joblib"
        meta = MODELS_DIR / "model_metadata.json"
        if path.exists():
            self.model = joblib.load(path)
        if meta.exists():
            self.metadata = json.loads(meta.read_text(encoding="utf-8"))

    def set_baseline_bands(self, bands: Dict) -> None:
        self.baseline_bands = {
            k: bands[k]["absolute"] for k in ("theta", "alpha", "beta", "gamma") if k in bands
        }

    def predict_window(
        self,
        x: np.ndarray,
        timestamp: int,
        artifact: ArtifactResult,
        lead_off: bool,
        effective_hz: float,
    ) -> Dict:
        filtered = preprocess_signal(x, realtime=True)
        freqs, psd = calculate_psd(filtered)
        bands = calculate_band_powers(freqs, psd)
        feats = extract_features(x, realtime=True)
        quality = compute_signal_quality(effective_hz, artifact, lead_off, len(x))

        prediction = "REST"
        confidence = 0.0
        probabilities = {c: 0.0 for c in CLASS_LABELS}

        if self.model and feats and not artifact.detected:
            vec = np.array([[feats.get(k, 0.0) for k in FEATURE_COLUMNS]], dtype=float)
            prediction = str(self.model.predict(vec)[0])
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(vec)[0]
                classes = list(self.model.classes_)
                for cls, p in zip(classes, probs):
                    probabilities[str(cls)] = float(p)
                confidence = float(max(probs))

        post_abs = {k: bands[k]["absolute"] for k in ("theta", "alpha", "beta", "gamma")}
        changes = baseline_changes(self.baseline_bands, post_abs) if self.baseline_bands else {}

        return {
            "timestamp": timestamp,
            "bands": bands,
            "baselineChange": changes,
            "prediction": prediction,
            "confidence": confidence,
            "probabilities": probabilities,
            "artifact": artifact_to_dict(artifact),
            "signalQuality": quality,
            "psd": {"freqs": freqs.tolist(), "values": psd.tolist()},
            "waveform": {
                "raw": x.tolist(),
                "filtered": filtered.tolist(),
            },
        }
