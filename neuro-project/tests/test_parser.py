import numpy as np
import pytest

from backend.app.acquisition.parser import parse_line
from backend.app.config import config


def test_parse_csv_line():
    s = parse_line("1234567,812,1.624000,0")
    assert s is not None
    assert s.timestamp_device_us == 1234567
    assert s.raw_adc == 812
    assert abs(s.voltage - 1.624) < 1e-6
    assert s.lead_off is False


def test_parse_plotter_line():
    s = parse_line("voltage:1.624000,raw:812,lead_off:0")
    assert s is not None
    assert s.voltage == 1.624


def test_ignore_diagnostic():
    assert parse_line("# heartbeat") is None


def test_malformed():
    assert parse_line("not,data") is None
