import numpy as np
import pytest

from backend.app.signal_processing.artifacts import detect_artifacts
from backend.app.signal_processing.normalization import percent_change


def test_lead_off_artifact():
    r = detect_artifacts(np.array([1.0, 1.1]), lead_off=True)
    assert r.detected and r.artifact_type == "lead_off"


def test_percent_change():
    assert percent_change(0.29, 0.20) == pytest.approx(45.0)
