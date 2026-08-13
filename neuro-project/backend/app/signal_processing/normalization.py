"""Baseline normalization and percent change."""

from __future__ import annotations

from typing import Dict


def percent_change(post: float, baseline: float, min_baseline: float = 1e-6) -> float:
    denom = max(abs(baseline), min_baseline)
    return ((post - baseline) / denom) * 100.0


def baseline_changes(
    baseline_bands: Dict[str, float],
    post_bands: Dict[str, float],
) -> Dict[str, float]:
    keys = ("theta", "alpha", "beta", "gamma")
    return {
        k: percent_change(post_bands.get(k, 0.0), baseline_bands.get(k, 0.0))
        for k in keys
    }
