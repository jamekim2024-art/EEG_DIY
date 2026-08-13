"""Artifact detection."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

import numpy as np

from backend.app.config import config


@dataclass
class ArtifactResult:
    detected: bool
    artifact_type: str  # none, lead_off, clipping, large_transient, movement, blink_candidate, unknown


def detect_artifacts(
    x: np.ndarray,
    lead_off: bool = False,
    clip_threshold: float = 3.8,
    rms_threshold: float = 1.5,
    transient_threshold: float = 2.0,
) -> ArtifactResult:
    if lead_off:
        return ArtifactResult(True, "lead_off")
    if x.size == 0:
        return ArtifactResult(True, "unknown")

    if np.max(np.abs(x)) >= clip_threshold:
        return ArtifactResult(True, "clipping")

    rms = float(np.sqrt(np.mean(x ** 2)))
    if rms > rms_threshold:
        return ArtifactResult(True, "movement")

    if float(np.ptp(x)) > transient_threshold:
        diff = np.diff(x)
        if diff.size and np.max(np.abs(diff)) > transient_threshold * 0.5:
            return ArtifactResult(True, "blink_candidate")

    return ArtifactResult(False, "none")


def artifact_to_dict(result: ArtifactResult) -> Dict:
    return {"detected": result.detected, "type": result.artifact_type}
