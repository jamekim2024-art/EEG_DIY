"""Windowed feature extraction."""

from __future__ import annotations

from typing import Dict

import numpy as np

from backend.app.config import config
from backend.app.signal_processing.band_power import calculate_band_powers
from backend.app.signal_processing.filters import preprocess_signal
from backend.app.signal_processing.psd import calculate_psd


def window_sample_count() -> int:
    return int(config.window_seconds * config.sampling_rate)


def extract_features(x: np.ndarray, realtime: bool = True) -> Dict[str, float]:
    if x.size < window_sample_count() // 2:
        return {}

    y = preprocess_signal(x, realtime=realtime)
    freqs, psd = calculate_psd(y)
    bands = calculate_band_powers(freqs, psd)

    mean = float(np.mean(y))
    std = float(np.std(y))
    rms = float(np.sqrt(np.mean(y ** 2)))
    ptp = float(np.ptp(y))
    var = float(np.var(y))
    zcr = float(np.mean(np.diff(np.signbit(y).astype(int)) != 0))

    dom_freq = 0.0
    if psd.size > 0:
        dom_freq = float(freqs[int(np.argmax(psd))])

    psd_norm = psd / (np.sum(psd) + 1e-12)
    spec_entropy = float(-np.sum(psd_norm * np.log(psd_norm + 1e-12)))

    alpha_abs = bands["alpha"]["absolute"]
    beta_abs = bands["beta"]["absolute"]
    theta_abs = bands["theta"]["absolute"]

    return {
        "mean": mean,
        "std": std,
        "rms": rms,
        "peak_to_peak": ptp,
        "variance": var,
        "zero_crossing_rate": zcr,
        "theta_absolute": bands["theta"]["absolute"],
        "alpha_absolute": bands["alpha"]["absolute"],
        "beta_absolute": bands["beta"]["absolute"],
        "gamma_absolute": bands["gamma"]["absolute"],
        "theta_relative": bands["theta"]["relative"],
        "alpha_relative": bands["alpha"]["relative"],
        "beta_relative": bands["beta"]["relative"],
        "gamma_relative": bands["gamma"]["relative"],
        "alpha_beta_ratio": alpha_abs / (beta_abs + 1e-12),
        "theta_beta_ratio": theta_abs / (beta_abs + 1e-12),
        "dominant_frequency": dom_freq,
        "spectral_entropy": spec_entropy,
    }
