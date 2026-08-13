"""Session CSV + metadata recording."""

from __future__ import annotations

import csv
import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from backend.app.acquisition.parser import Sample
from backend.app.config import RAW_DIR, config, ensure_data_dirs


@dataclass
class SessionMetadata:
    session_id: str
    started_at: str
    sampling_rate: float
    hardware_version: str
    participant_alias: str = "anonymous"
    experiment_protocol: str = "manual"
    notes: str = ""
    ended_at: Optional[str] = None
    sample_count: int = 0
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class RecordingStore:
    def __init__(self) -> None:
        ensure_data_dirs()
        self.session_id: Optional[str] = None
        self._csv_path: Optional[Path] = None
        self._meta_path: Optional[Path] = None
        self._file = None
        self._writer: Optional[csv.DictWriter] = None
        self.metadata: Optional[SessionMetadata] = None
        self._count = 0

    @property
    def active(self) -> bool:
        return self._file is not None

    def start(
        self,
        participant_alias: str = "anonymous",
        protocol: str = "manual",
        notes: str = "",
    ) -> SessionMetadata:
        self.stop()
        sid = uuid.uuid4().hex[:12]
        ts = datetime.now(timezone.utc).isoformat()
        self.session_id = sid
        self._csv_path = RAW_DIR / f"{sid}.csv"
        self._meta_path = RAW_DIR / f"{sid}.json"
        self.metadata = SessionMetadata(
            session_id=sid,
            started_at=ts,
            sampling_rate=config.sampling_rate,
            hardware_version=config.hardware_version,
            participant_alias=participant_alias,
            experiment_protocol=protocol,
            notes=notes,
        )
        self._file = open(self._csv_path, "w", newline="", encoding="utf-8")
        self._writer = csv.DictWriter(
            self._file,
            fieldnames=[
                "timestamp_device_us",
                "timestamp_host",
                "raw_adc",
                "voltage",
                "lead_off",
                "session_id",
                "trial_id",
                "stimulus_id",
                "stimulus_label",
            ],
        )
        self._writer.writeheader()
        self._count = 0
        return self.metadata

    def write_sample(self, sample: Sample) -> None:
        if not self._writer or not self.session_id:
            return
        self._writer.writerow(
            {
                "timestamp_device_us": sample.timestamp_device_us,
                "timestamp_host": sample.timestamp_host,
                "raw_adc": sample.raw_adc,
                "voltage": sample.voltage,
                "lead_off": int(sample.lead_off),
                "session_id": self.session_id,
                "trial_id": sample.trial_id or "",
                "stimulus_id": sample.stimulus_id or "",
                "stimulus_label": sample.stimulus_label or "",
            }
        )
        self._count += 1

    def stop(self) -> Optional[SessionMetadata]:
        if self._file:
            self._file.close()
        if self.metadata:
            self.metadata.ended_at = datetime.now(timezone.utc).isoformat()
            self.metadata.sample_count = self._count
            if self._meta_path:
                self._meta_path.write_text(
                    json.dumps(self.metadata.to_dict(), indent=2), encoding="utf-8"
                )
        meta = self.metadata
        self._file = None
        self._writer = None
        self.session_id = None
        self.metadata = None
        return meta

    def list_sessions(self) -> list[dict]:
        ensure_data_dirs()
        out = []
        for p in sorted(RAW_DIR.glob("*.json")):
            out.append(json.loads(p.read_text(encoding="utf-8")))
        return out
