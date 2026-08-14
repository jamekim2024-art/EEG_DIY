#include <LiquidCrystal.h>

/*
  Arduino Mega R3 display and alert board.

  Receives status lines from the ESP32 over Serial1 and drives:
    - 16x2 LCD (5 V, parallel 4-bit mode)
    - Status LED
    - Lead-off buzzer
*/

#define ESP_RX 19
#define ESP_TX 18

#define LED_PIN 8
#define BUZZER_PIN 10

LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

char lineBuffer[48];
byte lineIndex = 0;

unsigned long lastLCDUpdate = 0;

bool leadOff = false;
float voltage = 0.0f;
long sampleCounter = 0;

void showBootScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("NEURO V1");
  lcd.setCursor(0, 1);
  lcd.print("WAIT ESP32");
}

void showReadyScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("READY");
  lcd.setCursor(0, 1);
  lcd.print("MEGA + ESP32");
}

void showErrorScreen(const char *message) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ERROR");
  lcd.setCursor(0, 1);
  lcd.print(message);
}

void showLeadOffScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LEAD OFF");
  lcd.setCursor(0, 1);
  lcd.print("CHECK");
}

void showRunningScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("V:");
  lcd.print(voltage, 2);
  lcd.setCursor(0, 1);
  lcd.print("RUN ");
  lcd.print(sampleCounter);
}

void updateOutputs() {
  if (leadOff) {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, LOW);
  }

  if (millis() - lastLCDUpdate >= 250) {
    lastLCDUpdate = millis();

    if (leadOff) {
      showLeadOffScreen();
    } else {
      showRunningScreen();
    }
  }
}

void handleLine() {
  lineBuffer[lineIndex] = '\0';
  lineIndex = 0;

  if (lineBuffer[0] == 'R' && lineBuffer[1] == ',') {
    showReadyScreen();
    digitalWrite(LED_PIN, HIGH);
    return;
  }

  if (lineBuffer[0] == 'E' && lineBuffer[1] == ',') {
    showErrorScreen(lineBuffer + 2);
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, HIGH);
    return;
  }

  if (lineBuffer[0] == 'S' && lineBuffer[1] == ',') {
    int leadValue = 0;
    float newVoltage = 0.0f;
    long newCounter = 0;

    if (sscanf(lineBuffer + 2, "%d,%f,%ld", &leadValue, &newVoltage, &newCounter) == 3) {
      leadOff = (leadValue != 0);
      voltage = newVoltage;
      sampleCounter = newCounter;
      updateOutputs();
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  lcd.begin(16, 2);
  showBootScreen();
}

void loop() {
  while (Serial1.available()) {
    char c = Serial1.read();

    if (c == '\n' || c == '\r') {
      if (lineIndex > 0) {
        handleLine();
      }
      continue;
    }

    if (lineIndex < sizeof(lineBuffer) - 1) {
      lineBuffer[lineIndex++] = c;
    }
  }
}
