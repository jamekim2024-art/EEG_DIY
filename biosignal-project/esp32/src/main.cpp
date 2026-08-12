/*
 * ============================================================
 * ESP32-WROOM-32 — Biosignal acquisition firmware
 * ============================================================
 *
 * Role:
 *   - Read AD8232 conditioned output via ADS1015 (channel A0)
 *   - Sample at ~250 Hz using micros() timing (non-blocking)
 *   - Read AD8232 lead-off pins (LO+, LO-)
 *   - Stream timestamped CSV over USB Serial
 *
 * CSV format (data lines — no leading '#'):
 *   timestamp_us,raw,voltage,lead_off
 *
 * Diagnostic lines start with '#' so parsers can ignore them.
 *
 * SAFETY:
 *   Educational prototype only — NOT a medical device.
 *   Do not attach electrodes to a person while USB / wall /
 *   bench supplies (mains-referenced) are connected.
 * ============================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>

// ------------------------------------------------------------
// Pin map (ESP32-WROOM-32)
// ------------------------------------------------------------
// GPIO21 / GPIO22  — standard ESP32 I2C pins
// GPIO32           — digital input (LO+)
// GPIO34           — input-only pad (no internal pull-up);
//                    fine for AD8232 LO- which actively drives
// ------------------------------------------------------------

static const int PIN_SDA = 21;
static const int PIN_SCL = 22;

static const int PIN_LO_PLUS = 32;   // AD8232 LO+
static const int PIN_LO_MINUS = 34;  // AD8232 LO- (input-only GPIO)

// ------------------------------------------------------------
// Sampling: 250 Hz => 4000 us between samples
// ------------------------------------------------------------

static const uint32_t SAMPLE_RATE_HZ = 250;
static const uint32_t SAMPLE_INTERVAL_US = 1000000UL / SAMPLE_RATE_HZ;

// How often to print a diagnostic heartbeat (not CSV)
static const uint32_t HEARTBEAT_INTERVAL_MS = 5000;

// ------------------------------------------------------------
// ADS1015 (I2C address 0x48 when ADDR -> GND)
// ------------------------------------------------------------

Adafruit_ADS1015 ads;

// Timing state (kept as globals — no heap allocation)
static uint32_t nextSampleUs = 0;
static uint32_t lastHeartbeatMs = 0;
static uint32_t sampleCount = 0;
static bool acquisitionEnabled = false;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Print a diagnostic line (always starts with '#'). */
static void diag(const char *msg) {
  Serial.print(F("# "));
  Serial.println(msg);
}

/**
 * Halt safely if the ADS1015 cannot be found.
 * Prints diagnostics and stops acquisition (idle loop).
 */
static void haltAdsMissing() {
  diag("ERROR: ADS1015 not found on I2C");
  diag("Check: SDA=GPIO21, SCL=GPIO22, VDD=3.3V, ADDR=GND, common GND");
  diag("Expected I2C address: 0x48");
  diag("Acquisition stopped. Reset after fixing wiring.");
  acquisitionEnabled = false;

  // Non-blocking idle: still service Serial, no delay() spam
  while (true) {
    // Keep watchdog happy / allow serial tools to stay connected
    delay(500);
    diag("waiting — ADS1015 still missing");
  }
}

/**
 * Optional: scan I2C bus once at startup (diagnostic only).
 * Does not allocate memory.
 */
static void scanI2C() {
  diag("I2C scan begin");
  uint8_t found = 0;

  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    const uint8_t err = Wire.endTransmission();
    if (err == 0) {
      Serial.print(F("# I2C device at 0x"));
      if (addr < 16) {
        Serial.print('0');
      }
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

// ------------------------------------------------------------
// Setup
// ------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  // Short settle for USB-CDC / host to open the port
  delay(1000);

  diag("ESP32 biosignal firmware starting");
  diag("Educational prototype — NOT a medical device");

  // Lead-off pins as digital inputs
  pinMode(PIN_LO_PLUS, INPUT);
  pinMode(PIN_LO_MINUS, INPUT);

  // I2C on the documented ESP32 pins
  Wire.begin(PIN_SDA, PIN_SCL);

  scanI2C();

  // Default ADDR->GND => 0x48 (Adafruit_ADS1015::begin uses 0x48)
  if (!ads.begin(0x48)) {
    haltAdsMissing();
  }

  /*
   * GAIN_ONE => +/- 4.096 V full-scale (ADS1015).
   * Keep inputs within the ADS1015 VDD (3.3 V) absolute ratings.
   * AD8232 at 3.3 V typically sits near mid-supply (~1.5 V).
   */
  ads.setGain(GAIN_ONE);

  diag("ADS1015 detected at 0x48, gain=GAIN_ONE");
  diag("Sample rate target: 250 Hz");
  diag("CSV header follows (parsers may skip '#' lines)");

  // CSV header for convenience (comment-style so it is not numeric data)
  Serial.println(F("# timestamp_us,raw,voltage,lead_off"));

  acquisitionEnabled = true;
  nextSampleUs = micros();
  lastHeartbeatMs = millis();
}

// ------------------------------------------------------------
// Loop — non-blocking 250 Hz sampler
// ------------------------------------------------------------

void loop() {
  if (!acquisitionEnabled) {
    return;
  }

  const uint32_t nowUs = micros();

  /*
   * Drift-resistant schedule:
   * Advance the deadline by fixed intervals. If we fall behind
   * (USB busy, etc.), catch up by taking the late sample and
   * moving nextSampleUs forward — without busy-waiting.
   */
  if ((int32_t)(nowUs - nextSampleUs) >= 0) {
    // Capture timestamp closest to sample instant
    const uint32_t timestampUs = nowUs;

    // AD8232: LO+ or LO- HIGH usually means a lead is off
    const bool leadOff =
        (digitalRead(PIN_LO_PLUS) == HIGH) ||
        (digitalRead(PIN_LO_MINUS) == HIGH);

    // Single-ended read on A0 (LM358 buffer output)
    const int16_t raw = ads.readADC_SingleEnded(0);
    const float voltage = ads.computeVolts(raw);

    // CSV data line (no '#')
    Serial.print(timestampUs);
    Serial.print(',');
    Serial.print(raw);
    Serial.print(',');
    Serial.print(voltage, 6);
    Serial.print(',');
    Serial.println(leadOff ? 1 : 0);

    sampleCount++;

    // Schedule next sample; if badly behind, resync to "now"
    nextSampleUs += SAMPLE_INTERVAL_US;
    if ((int32_t)(nowUs - nextSampleUs) > (int32_t)(SAMPLE_INTERVAL_US * 4)) {
      nextSampleUs = nowUs + SAMPLE_INTERVAL_US;
      diag("timing resync (host/USB backlog)");
    }
  }

  // Periodic heartbeat (diagnostic only)
  const uint32_t nowMs = millis();
  if ((nowMs - lastHeartbeatMs) >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = nowMs;
    Serial.print(F("# heartbeat samples="));
    Serial.println(sampleCount);
  }
}
