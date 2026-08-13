# ADS1015 wiring checklist (ESP32)

If serial shows **`# ERROR: ADS1015 not found on I2C`** or the dashboard says **ADS1015: Not detected**, check every row below.

Educational prototype only — not a medical device.

---

## ADS1015 → ESP32 (required)

| ADS1015 pin | Connect to | Notes |
|-------------|------------|--------|
| **VDD** | ESP32 **3.3V** | Never 5 V on the ADS1015 |
| **GND** | ESP32 **GND** | Must share ground with ESP32, AD8232, LM358 |
| **SDA** | ESP32 **GPIO21** | Do not swap with SCL |
| **SCL** | ESP32 **GPIO22** | |
| **ADDR** | **GND** | I2C address = **0x48** (firmware default) |
| **A0** | LM358 **pin 1** (output) | Analog input from buffer |
| **A1, A2, A3** | *(leave unconnected)* | |

### Decoupling (recommended)

| Part | Connection |
|------|------------|
| 0.47 µF capacitor | Between ADS1015 **VDD** and **GND**, close to the chip |

### I2C pull-ups (if scan finds nothing)

Many breakouts have pull-ups already. If **I2C scan: no devices found**, add:

| From | To |
|------|-----|
| **4.7 kΩ** | SDA → 3.3V |
| **4.7 kΩ** | SCL → 3.3V |

---

## ADDR pin → I2C address

| ADDR wired to | Address |
|---------------|---------|
| GND | **0x48** (use this) |
| VDD | 0x49 |
| SDA | 0x4A |
| SCL | 0x4B |

Firmware tries **all four** addresses automatically.

---

## Signal path (full chain)

```
AD8232 OUTPUT → LM358 pin 3
LM358 pin 1,2 tied (unity gain) → ADS1015 A0
LM358 pin 8 → ESP32 5V
LM358 pin 4 → GND
AD8232 3.3V → ESP32 3.3V
AD8232 GND → ESP32 GND
```

---

## Quick tests

1. **Serial Monitor 115200** after reset — look for:
   - `# I2C device at 0x48` → wiring OK
   - `# I2C scan: no devices found` → power, SDA, SCL, or pull-ups
   - `# ADS1015 detected at 0x48` → ready to sample

2. **Multimeter**
   - ADS1015 VDD ≈ 3.3 V to GND
   - SDA/SCL idle ≈ 3.3 V (with pull-ups)

3. **Dashboard**
   - Connect **COM5** → System status → **ADS1015: Detected**

---

## Common mistakes

| Mistake | Symptom |
|---------|---------|
| SDA and SCL swapped | No I2C devices |
| ADDR floating (not tied to GND) | Wrong address / not found |
| No common GND | Random I2C failures |
| ADS1015 on 5 V | Chip not seen or damaged |
| Loose breadboard jumpers | Intermittent “not found” |
| Using COM4 (Intel) instead of COM5 (CP210x) | No serial / wrong port |

---

## Pin map (copy-paste)

```
ADS1015 VDD  → ESP32 3.3V
ADS1015 GND  → ESP32 GND
ADS1015 SDA  → ESP32 GPIO21
ADS1015 SCL  → ESP32 GPIO22
ADS1015 ADDR → GND
ADS1015 A0   → LM358 pin 1
```

See also: [biosignal-project/docs/WIRING.md](../biosignal-project/docs/WIRING.md) for AD8232, LM358, LED, and buzzer.
