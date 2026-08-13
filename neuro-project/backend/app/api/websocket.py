"""WebSocket live streaming."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.config import config
from backend.app.service import runtime

router = APIRouter()


@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    interval = 1.0 / config.ui_update_hz
    try:
        while True:
            payload = runtime.get_live_payload()
            status = runtime.get_status()
            msg = {
                "type": "live",
                "status": status,
                "data": payload,
                "safety_note": "Educational research prototype. Not a medical device.",
            }
            await websocket.send_text(json.dumps(msg, default=str))
            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        return
