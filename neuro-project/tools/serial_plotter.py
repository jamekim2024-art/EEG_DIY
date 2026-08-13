"""
Live serial plotter window (Arduino IDE Serial Plotter style).
Reads voltage: lines or CSV from ESP32 @ 115200 and plots in real time.
Educational prototype — not a medical device.
"""

from __future__ import annotations

import argparse
import re
import sys
import time

import matplotlib.pyplot as plt
import matplotlib.animation as animation
import serial

CSV_RE = re.compile(r"^\d+,(?P<raw>-?\d+),(?P<voltage>-?\d+\.?\d*),(?P<lead>[01])$")
PLOT_RE = re.compile(r"^voltage:(?P<voltage>-?\d+\.?\d*)")


def parse_voltage(line: str) -> float | None:
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    m = CSV_RE.match(line)
    if m:
        return float(m.group("voltage"))
    m = PLOT_RE.match(line)
    if m:
        return float(m.group("voltage"))
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="ESP32 live voltage plotter")
    parser.add_argument("--port", default="COM5")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--window", type=int, default=1250, help="Samples visible (~5s @ 250Hz)")
    args = parser.parse_args()

    try:
        ser = serial.Serial(args.port, args.baud, timeout=0.05)
    except serial.SerialException as exc:
        print(f"Cannot open {args.port}: {exc}", file=sys.stderr)
        sys.exit(1)

    xs: list[int] = []
    ys: list[float] = []
    idx = 0

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.set_title("Experimental Biosignal — Live Voltage (Serial Plotter)")
    ax.set_xlabel("Sample")
    ax.set_ylabel("Voltage (V)")
    (line,) = ax.plot([], [], color="#2563eb", linewidth=1.2)
    ax.grid(True, alpha=0.3)

    def animate(_frame):
        nonlocal idx
        for _ in range(20):
            raw = ser.readline()
            if not raw:
                break
            try:
                text = raw.decode("utf-8", errors="replace").strip()
            except Exception:
                continue
            v = parse_voltage(text)
            if v is None:
                continue
            xs.append(idx)
            ys.append(v)
            idx += 1
        if len(xs) > args.window:
            del xs[: len(xs) - args.window]
            del ys[: len(ys) - args.window]
        line.set_data(xs, ys)
        if xs:
            ax.set_xlim(xs[0], xs[-1] + 1)
            ymin, ymax = min(ys), max(ys)
            pad = max(0.05, (ymax - ymin) * 0.1)
            ax.set_ylim(ymin - pad, ymax + pad)
        return (line,)

    print(f"Plotter listening on {args.port} @ {args.baud}. Close window to exit.")
    ani = animation.FuncAnimation(fig, animate, interval=40, blit=False, cache_frame_data=False)
    plt.tight_layout()
    plt.show()
    ser.close()


if __name__ == "__main__":
    main()
