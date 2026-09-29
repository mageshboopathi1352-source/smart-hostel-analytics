/*
 * AIoT Smart Hostel Environment Analytics & Anomaly Prediction
 * Firmware for ESP32 with DHT11/DHT22, LDR, PIR, MQ-135, Buzzer, LED
 * 
 * Hardware Pin Mapping:
 * - DHT22 / DHT11 DATA : GPIO 4   (Internal pull-up or 10k resistor to 3.3V)
 * - LDR Analog In      : GPIO 34  (ADC1_CH6 - Input only, safe analog pin)
 * - MQ-135 Analog In   : GPIO 35  (ADC1_CH7 - Input only, safe analog pin)
 * - PIR Motion Sensor  : GPIO 27  (Digital Input)
 * - Alert Buzzer       : GPIO 26  (Digital Output)
 * - Status / Alert LED : GPIO 2   (Onboard / External LED Output)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // ArduinoJson library v6 or v7
#include "DHT.h"

// ================= USER CONFIGURATION =================
const char* WIFI_SSID     = "HOSTEL_WIFI_SSID";
const char* WIFI_PASSWORD = "HOSTEL_WIFI_PASSWORD";

// FastAPI Backend URL endpoint for sensor ingestion
const char* BACKEND_URL   = "http://192.168.1.100:8000/api/sensor-data";

// Device Identification
const int   ROOM_ID       = 101;
const char* DEVICE_ID     = "ESP32_HOSTEL_101";

// Sensor loop interval (milliseconds)
const unsigned long SENSOR_INTERVAL_MS = 5000; // 5 seconds
// =======================================================

// Pin Definitions
#define DHTPIN       4
#define DHTTYPE      DHT22   // or DHT11
#define LDR_PIN      34
#define MQ135_PIN    35
#define PIR_PIN      27
#define BUZZER_PIN   26
#define LED_PIN      2

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastReadTime = 0;
int consecutiveFailures = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("AIoT Smart Hostel Environment Node Starting...");
  Serial.printf("Room ID: %d | Device: %s\n", ROOM_ID, DEVICE_ID);
  Serial.println("==================================================");

  // Initialize GPIOs
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  // Initialize DHT
  dht.begin();

  // Connect to Wi-Fi
  connectWiFi();
}

void connectWiFi() {
  Serial.printf("\nConnecting to Wi-Fi SSID: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Flash LED while connecting
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.printf("[WiFi] IP Address: %s | RSSI: %d dBm\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.println("\n[WiFi] Connection failed! Will retry in main loop...");
  }
}

void soundAlarm(int beeps, int delayMs) {
  for (int i = 0; i < beeps; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void loop() {
  unsigned long now = millis();

  // Check Wi-Fi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    if (now - lastReadTime >= 10000) {
      Serial.println("[WiFi] Connection lost. Attempting reconnection...");
      connectWiFi();
      lastReadTime = now;
    }
    return;
  }

  // Periodic sensor acquisition & transmission
  if (now - lastReadTime >= SENSOR_INTERVAL_MS) {
    lastReadTime = now;

    // 1. Read DHT
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();

    // 2. Read Light Dependent Resistor (LDR) (0 - 4095 on 12-bit ADC)
    int ldrRaw = analogRead(LDR_PIN);
    // Convert to scaled Lux approx (0 - 1000)
    int lightIntensity = map(ldrRaw, 0, 4095, 0, 1000);

    // 3. Read PIR Motion Sensor
    int motionDetected = digitalRead(PIR_PIN);

    // 4. Read MQ-135 Gas / Air Quality sensor (ADC 0 - 4095)
    int mqRaw = analogRead(MQ135_PIN);
    float airQualityPpm = (mqRaw / 4095.0) * 300.0 + 30.0; // Scaled PPM estimation

    // Sensor Validation
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[Sensor Error] Failed to read from DHT sensor! Retrying next cycle...");
      return;
    }

    Serial.println("\n-------------------------------------------");
    Serial.printf("[Sensors] Room: %d | Temp: %.1f °C | Humidity: %.1f %%\n", ROOM_ID, temperature, humidity);
    Serial.printf("[Sensors] Light: %d lx | Motion: %s | Air Quality: %.1f ppm\n", 
                  lightIntensity, motionDetected ? "YES" : "NO", airQualityPpm);

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["room_id"]      = ROOM_ID;
    doc["temperature"]  = round(temperature * 10.0) / 10.0;
    doc["humidity"]     = round(humidity * 10.0) / 10.0;
    doc["light"]        = lightIntensity;
    doc["motion"]       = motionDetected;
    doc["air_quality"]  = round(airQualityPpm * 10.0) / 10.0;
    doc["is_simulated"] = false;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // Transmit via HTTP POST to FastAPI
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000);

    Serial.printf("[HTTP] POST %s -> %s\n", BACKEND_URL, jsonPayload.c_str());
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String responseBody = http.getString();
      Serial.printf("[HTTP] Response [%d]: %s\n", httpResponseCode, responseBody.c_str());

      // Parse response to check for real-time anomaly alarm trigger
      StaticJsonDocument<512> respDoc;
      DeserializationError err = deserializeJson(respDoc, responseBody);
      if (!err) {
        bool isAnomaly = respDoc["is_anomaly"] | false;
        const char* severity = respDoc["severity"] | "NORMAL";

        if (isAnomaly) {
          Serial.printf("[ALARM TRIGGERED] Severity: %s - Activating Buzzer & LED!\n", severity);
          if (strcmp(severity, "CRITICAL") == 0) {
            soundAlarm(3, 150); // 3 rapid beeps for critical
          } else {
            soundAlarm(1, 200); // 1 beep for warning
          }
        }
      }
      consecutiveFailures = 0;
    } else {
      Serial.printf("[HTTP] Error sending POST: %s (Code: %d)\n", 
                    http.errorToString(httpResponseCode).c_str(), httpResponseCode);
      consecutiveFailures++;
      if (consecutiveFailures >= 5) {
        Serial.println("[HTTP] Multiple failures detected. Testing network connection...");
      }
    }
    http.end();
  }
}
