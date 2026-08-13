# ESP32-only wiring (Mega + LCD removed)

One wire (or one part connection) per row.  
Board: **ESP32-WROOM-32 DevKit only**.  
Removed: Arduino Mega, HD44780 LCD, Mega 5V rail for peripherals.

**Status indicators now on ESP32:**
- LED → GPIO2
- Active buzzer (NPN) → GPIO4

**Safety:** educational prototype only — not a medical device.  
Do not attach electrodes to a person while USB/mains-powered equipment is connected.

---

## A. Common ground

| From | To |
|------|----|
| ESP32 GND | AD8232 GND |
| ESP32 GND | ADS1015 GND |
| ESP32 GND | LM358 pin 4 |
| ESP32 GND | NPN transistor emitter |
| ESP32 GND | LED cathode |

---

## B. ESP32 power to 3.3 V devices

| From | To |
|------|----|
| ESP32 3.3V | ADS1015 VDD |
| ESP32 3.3V | AD8232 3.3V |
| ADS1015 VDD | 0.47 µF capacitor lead A |
| ADS1015 GND | 0.47 µF capacitor lead B |
| AD8232 3.3V | 10 nF capacitor lead A |
| AD8232 GND | 10 nF capacitor lead B |

---

## C. ESP32 5V to LM358 (USB 5V pin on DevKit)

| From | To |
|------|----|
| ESP32 5V | LM358 pin 8 |
| LM358 pin 8 | 100 nF capacitor lead A |
| LM358 pin 4 | 100 nF capacitor lead B |

---

## D. ADS1015 ↔ ESP32

| From | To |
|------|----|
| ADS1015 SDA | ESP32 GPIO21 |
| ADS1015 SCL | ESP32 GPIO22 |
| ADS1015 ADDR | GND |
| ADS1015 A0 | LM358 pin 1 |
| ADS1015 A1 | *(leave open)* |
| ADS1015 A2 | *(leave open)* |
| ADS1015 A3 | *(leave open)* |

I2C address with ADDR→GND: **0x48**

---

## E. AD8232 ↔ ESP32 / LM358

| From | To |
|------|----|
| AD8232 OUTPUT | LM358 pin 3 |
| AD8232 LO+ | ESP32 GPIO32 |
| AD8232 LO- | ESP32 GPIO34 |

---

## F. LM358P (unity-gain buffer)

| From | To |
|------|----|
| LM358 pin 1 | LM358 pin 2 |
| LM358 pin 1 | ADS1015 A0 |
| LM358 pin 3 | AD8232 OUTPUT |
| LM358 pin 4 | GND |
| LM358 pin 5 | GND |
| LM358 pin 6 | LM358 pin 7 |
| LM358 pin 8 | ESP32 5V |

---

## G. Status LED (on ESP32)

| From | To |
|------|----|
| ESP32 GPIO2 | 220 Ω resistor lead A |
| 220 Ω resistor lead B | LED anode (+) |
| LED cathode (−) | GND |

---

## H. Active buzzer via NPN (on ESP32)

| From | To |
|------|----|
| ESP32 GPIO4 | 1k Ω resistor lead A |
| 1k Ω resistor lead B | NPN base |
| NPN emitter | GND |
| NPN collector | buzzer negative (−) |
| ESP32 5V | buzzer positive (+) |

---

## I. USB

| From | To |
|------|----|
| PC USB | ESP32 USB port |

---

## J. Firmware pin map

| Signal | ESP32 pin |
|--------|-----------|
| ADS1015 SDA | GPIO21 |
| ADS1015 SCL | GPIO22 |
| AD8232 LO+ | GPIO32 |
| AD8232 LO- | GPIO34 |
| Status LED | GPIO2 |
| Buzzer (NPN base via 1k) | GPIO4 |
| ADS1015 analog | A0 ← LM358 pin 1 |
| LM358 V+ | ESP32 5V |

---

## K. Removed (do not wire)

| Removed item | Notes |
|--------------|-------|
| Arduino Mega 2560 | No longer used |
| HD44780 LCD | No longer used |
| Mega D5–D12 | LCD / old LED / old buzzer pins |
| Mega 5V to LM358 | Use **ESP32 5V** instead |

---

## L. Expected behavior

| Check | Expected |
|-------|----------|
| Serial 115200 | `# ADS1015 detected` then CSV lines |
| Lead OK | LED ON, buzzer OFF |
| Lead off | LED OFF, buzzer ON |
| ADS1015 missing | LED blinks; serial error |

CSV format: `timestamp_us,raw,voltage,lead_off`
