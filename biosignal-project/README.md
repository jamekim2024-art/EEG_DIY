# Biosignal Project (ESP32-only)

Standalone educational biosignal acquisition on **ESP32-WROOM-32**.

- `esp32/` — ADS1015 sampling, lead-off, LED/buzzer, CSV serial (~250 Hz)
- `tools/i2c_scan/` — optional I2C wiring diagnostic
- `docs/WIRING.md` — **current one-to-one wiring** (no Mega, no LCD)
- `mega/` — legacy (unused; Mega + LCD removed from the design)

See `docs/WIRING.md` and `docs/HARDWARE.md`.
