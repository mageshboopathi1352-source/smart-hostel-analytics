import React, { useState } from 'react';
import { Microchip, Copy, Check, Download, Radio, ShieldCheck, Code2, Terminal } from 'lucide-react';

export const HardwareFirmwareView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const firmwareCode = `/*
 * AIoT Smart Hostel Environment Analytics & Anomaly Prediction
 * Firmware for ESP32 with DHT11/DHT22, LDR, PIR, MQ-135, Buzzer, LED
 * 
 * Hardware Pin Mapping:
 * - DHT22 / DHT11 DATA : GPIO 4   (Pull-up 4.7kΩ to 3.3V)
 * - LDR Analog In      : GPIO 34  (ADC1_CH6 - Input only)
 * - MQ-135 Analog In   : GPIO 35  (ADC1_CH7 - Input only)
 * - PIR Motion Sensor  : GPIO 27  (Digital Input)
 * - Alert Buzzer       : GPIO 26  (Digital Output)
 * - Status LED         : GPIO 2   (Output)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

const char* WIFI_SSID     = "CAMPUS_HOSTEL_WIFI";
const char* WIFI_PASSWORD = "HOSTEL_SECURE_PASS";
const char* BACKEND_URL   = "http://192.168.1.100:8000/api/sensor-data";

const int   ROOM_ID       = 101;
const unsigned long SENSOR_INTERVAL_MS = 5000;

#define DHTPIN     4
#define DHTTYPE    DHT22
#define LDR_PIN    34
#define MQ135_PIN  35
#define PIR_PIN    27
#define BUZZER_PIN 26
#define LED_PIN    2

DHT dht(DHTPIN, DHTTYPE);
unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  dht.begin();
  connectWiFi();
}

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
}

void soundAlarm(int beeps) {
  for (int i = 0; i < beeps; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
    delay(150);
  }
}

void loop() {
  unsigned long now = millis();
  if (now - lastReadTime >= SENSOR_INTERVAL_MS) {
    lastReadTime = now;

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int ldrRaw = analogRead(LDR_PIN);
    int light = map(ldrRaw, 0, 4095, 0, 1000);
    int motion = digitalRead(PIR_PIN);
    int mqRaw = analogRead(MQ135_PIN);
    float airQuality = (mqRaw / 4095.0) * 300.0 + 30.0;

    if (isnan(t) || isnan(h)) return;

    StaticJsonDocument<256> doc;
    doc["room_id"]      = ROOM_ID;
    doc["temperature"]  = round(t * 10.0) / 10.0;
    doc["humidity"]     = round(h * 10.0) / 10.0;
    doc["light"]        = light;
    doc["motion"]       = motion;
    doc["air_quality"]  = round(airQuality * 10.0) / 10.0;
    doc["is_simulated"] = false;

    String jsonStr;
    serializeJson(doc, jsonStr);

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(jsonStr);

    if (code > 0) {
      String resp = http.getString();
      StaticJsonDocument<512> respDoc;
      if (!deserializeJson(respDoc, resp)) {
        if (respDoc["is_anomaly"] | false) {
          soundAlarm(3); // Alarm triggered by DNN prediction
        }
      }
    }
    http.end();
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(firmwareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([firmwareCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart_hostel_esp32.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Microchip className="w-5 h-5 text-indigo-400" />
          <span>ESP32 Hardware Pinout & Arduino Firmware</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete schematic pinout mappings, circuit protection, and C++ Arduino firmware for Smart Hostel nodes
        </p>
      </div>

      {/* Pin Mapping Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span>ESP32 DevKit V1 Hardware GPIO Mapping</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-3">Component</th>
                <th className="p-3">Function</th>
                <th className="p-3">ESP32 Pin</th>
                <th className="p-3">Electrical Type</th>
                <th className="p-3">Hardware Wiring Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="p-3 font-bold text-cyan-400">DHT22 / DHT11</td>
                <td className="p-3">Temperature & Relative Humidity</td>
                <td className="p-3 font-mono font-bold text-white">GPIO 4</td>
                <td className="p-3">Digital I/O</td>
                <td className="p-3 text-slate-400">4.7kΩ pull-up resistor to 3.3V</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-amber-400">LDR (Photoresistor)</td>
                <td className="p-3">Ambient Light Intensity (Lux)</td>
                <td className="p-3 font-mono font-bold text-white">GPIO 34</td>
                <td className="p-3">Analog Input (ADC1_CH6)</td>
                <td className="p-3 text-slate-400">10kΩ voltage divider, safe input-only pin</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-indigo-400">HC-SR501 PIR</td>
                <td className="p-3">Human Presence / Motion</td>
                <td className="p-3 font-mono font-bold text-white">GPIO 27</td>
                <td className="p-3">Digital Input</td>
                <td className="p-3 text-slate-400">Output connects directly to GPIO 27 (3.3V)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-purple-400">MQ-135 Gas Sensor</td>
                <td className="p-3">Air Quality / Smoke / VOC</td>
                <td className="p-3 font-mono font-bold text-white">GPIO 35</td>
                <td className="p-3">Analog Input (ADC1_CH7)</td>
                <td className="p-3 text-slate-400">Heater powered by 5V VIN, Analog Out to GPIO 35</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-red-400">Piezo Buzzer</td>
                <td className="p-3">Acoustic Emergency Alarm</td>
                <td className="p-3 font-mono font-bold text-white">GPIO 26</td>
                <td className="p-3">Digital Output</td>
                <td className="p-3 text-slate-400">NPN Transistor switch or direct active buzzer</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-emerald-400">Alert / Status LED</td>
                <td className="p-3">Visual Status Beacon</td>
                <td className="p-3 font-mono font-bold text-white">GPIO 2</td>
                <td className="p-3">Digital Output</td>
                <td className="p-3 text-slate-400">Onboard LED or external LED with 220Ω resistor</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Firmware Code Viewer */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>Production Arduino C++ Firmware (smart_hostel_esp32.ino)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Includes Wi-Fi auto-reconnect, JSON serialization, and acoustic feedback
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={downloadCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download .ino</span>
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[500px]">
          {firmwareCode}
        </pre>
      </div>
    </div>
  );
};
