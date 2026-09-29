# System Architecture

## High-Level Architecture
```
                 SMART HOSTEL ROOMS
                         |
           ESP32 Microcontroller + Sensors
       (DHT22, LDR, PIR, MQ-135, Buzzer, LED)
                         |
                    Wi-Fi / HTTP
                         |
                         v
                 ┌────────────────┐
                 │    FastAPI     │
                 │    Backend     │
                 └───────┬────────┘
                         |
         ┌───────────────┼───────────────┐
         |               |               |
         v               v               v
    MySQL Database  LSTM / 1D-CNN  Gemini GenAI
     (SQLAlchemy)     (Keras/DNN)   (Explanation)
         |               |               |
         └───────────────┼───────────────┘
                         |
                         v
                   React Frontend
            (Vite + Tailwind + Recharts)
                         |
          ┌──────────────┴──────────────┐
          |                             |
     Admin Portal                  Student Portal
```

## Data Flow & Processing Pipeline
1. **Acquisition**: ESP32 reads physical sensors every 5 seconds, performs local bounds check, and formats a JSON payload.
2. **Ingestion & Validation**: FastAPI endpoint `/api/sensor-data` validates payload, logs telemetry into database, and pulls the last 5 time-series readings.
3. **Deep Learning Inference**: Sliding-window sequence of `[temperature, humidity, light, motion, air_quality]` is fed to the LSTM neural model.
4. **Anomaly Classification**: If prediction exceeds confidence threshold or breaches emergency physical thresholds, an `Anomaly` and `Alert` record are persisted.
5. **GenAI Diagnosis**: The backend prompts Gemini with contextual telemetry, historical pattern, and anomaly category to produce human-readable explanation, root causes, and recommended corrective actions.
6. **Real-Time Presentation**: React frontend displays live gauges, time-series charts, alarm badges, and AI diagnosis cards with auto-polling.
