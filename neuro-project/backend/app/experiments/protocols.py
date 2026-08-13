"""Experiment protocol definitions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

STIMULUS_TYPES = ("BASELINE", "EYES_OPEN", "EYES_CLOSED", "BLINK", "REST")


@dataclass
class ProtocolConfig:
    name: str
    baseline_seconds: float
    stimulus_seconds: float
    recovery_seconds: float
    trials_per_condition: int
    conditions: List[str]


EYES_OPEN_CLOSED = ProtocolConfig(
    name="eyes_open_vs_closed",
    baseline_seconds=2.0,
    stimulus_seconds=5.0,
    recovery_seconds=3.0,
    trials_per_condition=20,
    conditions=["EYES_OPEN", "EYES_CLOSED"],
)

BLINK_PROTOCOL = ProtocolConfig(
    name="blink_response",
    baseline_seconds=1.0,
    stimulus_seconds=2.0,
    recovery_seconds=2.0,
    trials_per_condition=10,
    conditions=["BLINK"],
)
