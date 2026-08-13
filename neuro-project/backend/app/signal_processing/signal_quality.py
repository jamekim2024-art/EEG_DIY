"""Project-specific signal quality score 0-100."""

from __future__ import annotations

from backend.app.signal_processing.artifacts import ArtifactResult


def compute_signal_quality(
    effective_hz: float,
    artifact: ArtifactResult,
    lead_off: bool,
    sample_count: int,
) -> int:
    score = 100
    if lead_off:
        score -= 40
    if artifact.detected:
        if artifact.artifact_type == "clipping":
            score -= 35
        elif artifact.artifact_type in ("movement", "blink_candidate", "large_transient"):
            score -= 25
        elif artifact.artifact_type == "lead_off":
            score -= 40
        else:
            score -= 15

    target = 250.0
    if effective_hz > 0:
        ratio = effective_hz / target
        if ratio < 0.7:
            score -= 30
        elif ratio < 0.9:
            score -= 10
    else:
        score -= 20

    if sample_count < int(0.5 * 250):
        score -= 10

    return max(0, min(100, int(score)))
