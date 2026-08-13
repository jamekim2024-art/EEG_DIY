"""Parse ESP32 serial lines into sample records."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

CSV_RE = re.compile(
    r"^(?P<ts>\d+),(?P<raw>-?\d+),(?P<voltage>-?\d+\.?\d*),(?P<lead>[01])$"
)
PLOTTER_RE = re.compile(
    r"^voltage:(?P<voltage>-?\d+\.?\d*),raw:(?P<raw>-?\d+),lead_off:(?P<lead>[01])$"
)


@dataclass
class Sample:
    timestamp_device_us: int
    raw_adc: int
    voltage: float
    lead_off: bool
    timestamp_host: Optional[float] = None
    session_id: Optional[str] = None
    trial_id: Optional[str] = None
    stimulus_id: Optional[str] = None
    stimulus_label: Optional[str] = None


def parse_line(line: str) -> Optional[Sample]:
    """Parse one serial line. Returns None for diagnostics or malformed data."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    m = CSV_RE.match(line)
    if m:
        return Sample(
            timestamp_device_us=int(m.group("ts")),
            raw_adc=int(m.group("raw")),
            voltage=float(m.group("voltage")),
            lead_off=m.group("lead") == "1",
        )

    m = PLOTTER_RE.match(line)
    if m:
        return Sample(
            timestamp_device_us=0,
            raw_adc=int(m.group("raw")),
            voltage=float(m.group("voltage")),
            lead_off=m.group("lead") == "1",
        )

    return None
