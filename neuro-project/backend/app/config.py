"""Neuro-project application configuration."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
EXPERIMENTS_DIR = DATA_DIR / "experiments"
MODELS_DIR = DATA_DIR / "models"


@dataclass
class AppConfig:
    sampling_rate: float = 250.0
    serial_baud: int = 115200
    serial_port: str = "COM5"
    buffer_seconds: float = 30.0

    highpass_hz: float = 1.0
    lowpass_hz: float = 45.0
    mains_frequency: float = 50.0
    use_notch: bool = False

    theta_band: Tuple[float, float] = (4.0, 8.0)
    alpha_band: Tuple[float, float] = (8.0, 13.0)
    beta_band: Tuple[float, float] = (13.0, 30.0)
    gamma_band: Tuple[float, float] = (30.0, 45.0)
    spectrum_min_hz: float = 1.0
    spectrum_max_hz: float = 45.0

    window_seconds: float = 2.0
    window_overlap: float = 0.5

    baseline_seconds: float = 2.0
    stimulus_seconds: float = 5.0
    recovery_seconds: float = 3.0

    hardware_version: str = "AD8232+ADS1015+ESP32"
    ui_update_hz: float = 15.0
    analysis_update_hz: float = 1.5

    demo_mode: bool = False

    band_names: Tuple[str, ...] = field(
        default_factory=lambda: ("theta", "alpha", "beta", "gamma")
    )


def ensure_data_dirs() -> None:
    for d in (RAW_DIR, PROCESSED_DIR, EXPERIMENTS_DIR, MODELS_DIR):
        d.mkdir(parents=True, exist_ok=True)


config = AppConfig()
