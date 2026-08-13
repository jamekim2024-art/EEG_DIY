"""Central runtime orchestrating acquisition, processing, and inference."""

from __future__ import annotations

import threading
import time
from typing import Dict, Optional

import numpy as np

from backend.app.acquisition.base_source import BaseSignalSource
from backend.app.acquisition.demo_source import DemoSyntheticSource
from backend.app.acquisition.sample_buffer import SampleBuffer
from backend.app.acquisition.serial_reader import SerialADS1015Source
from backend.app.config import config
from backend.app.experiments.manager import ExperimentManager
from backend.app.firmware_upload import FirmwareUploadError, resolve_upload_port
from backend.app.ml.inference import InferenceEngine
from backend.app.ml.train import train_and_select
from backend.app.signal_processing.artifacts import detect_artifacts
from backend.app.storage.recordings import RecordingStore


class NeuroRuntime:
    def __init__(self) -> None:
        self.buffer = SampleBuffer()
        self.recording = RecordingStore()
        self.experiment = ExperimentManager()
        self.inference = InferenceEngine()
        self.source: Optional[BaseSignalSource] = None
        self.latest_payload: Dict = {}
        self._lock = threading.Lock()
        self._analysis_thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self.demo_mode = False

    def connect_serial(self, port: Optional[str] = None) -> None:
        try:
            chosen = resolve_upload_port(port or config.serial_port)
        except FirmwareUploadError as exc:
            raise ValueError(str(exc)) from exc
        self.disconnect()
        self.demo_mode = False
        config.serial_port = chosen
        source = SerialADS1015Source(
            port=config.serial_port,
            buffer=self.buffer,
            on_sample=self.on_sample_for_recording,
        )
        try:
            source.start()
        except Exception:
            try:
                source.stop()
            except Exception:
                pass
            raise
        self.source = source
        self._start_analysis()

    def connect_demo(self, mode: str = "alpha") -> None:
        self.disconnect()
        self.demo_mode = True
        self.source = DemoSyntheticSource(mode=mode, buffer=self.buffer)
        self.source.start()
        self._start_analysis()

    def disconnect(self) -> None:
        self._stop.set()
        if self._analysis_thread and self._analysis_thread.is_alive():
            self._analysis_thread.join(timeout=3.0)
        self._analysis_thread = None
        if self.source:
            try:
                self.source.stop()
            except Exception:
                pass
        self.source = None
        self._stop.clear()

    def _start_analysis(self) -> None:
        if self._analysis_thread and self._analysis_thread.is_alive():
            self._stop.set()
            self._analysis_thread.join(timeout=3.0)
        self._analysis_thread = None
        self._stop.clear()
        self._analysis_thread = threading.Thread(target=self._analysis_loop, daemon=True)
        self._analysis_thread.start()

    def _analysis_loop(self) -> None:
        interval = 1.0 / config.analysis_update_hz
        while not self._stop.is_set():
            try:
                seconds = max(config.window_seconds, 5.0)
                x = self.buffer.get_voltage_array(seconds)
                lead_off = self.buffer.last_lead_off()
                eff = self.buffer.effective_rate_hz()
                artifact = detect_artifacts(x, lead_off=lead_off)
                ts = int(time.time() * 1_000_000)
                payload = self.inference.predict_window(x, ts, artifact, lead_off, eff)
                payload["status"] = self.get_status()
                with self._lock:
                    self.latest_payload = payload
            except Exception:
                pass
            time.sleep(interval)

    def get_status(self) -> Dict:
        src = self.source
        connected = bool(src and src.connected)
        ads = bool(src and src.ads_detected) if src else False
        eff = self.buffer.effective_rate_hz()
        stats = getattr(src, "stats", None)
        return {
            "esp32_connected": connected and not self.demo_mode,
            "ads1015_detected": ads,
            "sample_rate_hz": round(eff, 1),
            "lead_status": "disconnected" if self.buffer.last_lead_off() else "connected",
            "buzzer_active": self.buffer.last_lead_off() and connected and not self.demo_mode,
            "led_active": (not self.buffer.last_lead_off()) and connected and not self.demo_mode,
            "demo_mode": self.demo_mode,
            "simulation_mode": self.demo_mode,
            "recording": self.recording.active,
            "experiment": self.experiment.get_state(),
            "received_samples": getattr(stats, "received", 0) if stats else self.buffer.size(),
            "malformed_packets": getattr(stats, "malformed", 0) if stats else 0,
            "effective_hz": eff,
        }

    def get_fresh_waveform(self, seconds: float = 8.0) -> dict:
        """Return latest raw/filtered voltage for high-rate UI streaming."""
        from backend.app.signal_processing.filters import preprocess_signal

        raw = self.buffer.get_voltage_array(seconds)
        if raw.size == 0:
            return {"raw": [], "filtered": [], "time_s": [], "sample_rate": config.sampling_rate}
        filtered = preprocess_signal(raw, realtime=True)
        n = raw.size
        fs = config.sampling_rate
        # Time axis: 0 = oldest sample, (n-1)/fs ≈ newest
        time_s = [i / fs for i in range(n)]
        return {
            "raw": raw.tolist(),
            "filtered": filtered.tolist(),
            "time_s": time_s,
            "sample_rate": fs,
        }

    def get_live_payload(self) -> Dict:
        with self._lock:
            payload = dict(self.latest_payload)
        payload["waveform"] = self.get_fresh_waveform(8.0)
        return payload

    def on_sample_for_recording(self, sample) -> None:
        if self.recording.active:
            self.recording.write_sample(sample)


runtime = NeuroRuntime()
