# EEG_DIY

Dual-board EEG monitor:

- **ESP32**: AD8232 lead detection + ADS1015 ADC + USB CSV logging
- **Arduino Mega R3**: LCD, LED, and buzzer on 5 V

## Why two boards?

The original design powered the LCD, ADS1015, AD8232, LED, and buzzer from the ESP32 3.3 V pin. That regulator is limited to about 500 mA. A 16x2 LCD backlight alone can draw 50-120 mA, and the LCD logic is much more reliable at **5 V**. When everything was stacked on the ESP32, the AD8232 could still appear to work while the LCD and other peripherals brown out and stay off.

Moving display and alert hardware to the Mega gives:

- Stable **5 V** for the LCD
- More current headroom from the Mega regulator
- ESP32 focused on sampling and serial output

## Microcontrollers and modules

| Part | Role | Powered from |
|------|------|--------------|
| ESP32 dev board | Main sampler, USB logging, talks to Mega | USB 5 V -> onboard 3.3 V |
| AD8232 module | ECG/EEG front-end, lead-off pins | ESP32 3.3 V |
| ADS1015 module | 12-bit I2C ADC for AD8232 output | ESP32 3.3 V |
| Arduino Mega R3 | LCD, LED, buzzer | USB 5 V or 7-12 V VIN |
| 16x2 LCD (HD44780) | On-screen voltage and status | Mega 5 V |
| LED | Lead connected indicator | Mega GPIO |
| Buzzer | Lead-off alert | Mega GPIO |

## Wiring

### Common ground (required)

Connect **ESP32 GND** and **Mega GND** together.

### ESP32 side

| ESP32 pin | Connect to |
|-----------|------------|
| 3.3 V | AD8232 3.3 V, ADS1015 VCC |
| GND | AD8232 GND, ADS1015 GND, Mega GND |
| GPIO 21 | ADS1015 SDA |
| GPIO 22 | ADS1015 SCL |
| GPIO 32 | AD8232 LO+ |
| GPIO 34 | AD8232 LO- |
| AD8232 OUTPUT | ADS1015 A0 |
| GPIO 17 (TX2) | Mega pin 19 (RX1) |
| GPIO 16 (RX2) | optional, not used in this build |
| USB | PC power + serial monitor |

Do **not** power the LCD from the ESP32 3.3 V pin anymore.

### Arduino Mega side

| Mega pin | Connect to |
|----------|------------|
| 5 V | LCD VCC, LCD backlight (A/+) if separate |
| GND | LCD GND, LED cathode side, buzzer GND |
| 19 (RX1) | ESP32 GPIO 17 (TX2) |
| 12 | LCD RS |
| 11 | LCD E |
| 5 | LCD D4 |
| 4 | LCD D5 |
| 3 | LCD D6 |
| 2 | LCD D7 |
| 8 | LED anode through 220 ohm resistor |
| 10 | Buzzer signal / active buzzer + |

### LCD contrast

Connect LCD pin **V0/VO** to the wiper of a 10K potentiometer. Pot ends go to 5 V and GND. Without this, the LCD can look blank even when powered.

### Serial link note

Only ESP32 TX -> Mega RX is required. ESP32 outputs 3.3 V logic, which the Mega accepts as HIGH on RX1. Do not connect Mega TX to ESP32 RX unless you add a level shifter.

## Power options

**Recommended**

1. Power ESP32 from USB.
2. Power Mega from a separate USB cable or 7-12 V on VIN.
3. Tie both grounds together.

**Minimum**

- One USB supply to the Mega for LCD power.
- ESP32 on its own USB for programming and CSV output.

## Upload

### ESP32

1. Open `EEG_DIY.ino` in Arduino IDE.
2. Install libraries: **Adafruit ADS1X15**.
3. Board: your ESP32 model.
4. Upload over USB.

### Arduino Mega

1. Open `EEG_DIY_Mega/EEG_DIY_Mega.ino`.
2. Board: **Arduino Mega or Mega 2560**.
3. Upload over USB.

Upload the ESP32 sketch first, then the Mega sketch.

## Serial protocol (ESP32 -> Mega)

| Line | Meaning |
|------|---------|
| `R,READY` | Acquisition started |
| `E,ADC` | ADS1015 not found |
| `S,<lead>,<voltage>,<counter>` | Status update every 250 ms |

Example: `S,0,1.23,5678`

## USB CSV output (ESP32)

115200 baud:

```text
time_us,raw,voltage,lead_off
```

## Expected behavior

1. Mega LCD shows `NEURO V1 / WAIT ESP32`.
2. After ESP32 starts, Mega shows `READY / MEGA + ESP32`.
3. With electrodes connected, LCD shows voltage and `RUN`.
4. With lead off, LED turns off and buzzer turns on.
