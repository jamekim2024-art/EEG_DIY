"""Future ADS1299 source stub — not implemented in V1."""

from __future__ import annotations

from typing import Optional

from backend.app.acquisition.base_source import BaseSignalSource
from backend.app.acquisition.parser import Sample


class ADS1299Source(BaseSignalSource):
    """Placeholder for future clinical-grade front-end integration."""

    @property
    def connected(self) -> bool:
        return False

    @property
    def ads_detected(self) -> bool:
        return False

    def start(self) -> None:
        raise NotImplementedError("ADS1299Source is not implemented in V1")

    def stop(self) -> None:
        pass

    def read_sample(self) -> Optional[Sample]:
        return None
