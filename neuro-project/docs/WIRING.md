# Wiring (ESP32-only)

**Full ADS1015 checklist:** [ADS1015_WIRING.md](ADS1015_WIRING.md)  
**Complete build:** [biosignal-project/docs/WIRING.md](../biosignal-project/docs/WIRING.md)

## ADS1015 minimum (fix “not detected”)

| ADS1015 | ESP32 |
|---------|-------|
| VDD | **3.3V** |
| GND | **GND** |
| SDA | **GPIO21** |
| SCL | **GPIO22** |
| ADDR | **GND** (address 0x48) |
| A0 | LM358 pin 1 |

All grounds must be tied together (ESP32, ADS1015, AD8232, LM358).

## Other pins

- GPIO32 LO+, GPIO34 LO− (AD8232)
- GPIO2 LED, GPIO4 buzzer
- ESP32 5V → LM358 V+
- ESP32 3.3V → AD8232 + ADS1015

Serial **115200** — expect `# ADS1015 detected at 0x48`.
