# Hardware notes — ESP32-only

Arduino Mega and LCD are **removed** from this build.

See **[WIRING.md](WIRING.md)** for full one-to-one connections.

## Pin map

| Function | Pin |
|----------|-----|
| I2C SDA | GPIO21 |
| I2C SCL | GPIO22 |
| AD8232 LO+ | GPIO32 |
| AD8232 LO- | GPIO34 (input-only) |
| Status LED | GPIO2 |
| Buzzer (NPN) | GPIO4 |
| LM358 V+ | ESP32 **5V** (USB) |
| ADS1015 / AD8232 VDD | ESP32 **3.3V** |

## Notes

- Keep ADS1015 input within ~3.3 V (AD8232 mid-supply is typically fine).
- Educational prototype only — not a medical device.
- No electrodes on a person while USB/mains gear is connected.
