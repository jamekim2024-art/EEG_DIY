"""FastAPI application entrypoint."""

from __future__ import annotations

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.routes import router as api_router
from backend.app.api.websocket import router as ws_router
from backend.app.config import config, ensure_data_dirs
from backend.app.service import runtime

ensure_data_dirs()

app = FastAPI(title="Neuro Biosignal API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
app.include_router(ws_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    from fastapi import HTTPException

    if isinstance(exc, HTTPException):
        raise exc
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.on_event("startup")
def on_startup() -> None:
    """Auto-connect in background so the API listens immediately."""
    import threading

    mode = os.environ.get("NEURO_AUTO_CONNECT", "").lower()
    port = os.environ.get("NEURO_SERIAL_PORT", config.serial_port)

    def _connect() -> None:
        if mode == "serial":
            try:
                runtime.connect_serial(port)
            except Exception:
                runtime.connect_demo("alpha")
        elif mode == "demo":
            runtime.connect_demo("alpha")

    if mode in ("serial", "demo"):
        threading.Thread(target=_connect, daemon=True, name="auto-connect").start()


@app.get("/")
def root():
    return {
        "name": "neuro-project",
        "note": "Educational biosignal prototype — not a medical device",
    }
