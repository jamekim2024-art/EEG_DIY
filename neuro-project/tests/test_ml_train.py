"""ML training smoke test."""

from backend.app.ml.train import train_and_select


def test_train_synthetic_models():
    result = train_and_select()
    assert "selected_model" in result
    assert result["metadata"]["validation_metrics"]
