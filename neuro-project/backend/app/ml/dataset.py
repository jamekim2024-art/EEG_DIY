"""Dataset loading for ML."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

from backend.app.config import RAW_DIR
from backend.app.ml.schemas import FEATURE_COLUMNS
from backend.app.signal_processing.features import extract_features


def load_session_windows(path: Path, label: str, session_id: str, trial_id: str) -> List[Dict]:
    voltages: List[float] = []
    rows: List[Dict] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            voltages.append(float(row["voltage"]))
    x = np.array(voltages, dtype=float)
    win = 500
    step = 250
    for start in range(0, max(0, len(x) - win + 1), step):
        chunk = x[start : start + win]
        feats = extract_features(chunk, realtime=False)
        if not feats:
            continue
        rec = {k: feats.get(k, 0.0) for k in FEATURE_COLUMNS}
        rec["label"] = label
        rec["session_id"] = session_id
        rec["trial_id"] = trial_id
        rows.append(rec)
    return rows


def build_synthetic_dataset() -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Build dataset from synthetic sine generators for bootstrap training."""
    from backend.app.acquisition.demo_source import DemoSyntheticSource

    rows: List[Dict] = []
    mapping = {"alpha": "EYES_CLOSED", "beta": "EYES_OPEN", "noise": "REST"}
    for mode, label in mapping.items():
        src = DemoSyntheticSource(mode=mode)
        src.start()
        import time

        time.sleep(3.0)
        x = src.buffer.get_voltage_array(3.0)
        src.stop()
        win = 500
        step = 250
        for start in range(0, max(0, len(x) - win + 1), step):
            chunk = x[start : start + win]
            feats = extract_features(chunk, realtime=False)
            if not feats:
                continue
            rec = {k: feats.get(k, 0.0) for k in FEATURE_COLUMNS}
            rec["label"] = label
            rec["session_id"] = f"sim_{mode}"
            rec["trial_id"] = f"sim_{mode}_{start}"
            rows.append(rec)

    X = np.array([[r[k] for k in FEATURE_COLUMNS] for r in rows], dtype=float)
    y = np.array([r["label"] for r in rows])
    groups = np.array([r["trial_id"] for r in rows])
    return X, y, groups
