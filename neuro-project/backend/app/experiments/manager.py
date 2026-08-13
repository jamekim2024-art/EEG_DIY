"""Controlled experiment manager."""

from __future__ import annotations

import random
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from typing import Callable, Dict, List, Optional

from backend.app.config import config
from backend.app.experiments.event_marker import EventMarkerStore
from backend.app.experiments.protocols import BLINK_PROTOCOL, EYES_OPEN_CLOSED, ProtocolConfig


@dataclass
class TrialState:
    trial_id: str
    condition: str
    phase: str
    trial_number: int
    total_trials: int
    remaining_seconds: float
    instruction: str


class ExperimentManager:
    def __init__(self, on_update: Optional[Callable[[Dict], None]] = None) -> None:
        self.on_update = on_update
        self.marker_store = EventMarkerStore()
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self.active = False
        self.session_id: Optional[str] = None
        self.protocol: Optional[ProtocolConfig] = None
        self.current: Optional[TrialState] = None
        self._trial_results: List[Dict] = []

    def start(self, protocol_name: str = "eyes_open_vs_closed", session_id: Optional[str] = None) -> None:
        self.stop()
        self.session_id = session_id or uuid.uuid4().hex[:12]
        self.protocol = EYES_OPEN_CLOSED if protocol_name == "eyes_open_vs_closed" else BLINK_PROTOCOL
        self.active = True
        self._stop.clear()
        self.marker_store.clear()
        self._trial_results.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)
        self.active = False
        self.current = None

    def get_state(self) -> Dict:
        return {
            "active": self.active,
            "session_id": self.session_id,
            "protocol": self.protocol.name if self.protocol else None,
            "current": asdict(self.current) if self.current else None,
            "events": self.marker_store.list_events(),
            "trials_completed": len(self._trial_results),
        }

    def _emit(self, state: TrialState) -> None:
        self.current = state
        if self.on_update:
            self.on_update(asdict(state))

    def _sleep_phase(self, seconds: float, trial_id: str, condition: str, phase: str, instruction: str) -> None:
        end = time.time() + seconds
        while time.time() < end and not self._stop.is_set():
            remaining = end - time.time()
            if self.current:
                self.current.remaining_seconds = max(0.0, remaining)
                self.current.instruction = instruction
                self.current.phase = phase
                if self.on_update:
                    self.on_update(asdict(self.current))
            time.sleep(0.1)
        self.marker_store.add(condition, trial_id, self.session_id or "", phase, instruction)

    def _run(self) -> None:
        assert self.protocol is not None
        p = self.protocol
        schedule: List[str] = []
        for cond in p.conditions:
            schedule.extend([cond] * p.trials_per_condition)
        random.shuffle(schedule)
        total = len(schedule)

        for idx, condition in enumerate(schedule, start=1):
            if self._stop.is_set():
                break
            trial_id = uuid.uuid4().hex[:8]
            state = TrialState(
                trial_id=trial_id,
                condition=condition,
                phase="baseline",
                trial_number=idx,
                total_trials=total,
                remaining_seconds=p.baseline_seconds,
                instruction="REST / BASELINE",
            )
            self._emit(state)
            self._sleep_phase(p.baseline_seconds, trial_id, "BASELINE", "baseline", "REST / BASELINE")

            instr = condition.replace("_", " ")
            state.phase = "stimulus"
            state.instruction = instr
            self._emit(state)
            self._sleep_phase(p.stimulus_seconds, trial_id, condition, "stimulus", instr)

            state.phase = "recovery"
            state.instruction = "RECOVERY"
            self._emit(state)
            self._sleep_phase(p.recovery_seconds, trial_id, "REST", "recovery", "RECOVERY")

            self._trial_results.append({"trial_id": trial_id, "condition": condition})

        self.active = False
        self.current = None
