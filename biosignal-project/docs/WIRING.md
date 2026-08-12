# One-to-one wiring (matches current firmware)

Each row is **one wire** (or one discrete part connection).  
Boards: **ESP32-WROOM-32** + **Arduino Mega 2560**.  
Firmware pins: ESP32 `21/22/32/34` · Mega `D5/D6/D7–D12`.

**Safety:** educational prototype only. Do not attach electrodes to a person while USB/mains-powered gear is connected.

---

## A. Common ground

| From | To |
|------|----|
| ESP32 GND | Mega GND |
| ESP32 GND | AD8232 GND |
| ESP32 GND | ADS1015 GND |
| ESP32 GND | LM358 pin 4 |
| ESP32 GND | LCD VSS |
| ESP32 GND | NPN transistor emitter |

(You can star all GNDs to one common GND rail instead of daisy-chaining.)

---

## B. ESP32 power to sensors (3.3 V)

| From | To |
|------|----|
| ESP32 3.3V | ADS1015 VDD |
| ESP32 3.3V | AD8232 3.3V |
| ADS1015 VDD | 0.47 µF capacitor lead A |
| ADS1015 GND | 0.47 µF capacitor lead B |
| AD8232 3.3V | 10 nF capacitor lead A |
| AD8232 GND | 10 nF capacitor lead B |

---

## C. ADS1015 ↔ ESP32 (I2C + analog)

| From | To |
|------|----|
| ADS1015 SDA | ESP32 GPIO21 |
| ADS1015 SCL | ESP32 GPIO22 |
| ADS1015 ADDR | GND |
| ADS1015 A0 | LM358 pin 1 |
| ADS1015 A1 | *(leave unconnected)* |
| ADS1015 A2 | *(leave unconnected)* |
| ADS1015 A3 | *(leave unconnected)* |

Expected I2C address with ADDR→GND: **0x48**

---

## D. AD8232 ↔ ESP32 / LM358

| From | To |
|------|----|
| AD8232 OUTPUT | LM358 pin 3 |
| AD8232 LO+ | ESP32 GPIO32 |
| AD8232 LO- | ESP32 GPIO34 |

---

## E. LM358P (unity-gain buffer)

| From | To |
|------|----|
| Mega 5V | LM358 pin 8 |
| LM358 pin 4 | GND |
| LM358 pin 8 | 100 nF capacitor lead A |
| LM358 pin 4 | 100 nF capacitor lead B |
| LM358 pin 1 | LM358 pin 2 |
| LM358 pin 1 | ADS1015 A0 |
| LM358 pin 3 | AD8232 OUTPUT |
| LM358 pin 5 | GND |
| LM358 pin 6 | LM358 pin 7 |

---

## F. Mega ↔ 8×2 HD44780 LCD

| From | To |
|------|----|
| Mega 5V | LCD VDD |
| Mega GND | LCD VSS |
| Mega GND | LCD RW |
| Mega D7 | LCD RS |
| Mega D8 | LCD E |
| Mega D9 | LCD D4 |
| Mega D10 | LCD D5 |
| Mega D11 | LCD D6 |
| Mega D12 | LCD D7 |
| Mega 5V | 10k pot outer pin A |
| Mega GND | 10k pot outer pin B |
| 10k pot middle (wiper) | LCD VO |

Optional backlight (only if your LCD has A/K pins):

| From | To |
|------|----|
| Mega 5V | resistor (e.g. 220 Ω) → LCD backlight A (anode) |
| Mega GND | LCD backlight K (cathode) |

---

## G. Mega ↔ status LED

| From | To |
|------|----|
| Mega D6 | 220 Ω resistor lead A |
| 220 Ω resistor lead B | LED anode (+) |
| LED cathode (−) | GND |

---

## H. Mega ↔ active buzzer (NPN driver)

| From | To |
|------|----|
| Mega D5 | 1k Ω resistor lead A |
| 1k Ω resistor lead B | NPN base |
| NPN emitter | GND |
| NPN collector | buzzer negative (−) |
| Mega 5V | buzzer positive (+) |

---

## I. USB power (for bring-up)

| From | To |
|------|----|
| PC USB | ESP32 USB port |
| PC USB | Mega USB port |

Do **not** connect Mega digital pins to ESP32 GPIOs (5 V vs 3.3 V).

---

## J. Firmware pin map (quick reference)

### ESP32 code pins

| Signal | ESP32 pin |
|--------|-----------|
| ADS1015 SDA | GPIO21 |
| ADS1015 SCL | GPIO22 |
| AD8232 LO+ | GPIO32 |
| AD8232 LO- | GPIO34 |
| ADS1015 analog | A0 (via LM358 pin 1) |

### Mega code pins

| Signal | Mega pin |
|--------|----------|
| Buzzer (NPN base via 1k) | D5 |
| Status LED (via 220 Ω) | D6 |
| LCD RS | D7 |
| LCD E | D8 |
| LCD D4 | D9 |
| LCD D5 | D10 |
| LCD D6 | D11 |
| LCD D7 | D12 |

---

## K. After wiring — what you should see

| Board | Expected |
|-------|----------|
| Mega | LED ON; LCD shows blocks then `PROJECT` / `READY` (adjust contrast pot if blank); short beep in test |
| ESP32 Serial 115200 | `# ADS1015 detected` then CSV: `timestamp_us,raw,voltage,lead_off` |

If ESP32 prints ADS1015 missing: recheck table **C** (SDA/SCL/3.3V/ADDR/GND).
