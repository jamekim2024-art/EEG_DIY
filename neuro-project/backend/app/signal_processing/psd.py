"""Welch PSD calculation."""

from __future__ import annotations

import numpy as np
from scipy import signal

from backend.app.config import config


def calculate_psd(
    x: np.ndarray,
    fs: float | None = None,
    nperseg: int | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    fs = fs or config.sampling_rate
    if x.size < 16:
        return np.array([]), np.array([])
    if nperseg is None:
        nperseg = min(len(x), int(fs))
    freqs, psd = signal.welch(x, fs=fs, nperseg=nperseg)
    mask = (freqs >= config.spectrum_min_hz) & (freqs <= config.spectrum_max_hz)
    return freqs[mask], psd[mask]
