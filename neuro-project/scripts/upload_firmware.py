#!/usr/bin/env python3
"""Upload ESP32 firmware — frees COM port first, auto-picks CP210x."""

from __future__ import annotations

import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIRMWARE = ROOT / "firmware" / "esp32"


def guess_port() -> str:
    sys.path.insert(0, str(ROOT))
    from backend.app.firmware_upload import guess_esp32_port, list_serial_ports

    port = guess_esp32_port()
    if port:
        return port
    ports = list_serial_ports()
    if ports:
        return ports[0]
    raise SystemExit("No COM ports found. Plug in ESP32 USB.")


def disconnect_backend() -> None:
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/disconnect",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=b"{}",
        )
        urllib.request.urlopen(req, timeout=3)
        print("Backend disconnect OK")
    except (urllib.error.URLError, TimeoutError, OSError):
        pass


def port_is_free(port: str) -> bool:
    import serial

    try:
        s = serial.Serial(port, 115200, timeout=0.5)
        s.close()
        return True
    except Exception as exc:
        print(f"Port {port} not free: {exc}")
        return False


def main() -> None:
    port = sys.argv[1] if len(sys.argv) > 1 else guess_port()
    print(f"=== Upload ESP32 firmware -> {port} ===")
    print("Hold BOOT, tap EN/RESET, keep holding BOOT until 'Connecting....'\n")

    disconnect_backend()
    time.sleep(1.5)

    if not port_is_free(port):
        print(
            "\nCOM port is BUSY (this causes 'Could not open COM5, port doesn't exist').\n"
            "Do this first:\n"
            "  1. Stop npm start (Ctrl+C)\n"
            "  2. Close Serial Monitor / plotter\n"
            "  3. Run: npm run upload\n"
        )
        raise SystemExit(1)

    cmd = [
        sys.executable,
        "-m",
        "platformio",
        "run",
        "-t",
        "upload",
        "--upload-port",
        port,
        "--jobs",
        "1",
    ]
    for attempt in range(1, 4):
        if attempt > 1:
            print(f"\nRetry {attempt}/3 — hold BOOT, tap EN, then release BOOT when Connecting....")
            time.sleep(2)
        result = subprocess.run(cmd, cwd=str(FIRMWARE))
        if result.returncode == 0:
            print("\nUpload SUCCESS")
            raise SystemExit(0)
        print("\nUpload failed. Wrong boot mode? Hold BOOT + tap EN before next try.")
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
