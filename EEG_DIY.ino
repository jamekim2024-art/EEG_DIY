#include <Wire.h>
#include <Adafruit_ADS1X15.h>

/*
  ESP32 EEG acquisition board.

  Handles:
    - AD8232 lead-off detection (LO+, LO-)
    - ADS1015 I2C ADC (reads conditioned AD8232 output)
    - USB serial CSV logging
    - Status packets to Arduino Mega over Serial2

  Display, LED, and buzzer run on the Mega so the LCD can use 5 V
  instead of overloading the ESP32 3.3 V regulator.
*/

Adafruit_ADS1015 ads;

#define SDA_PIN 21
#define SCL_PIN 22

#define LO_PLUS  32
#define LO_MINUS 34

#define MEGA_TX 17
#define MEGA_RX 16

#define MEGA_BAUD 115200

const int SAMPLE_RATE = 250;
const unsigned long SAMPLE_INTERVAL = 1000000UL / SAMPLE_RATE;

unsigned long lastSample = 0;
unsigned long lastMegaUpdate = 0;
long sampleCounter = 0;

void setup() {
  Serial.begin(115200);
  Serial2.begin(MEGA_BAUD, SERIAL_8N1, MEGA_RX, MEGA_TX);

  delay(1000);

  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!ads.begin()) {
    Serial.println("ADS1015 NOT FOUND");
    while (true) {
      Serial2.println("E,ADC");
      delay(500);
    }
  }

  ads.setGain(GAIN_ONE);

  Serial.println("time_us,raw,voltage,lead_off");
  Serial2.println("R,READY");

  lastSample = micros();
}

void loop() {
  unsigned long now = micros();

  if (now - lastSample >= SAMPLE_INTERVAL) {
    lastSample += SAMPLE_INTERVAL;

    bool leadOff =
      digitalRead(LO_PLUS) ||
      digitalRead(LO_MINUS);

    int16_t raw = ads.readADC_SingleEnded(0);
    float voltage = ads.computeVolts(raw);

    sampleCounter++;

    Serial.print(now);
    Serial.print(",");
    Serial.print(raw);
    Serial.print(",");
    Serial.print(voltage, 6);
    Serial.print(",");
    Serial.println(leadOff ? 1 : 0);

    if (millis() - lastMegaUpdate >= 250) {
      lastMegaUpdate = millis();

      Serial2.print("S,");
      Serial2.print(leadOff ? 1 : 0);
      Serial2.print(",");
      Serial2.print(voltage, 2);
      Serial2.print(",");
      Serial2.println(sampleCounter % 10000);
    }
  }
}
