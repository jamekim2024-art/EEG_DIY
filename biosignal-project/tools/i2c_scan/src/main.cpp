/*
 * ESP32 I2C scanner — optional diagnostic utility
 * SDA=GPIO21, SCL=GPIO22 (same as acquisition firmware)
 */

#include <Arduino.h>
#include <Wire.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(21, 22);
  Serial.println(F("# I2C scanner ready (SDA=21, SCL=22)"));
}

void loop() {
  Serial.println(F("# --- scan ---"));
  uint8_t found = 0;

  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("# found 0x"));
      if (addr < 16) Serial.print('0');
      Serial.println(addr, HEX);
      found++;
    }
  }

  if (found == 0) {
    Serial.println(F("# no I2C devices — check wiring / 3.3V / GND"));
  }

  delay(2000);
}
