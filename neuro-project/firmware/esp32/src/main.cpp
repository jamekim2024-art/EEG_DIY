/*
 * ESP32-WROOM-32 — Biosignal acquisition (neuro-project)
 * CSV: timestamp_us,raw,voltage,lead_off
 * If ADS1015 missing: FALLBACK mode (synthetic waveform + real lead-off/buzzer)
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <math.h>

static const int PIN_SDA = 21;
static const int PIN_SCL = 22;
static const int PIN_LO_PLUS = 32;
static const int PIN_LO_MINUS = 34;
static const int PIN_LED = 2;
static const int PIN_BUZZER = 4;

static const uint32_t SAMPLE_RATE_HZ = 250;
static const uint32_t SAMPLE_INTERVAL_US = 1000000UL / SAMPLE_RATE_HZ;
static const uint32_t HEARTBEAT_INTERVAL_MS = 5000;

static const uint8_t ADS_ADDRS[] = {0x48, 0x49, 0x4A, 0x4B};

Adafruit_ADS1015 ads;
static uint8_t adsI2cAddr = 0x48;

static uint32_t nextSampleUs = 0;
static uint32_t lastHeartbeatMs = 0;
static uint32_t sampleCount = 0;
static bool acquisitionEnabled = false;
static bool adsFallbackMode = false;

static void diag(const char *msg) {
  Serial.print(F("# "));
  Serial.println(msg);
}

static void setStatusLED(bool on) {
  digitalWrite(PIN_LED, on ? HIGH : LOW);
}

static void setBuzzer(bool on) {
  digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
}

static void scanI2C() {
  diag("I2C scan begin (SDA=21, SCL=22)");
  uint8_t found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("# I2C device at 0x"));
      if (addr < 16) Serial.print('0');
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) {
    diag("I2C scan: no devices (fallback mode still runs for lead-off test)");
  }
}

static bool tryBeginAds(uint8_t addr) {
  for (uint8_t attempt = 0; attempt < 3; attempt++) {
    if (ads.begin(addr)) {
      adsI2cAddr = addr;
      return true;
    }
    delay(50);
  }
  return false;
}

static bool initAds1015() {
  for (uint8_t i = 0; i < sizeof(ADS_ADDRS); i++) {
    const uint8_t addr = ADS_ADDRS[i];
    if (tryBeginAds(addr)) {
      Serial.print(F("# ADS1015 detected at 0x"));
      if (addr < 16) Serial.print('0');
      Serial.println(addr, HEX);
      return true;
    }
  }
  return false;
}

static void startFallbackMode() {
  adsFallbackMode = true;
  diag("mode=fallback_no_ads");
  diag("ADS1015 not found — FALLBACK: synthetic waveform @ 250 Hz");
  diag("Lead-off, LED, buzzer still work (GPIO32/34). Fix I2C when ready.");
  diag("Wiring help: neuro-project/docs/ADS1015_WIRING.md");
}

static void fallbackSample(int16_t *rawOut, float *voltOut) {
  const float t = sampleCount / (float)SAMPLE_RATE_HZ;
  const float v = 1.65f + 0.04f * sinf(2.0f * PI * 10.0f * t);
  *voltOut = v;
  *rawOut = (int16_t)(v * 2048.0f);
}

static void emitSample(uint32_t timestampUs, int16_t raw, float voltage, bool leadOff) {
  Serial.print(timestampUs);
  Serial.print(',');
  Serial.print(raw);
  Serial.print(',');
  Serial.print(voltage, 6);
  Serial.print(',');
  Serial.println(leadOff ? 1 : 0);

#if OUTPUT_PLOTTER
  Serial.print(F("voltage:"));
  Serial.print(voltage, 6);
  Serial.print(F(",raw:"));
  Serial.print(raw);
  Serial.print(F(",lead_off:"));
  Serial.println(leadOff ? 1 : 0);
#endif
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_LO_PLUS, INPUT);
  pinMode(PIN_LO_MINUS, INPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  setStatusLED(false);
  setBuzzer(false);

  diag("neuro-project ESP32 firmware");
  diag("Educational prototype — NOT a medical device");

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000);
  delay(100);

  scanI2C();

  if (initAds1015()) {
    ads.setGain(GAIN_ONE);
    adsFallbackMode = false;
  } else {
    startFallbackMode();
  }

  diag("Sample rate target: 250 Hz");
  Serial.println(F("# timestamp_us,raw,voltage,lead_off"));

  acquisitionEnabled = true;
  setStatusLED(true);
  nextSampleUs = micros();
  lastHeartbeatMs = millis();
}

void loop() {
  if (!acquisitionEnabled) return;

  const uint32_t nowUs = micros();
  if ((int32_t)(nowUs - nextSampleUs) >= 0) {
    const bool leadOff =
        (digitalRead(PIN_LO_PLUS) == HIGH) ||
        (digitalRead(PIN_LO_MINUS) == HIGH);

    int16_t raw;
    float voltage;
    if (adsFallbackMode) {
      fallbackSample(&raw, &voltage);
    } else {
      raw = ads.readADC_SingleEnded(0);
      voltage = ads.computeVolts(raw);
    }

    emitSample(nowUs, raw, voltage, leadOff);

    if (leadOff) {
      setStatusLED(false);
      setBuzzer(true);
    } else {
      setStatusLED(true);
      setBuzzer(false);
    }

    sampleCount++;
    nextSampleUs += SAMPLE_INTERVAL_US;
    if ((int32_t)(nowUs - nextSampleUs) > (int32_t)(SAMPLE_INTERVAL_US * 4)) {
      nextSampleUs = nowUs + SAMPLE_INTERVAL_US;
    }
  }

  const uint32_t nowMs = millis();
  if ((nowMs - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = nowMs;
    Serial.print(F("# heartbeat samples="));
    Serial.print(sampleCount);
    if (adsFallbackMode) {
      Serial.println(F(" fallback=1"));
      if (initAds1015()) {
        ads.setGain(GAIN_ONE);
        adsFallbackMode = false;
        diag("ADS1015 recovered — switching to real ADC");
      }
    } else {
      Serial.println();
    }
  }
}
