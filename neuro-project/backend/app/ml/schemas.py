"""ML schemas."""

from __future__ import annotations

from typing import Dict, List

FEATURE_COLUMNS = [
    "theta_relative",
    "alpha_relative",
    "beta_relative",
    "gamma_relative",
    "alpha_beta_ratio",
    "theta_beta_ratio",
    "rms",
    "std",
    "peak_to_peak",
    "dominant_frequency",
    "spectral_entropy",
]

CLASS_LABELS = ["EYES_OPEN", "EYES_CLOSED", "REST"]
