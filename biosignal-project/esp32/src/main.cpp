/*
 * ============================================================
 * ESP32-WROOM-32 — Biosignal acquisition (standalone)
 * ============================================================
 *
 * No Arduino Mega / no LCD in this build.
 *
 * Role:
 *   - Read AD8232 conditioned output via ADS1015 (A0)
 *   - Sample at ~250 Hz (micros timing, non-blocking)
 *   - Read AD8232 lead-off (LO+, LO-)
 *   - Status LED + buzzer for lead-off
 *   - Stream CSV over USB Serial
 *
 * CSV: timestamp_us,raw,voltage,lead_off
 * Diagnostics start with '#'
 *
 * SAFETY: Educational prototype only — NOT a medical device.
 * Do not attach electrodes to a person while USB / mains-connected
 * equipment is connected.
 * ============================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// ------------------------------------------------------------
// Pin map (ESP32-WROOM-32 only)
// ------------------------------------------------------------

static const int PIN_SDA = 21;
static const int PIN_SCL = 22;

static const int PIN_LO_PLUS = 32;   // AD8232 LO+
static const int PIN_LO_MINUS = 34;  // AD8232 LO- (input-only GPIO)

static const int PIN_LED = 2;        // status LED (via resistor)
static const int PIN_BUZZER = 4;     // active buzzer via NPN

// ------------------------------------------------------------
// Sampling: 250 Hz => 4000 us
// ------------------------------------------------------------

static const uint32_t SAMPLE_RATE_HZ = 250;
static const uint32_t SAMPLE_INTERVAL_US = 1000000UL / SAMPLE_RATE_HZ;
static const uint32_t HEARTBEAT_INTERVAL_MS = 5000;

Adafruit_ADS1015 ads;

static uint32_t nextSampleUs = 0;
static uint32_t lastHeartbeatMs = 0;
static uint32_t sampleCount = 0;
static bool acquisitionEnabled = false;

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

static void haltAdsMissing() {
  diag("ERROR: ADS1015 not found on I2C");
  diag("Check: SDA=GPIO21, SCL=GPIO22, VDD=3.3V, ADDR=GND, common GND");
  diag("Expected I2C address: 0x48");
  diag("Acquisition stopped. Reset after fixing wiring.");
  acquisitionEnabled = false;

  while (true) {
    setStatusLED(true);
    delay(200);
    setStatusLED(false);
    delay(200);
    diag("waiting — ADS1015 still missing");
  }
}

static void scanI2C() {
  diag("I2C scan begin");
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
    diag("I2C scan: no devices found");
  } else {
    Serial.print(F("# I2C scan: "));
    Serial.print(found);
    Serial.println(F(" device(s) found"));
  }
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

  diag("ESP32 standalone biosignal firmware");
  diag("No Mega / no LCD in this build");
  diag("Educational prototype — NOT a medical device");

  Wire.begin(PIN_SDA, PIN_SCL);
  scanI2C();

  if (!ads.begin(0x48)) {
    haltAdsMissing();
  }

  ads.setGain(GAIN_ONE);

  diag("ADS1015 detected at 0x48, gain=GAIN_ONE");
  diag("Sample rate target: 250 Hz");
  Serial.println(F("# timestamp_us,raw,voltage,lead_off"));

  setStatusLED(true);
  acquisitionEnabled = true;
  nextSampleUs = micros();
  lastHeartbeatMs = millis();
}

void loop() {
  if (!acquisitionEnabled) {
    return;
  }

  const uint32_t nowUs = micros();

  if ((int32_t)(nowUs - nextSampleUs) >= 0) {
    const uint32_t timestampUs = nowUs;

    const bool leadOff =
        (digitalRead(PIN_LO_PLUS) == HIGH) ||
        (digitalRead(PIN_LO_MINUS) == HIGH);

    const int16_t raw = ads.readADC_SingleEnded(0);
    const float voltage = ads.computeVolts(raw);

    Serial.print(timestampUs);
    Serial.print(',');
    Serial.print(raw);
    Serial.print(',');
    Serial.print(voltage, 6);
    Serial.print(',');
    Serial.println(leadOff ? 1 : 0);

    // Serial Plotter friendly (Arduino IDE 2 labeled series)
    Serial.print(F("voltage:"));
    Serial.print(voltage, 6);
    Serial.print(F(",raw:"));
    Serial.print(raw);
    Serial.print(F(",lead_off:"));
    Serial.println(leadOff ? 1 : 0);

    // Lead-off indicators (Mega/LCD removed)
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
      diag("timing resync (host/USB backlog)");
    }
  }

  const uint32_t nowMs = millis();
  if ((nowMs - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = nowMs;
    Serial.print(F("# heartbeat samples="));
    Serial.println(sampleCount);
  }
}
