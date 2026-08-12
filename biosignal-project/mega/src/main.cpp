/*
 * Mega LCD bring-up diagnostic
 * - Proves Mega is alive (LED blink + beep + Serial)
 * - Drives HD44780 hard so contrast/backlight issues are obvious
 *
 * Pins (must match wiring):
 *   LCD RS=7 E=8 D4=9 D5=10 D6=11 D7=12
 *   LED=6  BUZZER=5
 */

#include <Arduino.h>
#include <LiquidCrystal.h>

static const uint8_t PIN_LED = 6;
static const uint8_t PIN_BUZZER = 5;

LiquidCrystal lcd(7, 8, 9, 10, 11, 12);

static void beep(uint16_t ms) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(ms);
  digitalWrite(PIN_BUZZER, LOW);
}

static void ledBlink(uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(PIN_LED, HIGH);
    delay(150);
    digitalWrite(PIN_LED, LOW);
    delay(150);
  }
  digitalWrite(PIN_LED, HIGH);
}

static void paintBlocks() {
  lcd.clear();
  lcd.setCursor(0, 0);
  for (uint8_t i = 0; i < 8; i++) lcd.write(byte(0xFF));
  lcd.setCursor(0, 1);
  for (uint8_t i = 0; i < 8; i++) lcd.write(byte(0xFF));
}

static void paintText(const __FlashStringHelper *a, const __FlashStringHelper *b) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(a);
  lcd.setCursor(0, 1);
  lcd.print(b);
}

void setup() {
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, HIGH);

  Serial.begin(115200);
  delay(300);

  Serial.println(F("# ===== MEGA LCD DIAG ====="));
  Serial.println(F("# If LED on D6 is blinking, Mega firmware is running."));
  Serial.println(F("# LCD often has NO backlight — it will not 'light up'."));
  Serial.println(F("# Turn the 10k contrast pot (VO) slowly while blocks show."));
  Serial.println(F("# Wiring check:"));
  Serial.println(F("#   VSS->GND  VDD->5V  RW->GND"));
  Serial.println(F("#   RS->D7 E->D8 D4->D9 D5->D10 D6->D11 D7->D12"));
  Serial.println(F("#   VO->pot wiper; pot ends -> 5V and GND"));

  ledBlink(3);
  beep(120);

  // Give LCD power time to settle
  delay(200);

  // Try 8x2 first (your panel), then also refresh as 16x2-style init
  lcd.begin(8, 2);
  delay(100);
  lcd.display();
  lcd.noCursor();
  lcd.noBlink();

  Serial.println(F("# lcd.begin(8,2) done — showing FULL BLOCKS for 5s"));
  Serial.println(F("# >>> TURN CONTRAST POT NOW <<<"));
  paintBlocks();
  ledBlink(2);
  delay(5000);

  paintText(F("LCD OK?"), F("ADJ POT"));
  Serial.println(F("# showing: LCD OK? / ADJ POT"));
  delay(3000);

  paintText(F("PROJECT"), F("READY"));
  Serial.println(F("# showing: PROJECT / READY"));
  beep(80);
  digitalWrite(PIN_LED, HIGH);
}

void loop() {
  static uint32_t last = 0;
  static bool flip = false;
  const uint32_t now = millis();

  // Keep refreshing so a flaky init still gets driven
  if (now - last >= 2000) {
    last = now;
    flip = !flip;
    if (flip) {
      paintBlocks();
      Serial.println(F("# refresh: BLOCKS (adjust contrast)"));
    } else {
      paintText(F("PROJECT"), F("READY"));
      Serial.println(F("# refresh: PROJECT / READY"));
    }
    // Heartbeat blink
    digitalWrite(PIN_LED, LOW);
    delay(50);
    digitalWrite(PIN_LED, HIGH);
  }
}
