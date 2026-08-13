"""Model training and evaluation."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from backend.app.config import MODELS_DIR, config, ensure_data_dirs
from backend.app.ml.dataset import build_synthetic_dataset
from backend.app.ml.schemas import CLASS_LABELS, FEATURE_COLUMNS


def _build_models() -> Dict[str, Pipeline]:
    return {
        "logistic_regression": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=1000)),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", RandomForestClassifier(n_estimators=200, random_state=42)),
            ]
        ),
        "svc": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", SVC(probability=True, kernel="rbf")),
            ]
        ),
    }


def train_and_select() -> Dict:
    ensure_data_dirs()
    X, y, groups = build_synthetic_dataset()
    if len(np.unique(groups)) < 2:
        raise ValueError("Not enough groups for GroupKFold")

    gkf = GroupKFold(n_splits=min(3, len(np.unique(groups))))
    results = {}
    best_name = None
    best_score = -1.0
    best_model = None

    for name, model in _build_models().items():
        fold_scores = []
        for train_idx, test_idx in gkf.split(X, y, groups):
            model.fit(X[train_idx], y[train_idx])
            pred = model.predict(X[test_idx])
            fold_scores.append(balanced_accuracy_score(y[test_idx], pred))
        score = float(np.mean(fold_scores))
        model.fit(X, y)
        pred = model.predict(X)
        results[name] = {
            "balanced_accuracy_cv": score,
            "accuracy_train": float(accuracy_score(y, pred)),
            "f1_macro_train": float(f1_score(y, pred, average="macro", zero_division=0)),
            "confusion_matrix": confusion_matrix(y, pred, labels=CLASS_LABELS).tolist(),
            "classification_report": classification_report(y, pred, zero_division=0),
        }
        if score > best_score:
            best_score = score
            best_name = name
            best_model = model

    assert best_model is not None and best_name is not None
    model_path = MODELS_DIR / "model.joblib"
    meta_path = MODELS_DIR / "model_metadata.json"
    joblib.dump(best_model, model_path)
    metadata = {
        "model_type": best_name,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "feature_list": FEATURE_COLUMNS,
        "classes": CLASS_LABELS,
        "sampling_frequency": config.sampling_rate,
        "filter_config": {
            "highpass_hz": config.highpass_hz,
            "lowpass_hz": config.lowpass_hz,
            "mains_frequency": config.mains_frequency,
        },
        "window_duration": config.window_seconds,
        "validation_metrics": results[best_name],
        "all_models": results,
    }
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return {"selected_model": best_name, "model_path": str(model_path), "metadata": metadata}
