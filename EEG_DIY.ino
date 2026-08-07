#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <LiquidCrystal.h>

// -------------------------------
// ADS1015
// -------------------------------

Adafruit_ADS1015 ads;

// I2C
#define SDA_PIN 21
#define SCL_PIN 22

// -------------------------------
// AD8232 lead detection
// -------------------------------

#define LO_PLUS  32
#define LO_MINUS 34

// -------------------------------
// Output indicators
// -------------------------------

#define LED_PIN    2
#define BUZZER_PIN 4

// -------------------------------
// LCD
// RS, E, D4, D5, D6, D7
// -------------------------------

LiquidCrystal lcd(
  13,
  14,
  27,
  26,
  25,
  33
);

// -------------------------------
// Sampling
// -------------------------------

const int SAMPLE_RATE = 250;

const unsigned long SAMPLE_INTERVAL =
    1000000UL / SAMPLE_RATE;

unsigned long lastSample = 0;
unsigned long lastLCDUpdate = 0;

long sampleCounter = 0;

void setup() {

  Serial.begin(115200);

  delay(1000);

  // -------------------------
  // GPIO
  // -------------------------

  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // -------------------------
  // LCD
  // -------------------------

  lcd.begin(8, 2);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("NEURO V1");

  lcd.setCursor(0, 1);
  lcd.print("START...");

  // -------------------------
  // I2C
  // -------------------------

  Wire.begin(SDA_PIN, SCL_PIN);

  // -------------------------
  // ADS1015
  // -------------------------

  if (!ads.begin()) {

    lcd.clear();

    lcd.setCursor(0, 0);
    lcd.print("ADC ERR");

    Serial.println("ADS1015 NOT FOUND");

    while (true) {

      digitalWrite(LED_PIN, HIGH);
      delay(200);

      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }

  /*
    Start with GAIN_ONE.

    This provides plenty of range
    for the conditioned AD8232 output.
  */

  ads.setGain(GAIN_ONE);

  // -------------------------
  // Ready
  // -------------------------

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("READY");

  digitalWrite(LED_PIN, HIGH);

  Serial.println(
    "time_us,raw,voltage,lead_off"
  );

  lastSample = micros();
}

void loop() {

  unsigned long now = micros();

  // --------------------------------
  // Read approximately 250 Hz
  // --------------------------------

  if (
    now - lastSample >= SAMPLE_INTERVAL
  ) {

    lastSample += SAMPLE_INTERVAL;

    // -----------------------------
    // Electrode connection
    // -----------------------------

    bool leadOff =
      digitalRead(LO_PLUS) ||
      digitalRead(LO_MINUS);

    // -----------------------------
    // Read ADC
    // -----------------------------

    int16_t raw =
      ads.readADC_SingleEnded(0);

    float voltage =
      ads.computeVolts(raw);

    sampleCounter++;

    // -----------------------------
    // Serial CSV
    // -----------------------------

    Serial.print(now);

    Serial.print(",");

    Serial.print(raw);

    Serial.print(",");

    Serial.print(voltage, 6);

    Serial.print(",");

    Serial.println(
      leadOff ? 1 : 0
    );

    // -----------------------------
    // Status outputs
    // -----------------------------

    if (leadOff) {

      digitalWrite(LED_PIN, LOW);
      digitalWrite(BUZZER_PIN, HIGH);

    } else {

      digitalWrite(LED_PIN, HIGH);
      digitalWrite(BUZZER_PIN, LOW);
    }

    // -----------------------------
    // LCD every 250 ms
    // -----------------------------

    if (
      millis() - lastLCDUpdate >= 250
    ) {

      lastLCDUpdate = millis();

      lcd.clear();

      if (leadOff) {

        lcd.setCursor(0, 0);
        lcd.print("LEAD OFF");

        lcd.setCursor(0, 1);
        lcd.print("CHECK");

      } else {

        lcd.setCursor(0, 0);

        lcd.print("V:");
        lcd.print(voltage, 2);

        lcd.setCursor(0, 1);
        lcd.print("RUN ");
        lcd.print(sampleCounter % 10000);
      }
    }
  }
}