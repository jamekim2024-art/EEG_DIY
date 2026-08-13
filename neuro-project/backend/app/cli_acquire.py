"""CLI for serial acquisition (Milestone 1)."""

from __future__ import annotations

import argparse
import signal
import sys
import time

from backend.app.config import config
from backend.app.service import runtime


def main() -> None:
    parser = argparse.ArgumentParser(description="Neuro serial acquisition CLI")
    parser.add_argument("--port", default=config.serial_port)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--record", action="store_true")
    parser.add_argument("--seconds", type=float, default=10.0)
    args = parser.parse_args()

    if args.demo:
        runtime.connect_demo("alpha")
        print("# SIMULATION MODE")
    else:
        runtime.connect_serial(args.port)
        print(f"# Connected to {args.port}")

    if args.record:
        meta = runtime.recording.start(protocol="cli")
        print(f"# Recording session {meta.session_id}")

    stop = False

    def _sig(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _sig)
    t0 = time.time()
    while not stop and (time.time() - t0) < args.seconds:
        st = runtime.get_status()
        print(
            f"# rate={st['effective_hz']:.1f}Hz samples={st['received_samples']} "
            f"lead={st['lead_status']} ads={st['ads1015_detected']}"
        )
        time.sleep(1.0)

    if args.record:
        runtime.recording.stop()
    runtime.disconnect()


if __name__ == "__main__":
    main()
