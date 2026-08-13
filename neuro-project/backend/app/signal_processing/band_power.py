"""Band power integration from PSD."""

from __future__ import annotations

from typing import Dict, Tuple

import numpy as np

from backend.app.config import config


def _band_power(freqs: np.ndarray, psd: np.ndarray, band: Tuple[float, float]) -> float:
    if freqs.size == 0:
        return 0.0
    lo, hi = band
    mask = (freqs >= lo) & (freqs < hi)
    if not np.any(mask):
        return 0.0
    return float(np.trapezoid(psd[mask], freqs[mask]))


def calculate_band_powers(
    freqs: np.ndarray, psd: np.ndarray
) -> Dict[str, Dict[str, float]]:
    bands = {
        "theta": config.theta_band,
        "alpha": config.alpha_band,
        "beta": config.beta_band,
        "gamma": config.gamma_band,
    }
    absolute = {k: _band_power(freqs, psd, v) for k, v in bands.items()}
    total = _band_power(freqs, psd, (config.spectrum_min_hz, config.spectrum_max_hz))
    if total <= 1e-12:
        relative = {k: 0.0 for k in absolute}
    else:
        relative = {k: v / total for k, v in absolute.items()}
    return {
        "theta": {"absolute": absolute["theta"], "relative": relative["theta"]},
        "alpha": {"absolute": absolute["alpha"], "relative": relative["alpha"]},
        "beta": {"absolute": absolute["beta"], "relative": relative["beta"]},
        "gamma": {"absolute": absolute["gamma"], "relative": relative["gamma"]},
        "total": {"absolute": total, "relative": 1.0 if total > 0 else 0.0},
    }
