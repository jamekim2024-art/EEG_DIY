# Neuro-project

Educational experimental biosignal analysis stack (ESP32 + AD8232 + ADS1015).

**Not a medical device.** Frequency bands are experimental spectral features, not diagnostic EEG.

## Structure

- `firmware/esp32/` — 250 Hz acquisition, CSV + Serial Plotter output
- `backend/app/` — acquisition, DSP, experiments, ML, FastAPI
- `frontend/` — Vite + React dashboard
- `tests/` — parser + synthetic band dominance tests
- `data/` — recordings, models

## ESP32 upload

**Hold BOOT**, tap **EN/RESET**, keep holding BOOT until flash writes.

```bash
cd neuro-project/firmware/esp32
python -m platformio run -t upload --upload-port COM5
```

Serial: **115200**. Plotter series: `voltage`, `raw`, `lead_off`.

## Run everything (one command — no ESP32 upload)

```bash
cd neuro-project
npm start
```

This starts:
1. **FastAPI backend** (auto-connects COM5, falls back to demo)
2. **React dashboard** at http://localhost:5173 with **live biosignal waveform graph**
3. **Serial plotter window** (`tools/serial_plotter.py`) — live voltage chart like Arduino IDE

Set port: `NEURO_SERIAL_PORT=COM4 npm start` (bash) or `set NEURO_SERIAL_PORT=COM4&& npm start` (cmd).

Alternatives: `./scripts/run_all.sh` or `scripts\run_all.bat`.

## Backend (manual)

```bash
cd neuro-project
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

CLI acquisition:

```bash
python -m backend.app.cli_acquire --port COM5 --record --seconds 30
python -m backend.app.cli_acquire --demo --seconds 10
```

## Frontend

```bash
cd neuro-project/frontend
npm install
npm run dev
```

Open http://localhost:5173

## Tests

```bash
cd neuro-project
pytest -v
```

## Default signal settings

| Setting | Value |
|---------|-------|
| Sample rate | 250 Hz |
| High-pass | 1 Hz |
| Low-pass | 45 Hz |
| Theta | 4–8 Hz |
| Alpha | 8–13 Hz |
| Beta | 13–30 Hz |
| Gamma | 30–45 Hz |
| Window | 2 s, 50% overlap |
| Mains notch | off (LP 45 Hz default) |

## Wiring

See [docs/WIRING.md](docs/WIRING.md) — ESP32-only (no Mega/LCD).

## Known limitations

- AD8232/ADS1015 is not clinical EEG
- Gamma band is noise/muscle sensitive
- ML bootstrap uses synthetic data until real labeled sessions exist
- ESP32 auto-reset may require BOOT button for upload
