"""REST API routes."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter

from backend.app.api.errors import to_http_error
from backend.app.config import config
from backend.app.firmware_upload import FirmwareUploadError, upload_esp32_firmware
from backend.app.ml.train import train_and_select
from backend.app.service import runtime
from pydantic import BaseModel

router = APIRouter(prefix="/api")


class ConnectRequest(BaseModel):
    port: Optional[str] = None


class FirmwareUploadRequest(BaseModel):
    port: Optional[str] = None


class DemoRequest(BaseModel):
    mode: str = "alpha"


class RecordingStartRequest(BaseModel):
    participant_alias: str = "anonymous"
    protocol: str = "manual"
    notes: str = ""


class ExperimentStartRequest(BaseModel):
    protocol: str = "eyes_open_vs_closed"


class EventRequest(BaseModel):
    stimulus_type: str
    trial_id: str = "manual"
    phase: str = "stimulus"
    instruction: str = ""


@router.get("/serial/ports")
def serial_ports():
    from backend.app.firmware_upload import guess_esp32_port, list_serial_ports_detailed

    items = list_serial_ports_detailed()
    return {
        "ports": [p["device"] for p in items],
        "details": items,
        "recommended": guess_esp32_port(),
    }


@router.get("/status")
def get_status():
    try:
        return runtime.get_status()
    except Exception as exc:
        raise to_http_error(exc, action="Status") from exc


@router.get("/config")
def get_config():
    return {
        "sampling_rate": config.sampling_rate,
        "highpass_hz": config.highpass_hz,
        "lowpass_hz": config.lowpass_hz,
        "theta": config.theta_band,
        "alpha": config.alpha_band,
        "beta": config.beta_band,
        "gamma": config.gamma_band,
        "window_seconds": config.window_seconds,
        "window_overlap": config.window_overlap,
        "mains_frequency": config.mains_frequency,
    }


@router.post("/connect/serial")
def connect_serial(req: ConnectRequest):
    try:
        runtime.connect_serial(req.port)
        return {
            "ok": True,
            "port": runtime.source.port if hasattr(runtime.source, "port") else config.serial_port,
            "esp32_connected": True,
        }
    except Exception as exc:
        raise to_http_error(exc, action="Serial connect") from exc


@router.post("/firmware/upload")
def firmware_upload(req: FirmwareUploadRequest):
    try:
        runtime.disconnect()
        return upload_esp32_firmware(req.port or config.serial_port)
    except FirmwareUploadError as exc:
        raise to_http_error(exc, action="Upload") from exc
    except Exception as exc:
        raise to_http_error(exc, action="Upload") from exc


@router.post("/connect/demo")
def connect_demo(req: DemoRequest):
    try:
        runtime.connect_demo(req.mode)
        return {"ok": True, "mode": req.mode, "simulation_mode": True}
    except Exception as exc:
        raise to_http_error(exc, action="Demo connect") from exc


@router.post("/disconnect")
def disconnect():
    try:
        runtime.disconnect()
        return {"ok": True}
    except Exception as exc:
        raise to_http_error(exc, action="Disconnect") from exc


@router.post("/recording/start")
def recording_start(req: RecordingStartRequest):
    try:
        meta = runtime.recording.start(req.participant_alias, req.protocol, req.notes)
        return meta.to_dict()
    except Exception as exc:
        raise to_http_error(exc, action="Recording start") from exc


@router.post("/recording/stop")
def recording_stop():
    try:
        meta = runtime.recording.stop()
        return meta.to_dict() if meta else {"ok": True}
    except Exception as exc:
        raise to_http_error(exc, action="Recording stop") from exc


@router.post("/experiment/start")
def experiment_start(req: ExperimentStartRequest):
    try:
        runtime.experiment.start(req.protocol, runtime.recording.session_id)
        return runtime.experiment.get_state()
    except Exception as exc:
        raise to_http_error(exc, action="Experiment start") from exc


@router.post("/experiment/stop")
def experiment_stop():
    try:
        runtime.experiment.stop()
        return runtime.experiment.get_state()
    except Exception as exc:
        raise to_http_error(exc, action="Experiment stop") from exc


@router.post("/events")
def add_event(req: EventRequest):
    try:
        ev = runtime.experiment.marker_store.add(
            req.stimulus_type,
            req.trial_id,
            runtime.recording.session_id or runtime.experiment.session_id or "manual",
            req.phase,
            req.instruction,
        )
        from dataclasses import asdict

        return asdict(ev)
    except Exception as exc:
        raise to_http_error(exc, action="Event") from exc


@router.get("/sessions")
def list_sessions():
    try:
        return runtime.recording.list_sessions()
    except Exception as exc:
        raise to_http_error(exc, action="Sessions list") from exc


@router.get("/models")
def get_models():
    from backend.app.config import MODELS_DIR

    meta_path = MODELS_DIR / "model_metadata.json"
    if not meta_path.exists():
        return {"trained": False}
    import json

    return {"trained": True, "metadata": json.loads(meta_path.read_text(encoding="utf-8"))}


@router.post("/models/train")
def train_models():
    try:
        result = train_and_select()
        runtime.inference._load_model()
        return result
    except Exception as exc:
        raise to_http_error(exc, action="Model training") from exc


@router.get("/models/metrics")
def model_metrics():
    from backend.app.config import MODELS_DIR
    import json

    meta_path = MODELS_DIR / "model_metadata.json"
    if not meta_path.exists():
        raise to_http_error(ValueError("No trained model"), action="Model metrics")
    return json.loads(meta_path.read_text(encoding="utf-8"))
