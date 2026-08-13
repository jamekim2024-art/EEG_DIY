"""Experiment event markers."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional


@dataclass
class EventMarker:
    event_id: str
    timestamp_host: float
    stimulus_type: str
    trial_id: str
    session_id: str
    phase: str  # baseline, stimulus, recovery
    instruction: str = ""


class EventMarkerStore:
    def __init__(self) -> None:
        self.events: List[EventMarker] = []

    def add(
        self,
        stimulus_type: str,
        trial_id: str,
        session_id: str,
        phase: str,
        instruction: str = "",
    ) -> EventMarker:
        ev = EventMarker(
            event_id=uuid.uuid4().hex[:8],
            timestamp_host=time.time(),
            stimulus_type=stimulus_type,
            trial_id=trial_id,
            session_id=session_id,
            phase=phase,
            instruction=instruction,
        )
        self.events.append(ev)
        return ev

    def list_events(self) -> List[Dict]:
        return [asdict(e) for e in self.events]

    def clear(self) -> None:
        self.events.clear()
