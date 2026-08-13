"""ESP32 firmware upload via PlatformIO."""

from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path

import serial.tools.list_ports

from backend.app.config import PROJECT_ROOT

FIRMWARE_DIR = PROJECT_ROOT / "firmware" / "esp32"

# Ports that are not the ESP32 USB-serial adapter
_SKIP_PORT_KEYWORDS = (
    "intel",
    "active management",
    "bluetooth",
    "modem",
    "standard serial over",
)

_ESP32_PORT_KEYWORDS = (
    "cp210",
    "silicon labs",
    "ch340",
    "ch910",
    "ftdi",
    "usb-serial",
    "usb serial",
    "uart",
    "esp32",
    "espressif",
)


class FirmwareUploadError(Exception):
    pass


def _port_blob(info) -> str:
    return " ".join(
        str(x or "")
        for x in (info.device, info.description, info.manufacturer, info.hwid)
    ).lower()


def list_serial_ports() -> list[str]:
    return sorted({p.device for p in serial.tools.list_ports.comports()})


def list_serial_ports_detailed() -> list[dict]:
    """COM ports with description and ESP32 recommendation."""
    guessed = guess_esp32_port()
    out: list[dict] = []
    for info in serial.tools.list_ports.comports():
        blob = _port_blob(info)
        skip = any(k in blob for k in _SKIP_PORT_KEYWORDS)
        esp_like = any(k in blob for k in _ESP32_PORT_KEYWORDS)
        out.append(
            {
                "device": info.device,
                "description": info.description or "Unknown device",
                "recommended": info.device == guessed,
                "esp32_candidate": esp_like and not skip,
                "skip": skip,
            }
        )
    out.sort(key=lambda x: (not x["recommended"], x["skip"], x["device"]))
    return out


def guess_esp32_port() -> str | None:
    """Best guess for the ESP32 CP210x / USB-UART port."""
    fallback: str | None = None
    for info in serial.tools.list_ports.comports():
        blob = _port_blob(info)
        if any(k in blob for k in _SKIP_PORT_KEYWORDS):
            continue
        if any(k in blob for k in _ESP32_PORT_KEYWORDS):
            return info.device
        if fallback is None:
            fallback = info.device
    return fallback


def _resolve_platformio_cmd() -> list[str]:
    if shutil.which("pio"):
        return ["pio"]
    if shutil.which("platformio"):
        return ["platformio"]
    try:
        probe = subprocess.run(
            [sys.executable, "-m", "platformio", "--version"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if probe.returncode == 0:
            return [sys.executable, "-m", "platformio"]
    except (OSError, subprocess.TimeoutExpired):
        pass
    raise FirmwareUploadError(
        "PlatformIO is not installed. In a terminal run: pip install platformio"
    )


def resolve_upload_port(requested: str | None) -> str:
    """Pick upload port; auto-select CP210x if requested port missing."""
    requested = (requested or "").strip().upper()
    available = list_serial_ports()
    detailed = list_serial_ports_detailed()

    if not available:
        raise FirmwareUploadError(
            "No COM ports found. Plug the ESP32 into USB and check Device Manager."
        )

    if requested and requested in available:
        for item in detailed:
            if item["device"] == requested and item["skip"]:
                guessed = guess_esp32_port()
                raise FirmwareUploadError(
                    f"{requested} is {item['description']} — not the ESP32. "
                    f"Use {guessed or 'the CP210x port'} instead."
                )
        return requested

    guessed = guess_esp32_port()
    if guessed:
        if requested and requested not in available:
            raise FirmwareUploadError(
                f"{requested} not found. ESP32 detected on {guessed}. "
                f"Available: {', '.join(available)}."
            )
        return guessed

    if requested and requested not in available:
        raise FirmwareUploadError(
            f"{requested} not found. Available ports: {', '.join(available)}."
        )

    raise FirmwareUploadError(
        f"Could not identify ESP32 port. Available: {', '.join(available)}. "
        "Pick the Silicon Labs CP210x / USB-SERIAL port."
    )


def upload_esp32_firmware(port: str, *, pre_disconnect_sleep: float = 1.0) -> dict:
    port = resolve_upload_port(port)
    if not FIRMWARE_DIR.is_dir():
        raise FirmwareUploadError(f"Firmware project not found at {FIRMWARE_DIR}")

    if pre_disconnect_sleep > 0:
        time.sleep(pre_disconnect_sleep)

    platformio = _resolve_platformio_cmd()
    cmd = platformio + [
        "run",
        "-t",
        "upload",
        "--upload-port",
        port,
        "--jobs",
        "1",
    ]
    try:
        result = subprocess.run(
            cmd,
            cwd=str(FIRMWARE_DIR),
            capture_output=True,
            text=True,
            timeout=180,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise FirmwareUploadError("Upload timed out after 3 minutes. Hold BOOT and retry.") from exc
    except FileNotFoundError as exc:
        raise FirmwareUploadError(
            "PlatformIO not found. Run: pip install platformio"
        ) from exc

    output = (result.stdout or "") + "\n" + (result.stderr or "")
    lower = output.lower()
    if result.returncode != 0:
        if "no module named 'platformio'" in lower:
            raise FirmwareUploadError("PlatformIO not installed. Run: pip install platformio")
        available = list_serial_ports()
        if "access is denied" in lower or "permissionerror" in lower:
            raise FirmwareUploadError(
                f"{port} is in use. Close the serial plotter window, click Disconnect, "
                "then retry upload with BOOT held."
            )
        if "doesn't exist" in lower or "does not exist" in lower:
            if port not in available:
                raise FirmwareUploadError(
                    f"{port} not found. Available: {', '.join(available) or 'none'}."
                )
            raise FirmwareUploadError(
                f"Could not open {port}. Close other apps using it, then retry."
            )
        if (
            "failed to connect" in lower
            or "no serial data received" in lower
            or "wrong boot mode" in lower
            or "timed out" in lower
        ):
            raise FirmwareUploadError(
                "ESP32 not responding. Hold BOOT, tap EN/RESET, keep holding BOOT, "
                f"then upload again on {port} (CP210x port, not Intel COM4)."
            )
        tail = "\n".join(line for line in output.strip().splitlines()[-10:])
        raise FirmwareUploadError(tail or f"Upload failed (exit {result.returncode}).")

    return {
        "ok": True,
        "port": port,
        "message": f"Firmware uploaded successfully to {port}.",
        "log_tail": "\n".join(output.strip().splitlines()[-6:]),
    }
