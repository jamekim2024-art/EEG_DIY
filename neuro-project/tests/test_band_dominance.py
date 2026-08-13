import numpy as np

from backend.app.config import config
from backend.app.signal_processing.band_power import calculate_band_powers
from backend.app.signal_processing.filters import filter_zero_phase, preprocess_signal
from backend.app.signal_processing.psd import calculate_psd


def _sine(hz: float, seconds: float = 4.0, fs: float | None = None) -> np.ndarray:
    fs = fs or config.sampling_rate
    t = np.arange(0, seconds, 1 / fs)
    return np.sin(2 * np.pi * hz * t)


def _dominant_band(freqs, psd, band):
    lo, hi = band
    mask = (freqs >= lo) & (freqs < hi)
    return float(np.trapz(psd[mask], freqs[mask]))


def test_10hz_alpha_dominates():
    x = _sine(10.0)
    y = preprocess_signal(x, realtime=False)
    freqs, psd = calculate_psd(y)
    bands = calculate_band_powers(freqs, psd)
    assert bands["alpha"]["absolute"] > bands["beta"]["absolute"]
    assert bands["alpha"]["absolute"] > bands["gamma"]["absolute"]


def test_20hz_beta_dominates():
    x = _sine(20.0)
    y = preprocess_signal(x, realtime=False)
    freqs, psd = calculate_psd(y)
    bands = calculate_band_powers(freqs, psd)
    assert bands["beta"]["absolute"] > bands["alpha"]["absolute"]
    assert bands["beta"]["absolute"] > bands["gamma"]["absolute"]


def test_40hz_gamma_dominates():
    x = _sine(40.0)
    y = preprocess_signal(x, realtime=False)
    freqs, psd = calculate_psd(y)
    bands = calculate_band_powers(freqs, psd)
    assert bands["gamma"]["absolute"] > bands["alpha"]["absolute"]
    assert bands["gamma"]["absolute"] > bands["beta"]["absolute"]


def test_mixture_10_and_20():
    x = _sine(10.0) + _sine(20.0)
    y = preprocess_signal(x, realtime=False)
    freqs, psd = calculate_psd(y)
    bands = calculate_band_powers(freqs, psd)
    assert bands["alpha"]["absolute"] > 0
    assert bands["beta"]["absolute"] > 0
