# ESP32 AIoT Hardware Wiring & Pin Configuration

## 1. Overview
The Smart Hostel node uses an **ESP32 DevKit V1** (30-pin / 36-pin) microcontroller with multi-sensor telemetry collection for room environmental safety, air quality monitoring, fire risk detection, and student comfort index tracking.

## 2. Sensor & Actuator Pin Assignment

| Component | Function | ESP32 GPIO Pin | Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DHT22 / DHT11** | Temperature & Humidity | **GPIO 4** | Digital I/O | Pull-up resistor (4.7kΩ - 10kΩ) connected to 3.3V |
| **LDR (Photoresistor)** | Ambient Light Intensity | **GPIO 34** | Analog Input (ADC1_CH6) | Safe input-only ADC pin, no boot-strap conflicts |
| **MQ-135** | Air Quality / Smoke / Gas | **GPIO 35** | Analog Input (ADC1_CH7) | Safe input-only ADC pin, powered by 5V (VCC) |
| **PIR (HC-SR501)** | Human Motion Detection | **GPIO 27** | Digital Input | 3.3V logic level output from PIR sensor |
| **Piezo Buzzer** | Local Acoustic Alarm | **GPIO 26** | Digital Output | Active buzzer triggered upon critical anomaly |
| **Status / Alert LED** | Visual Warning Indicator | **GPIO 2** | Digital Output | Onboard LED or external red LED with 220Ω resistor |

## 3. Circuit Wiring Details
1. **Power Supply**: 
   - ESP32 powered via 5V Micro-USB or external 5V/2A regulated power supply connected to VIN and GND.
   - 3.3V output pin powers DHT22, LDR voltage divider, and PIR sensor logic.
   - MQ-135 heater requires 5V from VIN.

2. **LDR Voltage Divider**:
   - 3.3V -> 10kΩ Resistor -> Node A -> LDR -> GND.
   - Node A connects to ESP32 GPIO 34.

3. **Buzzer & LED**:
   - GPIO 26 -> 1kΩ Resistor -> NPN Transistor Base (2N2222) -> Buzzer (+) to 5V.
   - Or direct drive if using low-current 3.3V active buzzer.
   - GPIO 2 -> 220Ω Resistor -> LED Anode -> LED Cathode to GND.

## 4. Firmware Payload Format
The ESP32 constructs and sends HTTP POST requests every 5 seconds to the FastAPI backend:
```json
{
  "room_id": 101,
  "temperature": 29.5,
  "humidity": 64.2,
  "light": 420,
  "motion": 1,
  "air_quality": 45.8,
  "is_simulated": false
}
```
