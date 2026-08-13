"""Model evaluation utilities."""

from __future__ import annotations

import json
from pathlib import Path

from backend.app.config import MODELS_DIR


def load_metrics() -> dict:
    meta_path = MODELS_DIR / "model_metadata.json"
    if not meta_path.exists():
        return {"trained": False}
    return {"trained": True, "metadata": json.loads(meta_path.read_text(encoding="utf-8"))}
