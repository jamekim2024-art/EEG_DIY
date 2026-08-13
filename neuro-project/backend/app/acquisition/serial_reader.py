"""Pyserial reader for ESP32 ADS1015 stream."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Callable, Optional

import serial

from backend.app.acquisition.base_source import BaseSignalSource
from backend.app.acquisition.parser import Sample, parse_line
from backend.app.acquisition.sample_buffer import SampleBuffer
from backend.app.config import config


@dataclass
class SerialStats:
    received: int = 0
    malformed: int = 0
    plotter_lines: int = 0
    last_device_ts: int = 0
    connected: bool = False
    ads_detected: bool = False
    effective_hz: float = 0.0
    dropped_estimate: int = 0


class SerialADS1015Source(BaseSignalSource):
    def __init__(
        self,
        port: Optional[str] = None,
        baud: Optional[int] = None,
        buffer: Optional[SampleBuffer] = None,
        on_sample: Optional[Callable[[Sample], None]] = None,
    ) -> None:
        self.port = port or config.serial_port
        self.baud = baud or config.serial_baud
        self.buffer = buffer or SampleBuffer()
        self.on_sample = on_sample
        self.stats = SerialStats()
        self._ser: Optional[serial.Serial] = None
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._last_ts: Optional[int] = None

    @property
    def connected(self) -> bool:
        return self.stats.connected

    @property
    def ads_detected(self) -> bool:
        return self.stats.ads_detected

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        try:
            self._ser = serial.Serial(self.port, self.baud, timeout=0.1)
        except (serial.SerialException, OSError, PermissionError) as exc:
            self.stats.connected = False
            self._ser = None
            if isinstance(exc, serial.SerialException):
                raise self._friendly_serial_error(exc) from exc
            raise self._friendly_serial_error(
                serial.SerialException(str(exc))
            ) from exc
        self.stats.connected = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    @staticmethod
    def _friendly_serial_error(exc: serial.SerialException) -> serial.SerialException:
        msg = str(exc)
        port_hint = msg.split("'")[1] if "'" in msg else "the port"
        if "Access is denied" in msg or "PermissionError" in msg:
            return serial.SerialException(
                f"{port_hint} is in use. Close the serial plotter window and any other app "
                f"using {port_hint}, then try Connect again."
            )
        if "FileNotFoundError" in msg or "cannot find the file" in msg.lower():
            return serial.SerialException(
                f"{port_hint} was not found. Check the USB cable and pick the correct COM port "
                f"in Device Manager."
            )
        return serial.SerialException(f"Cannot open serial port: {msg}")

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)
        if self._ser and self._ser.is_open:
            self._ser.close()
        self.stats.connected = False

    def read_sample(self) -> Optional[Sample]:
        recent = self.buffer.get_recent(0.01)
        return recent[-1] if recent else None

    def _run(self) -> None:
        assert self._ser is not None
        while not self._stop.is_set():
            try:
                raw = self._ser.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").strip()
                if line.startswith("#"):
                    if "ADS1015 detected" in line:
                        self.stats.ads_detected = True
                    if "ADS1015 still missing" in line or "ADS1015 not found" in line:
                        self.stats.ads_detected = False
                    if "I2C device at 0x48" in line or "I2C device at 0x49" in line:
                        self.stats.ads_detected = True
                    continue
                sample = parse_line(line)
                if sample is None:
                    self.stats.malformed += 1
                    continue
                if sample.timestamp_device_us == 0:
                    self.stats.plotter_lines += 1
                    continue  # plotter-only duplicate; CSV line has timestamp

                if self._last_ts is not None and sample.timestamp_device_us > self._last_ts:
                    gap_us = sample.timestamp_device_us - self._last_ts
                    expected = int(1_000_000 / config.sampling_rate)
                    if gap_us > expected * 2:
                        self.stats.dropped_estimate += int(gap_us / expected) - 1
                self._last_ts = sample.timestamp_device_us
                self.stats.last_device_ts = sample.timestamp_device_us
                self.stats.received += 1
                self.buffer.append(sample)
                self.stats.effective_hz = self.buffer.effective_rate_hz()
                if self.on_sample:
                    self.on_sample(sample)
            except Exception:
                time.sleep(0.05)
