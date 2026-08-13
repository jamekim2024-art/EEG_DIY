"""Synthetic demo signal source."""

from __future__ import annotations

import math
import threading
import time
from typing import Optional

from backend.app.acquisition.base_source import BaseSignalSource
from backend.app.acquisition.parser import Sample
from backend.app.acquisition.sample_buffer import SampleBuffer
from backend.app.config import config


class DemoSyntheticSource(BaseSignalSource):
    """Software-only generator for pipeline demo (SIMULATION MODE)."""

    MODES = ("alpha", "beta", "gamma", "blink", "noise")

    def __init__(self, mode: str = "alpha", buffer: Optional[SampleBuffer] = None) -> None:
        self.mode = mode if mode in self.MODES else "alpha"
        self.buffer = buffer or SampleBuffer()
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._connected = False
        self._t0 = 0.0
        self._sample_idx = 0

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def ads_detected(self) -> bool:
        return True

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._connected = True
        self._t0 = time.time()
        self._sample_idx = 0
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)
        self._connected = False

    def read_sample(self) -> Optional[Sample]:
        recent = self.buffer.get_recent(0.01)
        return recent[-1] if recent else None

    def set_mode(self, mode: str) -> None:
        if mode in self.MODES:
            self.mode = mode

    def _signal(self, t: float) -> float:
        if self.mode == "alpha":
            return 0.5 * math.sin(2 * math.pi * 10.0 * t) + 1.65
        if self.mode == "beta":
            return 0.5 * math.sin(2 * math.pi * 20.0 * t) + 1.65
        if self.mode == "gamma":
            return 0.5 * math.sin(2 * math.pi * 40.0 * t) + 1.65
        if self.mode == "blink":
            pulse = 1.0 if (t % 3.0) < 0.15 else 0.0
            return 0.2 * math.sin(2 * math.pi * 8.0 * t) + pulse * 1.5 + 1.65
        return 0.15 * math.sin(2 * math.pi * 17.0 * t) + 0.05 * math.sin(2 * math.pi * 43.0 * t) + 1.65

    def _run(self) -> None:
        interval = 1.0 / config.sampling_rate
        next_t = time.time()
        while not self._stop.is_set():
            t = self._sample_idx / config.sampling_rate
            v = self._signal(t)
            raw = int((v / 4.096) * 2048)
            sample = Sample(
                timestamp_device_us=int(t * 1_000_000),
                raw_adc=raw,
                voltage=v,
                lead_off=False,
            )
            self.buffer.append(sample)
            self._sample_idx += 1
            next_t += interval
            sleep = next_t - time.time()
            if sleep > 0:
                time.sleep(sleep)
