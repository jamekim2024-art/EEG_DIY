# Biosignal prototype — hardware & pin checklist

Educational prototype only. **Not a medical device.**

Do **not** attach electrodes to a person while USB, wall adapters, or other mains-connected equipment are connected.

## Pin verification (reviewed)

### ESP32-WROOM-32
| Function | Pin | Notes |
|----------|-----|-------|
| I2C SDA | GPIO21 | Standard ESP32 I2C |
| I2C SCL | GPIO22 | Standard ESP32 I2C |
| AD8232 LO+ | GPIO32 | Digital input |
| AD8232 LO- | GPIO34 | **Input-only** — OK for LO- |
| ADS1015 A0 | via LM358 | Do not exceed ~3.3 V into ADS1015 |

### Arduino Mega 2560
| Function | Pin | Notes |
|----------|-----|-------|
| LCD RS | D7 | |
| LCD E | D8 | |
| LCD D4–D7 | D9–D12 | |
| LED | D6 | No conflict with LCD |
| Buzzer (NPN base) | D5 | No conflict with LCD |

### Electrical safety between boards
- Mega is **5 V**; ESP32 GPIOs are **3.3 V** only.
- Do **not** wire Mega GPIO outputs directly into ESP32 inputs.
- Share **common GND** only until a proper level-shifted UART/link is designed.
- LM358 is powered from Mega **5 V**; keep its output within ADS1015 input limits (AD8232 at 3.3 V mid-supply is typically safe).

## Expected ports (this machine, last check)
- Arduino Mega 2560 → **COM3**
- ESP32 (CP210x / Silabser) → **COM5** (Device Manager may still label it COM4 — use SERIALCOMM / PlatformIO device list)

## Libraries
- ESP32: `Adafruit ADS1X15`, `Adafruit BusIO` (via `platformio.ini`)
- Mega: `LiquidCrystal` (Arduino framework built-in)
