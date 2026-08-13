"""Map backend exceptions to HTTP errors with readable messages."""

from __future__ import annotations

import serial
from fastapi import HTTPException

from backend.app.firmware_upload import FirmwareUploadError


def to_http_error(exc: Exception, *, action: str = "Request") -> HTTPException:
    if isinstance(exc, HTTPException):
        return exc
    if isinstance(exc, (FirmwareUploadError, ValueError)):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, (serial.SerialException, OSError, PermissionError)):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=400, detail=f"{action} failed: {exc}")
