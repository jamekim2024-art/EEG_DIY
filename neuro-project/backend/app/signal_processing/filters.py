"""Digital filters — causal (realtime) and zero-phase (offline)."""

from __future__ import annotations

import numpy as np
from scipy import signal

from backend.app.config import config


def design_bandpass_sos(
    low_hz: float | None = None,
    high_hz: float | None = None,
    fs: float | None = None,
    order: int = 4,
) -> np.ndarray:
    fs = fs or config.sampling_rate
    low = low_hz if low_hz is not None else config.highpass_hz
    high = high_hz if high_hz is not None else config.lowpass_hz
    return signal.butter(order, [low, high], btype="bandpass", fs=fs, output="sos")


def design_notch_sos(freq: float | None = None, fs: float | None = None, q: float = 30.0) -> np.ndarray:
    fs = fs or config.sampling_rate
    f0 = freq or config.mains_frequency
    b, a = signal.iirnotch(w0=f0, Q=q, fs=fs)
    return signal.tf2sos(b, a)


def filter_causal(x: np.ndarray, sos: np.ndarray | None = None) -> np.ndarray:
    """Causal filtering — no future data (real-time safe)."""
    if x.size == 0:
        return x
    sos = sos if sos is not None else design_bandpass_sos()
    return signal.sosfilt(sos, x)


def filter_zero_phase(x: np.ndarray, sos: np.ndarray | None = None) -> np.ndarray:
    """Zero-phase filtering — offline analysis only."""
    if x.size < 8:
        return x.copy()
    sos = sos if sos is not None else design_bandpass_sos()
    return signal.sosfiltfilt(sos, x)


def preprocess_signal(x: np.ndarray, realtime: bool = True) -> np.ndarray:
    if x.size == 0:
        return x
    y = x - np.mean(x)
    sos = design_bandpass_sos()
    if config.use_notch:
        # Apply notch then bandpass for realtime; offline could chain
        notch = design_notch_sos()
        if realtime:
            y = signal.sosfilt(notch, y)
            y = signal.sosfilt(sos, y)
        else:
            y = signal.sosfiltfilt(notch, y)
            y = signal.sosfiltfilt(sos, y)
    else:
        y = filter_causal(y, sos) if realtime else filter_zero_phase(y, sos)
    return y
