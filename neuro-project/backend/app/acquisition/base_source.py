"""Acquisition source abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from backend.app.acquisition.parser import Sample


class BaseSignalSource(ABC):
    @abstractmethod
    def start(self) -> None: ...

    @abstractmethod
    def stop(self) -> None: ...

    @abstractmethod
    def read_sample(self) -> Optional[Sample]: ...

    @property
    @abstractmethod
    def connected(self) -> bool: ...

    @property
    @abstractmethod
    def ads_detected(self) -> bool: ...
