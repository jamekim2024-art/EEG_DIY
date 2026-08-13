"""Thread-safe rolling sample buffer."""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Deque, List, Optional

import numpy as np

from backend.app.acquisition.parser import Sample
from backend.app.config import config


class SampleBuffer:
    def __init__(self, max_seconds: Optional[float] = None) -> None:
        self.max_samples = int((max_seconds or config.buffer_seconds) * config.sampling_rate)
        self._lock = threading.Lock()
        self._samples: Deque[Sample] = deque(maxlen=self.max_samples)
        self._last_host_ts: Optional[float] = None

    def append(self, sample: Sample) -> None:
        sample.timestamp_host = time.time()
        with self._lock:
            self._last_host_ts = sample.timestamp_host
            self._samples.append(sample)

    def extend(self, samples: List[Sample]) -> None:
        with self._lock:
            for s in samples:
                if s.timestamp_host is None:
                    s.timestamp_host = time.time()
                self._last_host_ts = s.timestamp_host
                self._samples.append(s)

    def size(self) -> int:
        with self._lock:
            return len(self._samples)

    def get_recent(self, seconds: float) -> List[Sample]:
        n = int(seconds * config.sampling_rate)
        with self._lock:
            items = list(self._samples)[-n:]
        return items

    def get_voltage_array(self, seconds: float) -> np.ndarray:
        samples = self.get_recent(seconds)
        if not samples:
            return np.array([], dtype=float)
        return np.array([s.voltage for s in samples], dtype=float)

    def get_raw_array(self, seconds: float) -> np.ndarray:
        samples = self.get_recent(seconds)
        if not samples:
            return np.array([], dtype=float)
        return np.array([s.raw_adc for s in samples], dtype=float)

    def last_lead_off(self) -> bool:
        with self._lock:
            if not self._samples:
                return True
            return self._samples[-1].lead_off

    def effective_rate_hz(self, window_seconds: float = 5.0) -> float:
        samples = self.get_recent(window_seconds)
        if len(samples) < 2:
            return 0.0
        t0 = samples[0].timestamp_host or 0.0
        t1 = samples[-1].timestamp_host or 0.0
        dt = t1 - t0
        if dt <= 0:
            return 0.0
        return (len(samples) - 1) / dt
