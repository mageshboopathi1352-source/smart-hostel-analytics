# AIoT Smart Hostel Environment Analytics & Anomaly Prediction Using DNN and GenAI

An end-to-end AIoT smart hostel monitoring and environmental anomaly detection system combining ESP32 IoT hardware, deep sequence modeling (LSTM / DNN), generative AI diagnostics (Gemini), and a responsive React management portal.

---

## 🌟 Key Features
- **Real-time IoT Telemetry**: Ingests DHT22 (Temp & Humidity), LDR (Light), PIR (Motion), and MQ-135 (Air Quality/Smoke) data.
- **Deep Neural Network (DNN) Anomaly Detection**: Sliding-window LSTM / 1D-CNN temporal sequence model for anomaly classification with confidence scoring.
- **Generative AI Diagnostics (Gemini)**: Automated root-cause analysis, hazard explanation, and safety recommendations.
- **Role-Based Access Control (RBAC)**: Dedicated interfaces for Hostel Administrators (wardens) and Students (room residents).
- **Simulation Mode**: Built-in hardware emulator supporting NORMAL, WARNING, and CRITICAL conditions without requiring physical hardware.
- **ESP32 Firmware**: Full Arduino C++ firmware with Wi-Fi auto-reconnect, sensor validation, JSON payload construction, and acoustic/visual alarms.

---

## 📁 Repository Structure
```
smart-hostel-aiot/
├── backend/
│   ├── app/
│   │   ├── auth/          # JWT, password hashing, role dependencies
│   │   ├── genai/         # Gemini intelligent explanation service
│   │   ├── ml/            # DNN model inference & sliding window
│   │   ├── models/        # SQLAlchemy ORM models (MySQL / SQLite)
│   │   ├── routers/       # Modular REST endpoints
│   │   ├── schemas/       # Pydantic data validation schemas
│   │   ├── config.py      # App configurations
│   │   ├── database.py    # Database session & engine
│   │   └── main.py        # FastAPI entrypoint & auto-seeder
│   ├── tests/             # Automated test suite
│   ├── requirements.txt   # Python dependencies
│   └── .env.example
├── frontend/
│   ├── src/               # React components, pages, context, and layouts
│   ├── package.json
│   └── .env.example
├── esp32/
│   └── smart_hostel_esp32.ino # Arduino C++ firmware
├── dataset/
│   └── sensor_data.csv    # Multi-sensor environmental telemetry dataset
├── ml/
│   ├── preprocess.py      # Feature normalization & windowing
│   ├── train.py           # Deep LSTM neural network training
│   ├── evaluate.py        # Accuracy, Precision, Recall, F1, Confusion Matrix
│   └── model/             # Saved weights & model metadata
├── docs/
│   ├── hardware.md        # ESP32 pinout & wiring diagram
│   ├── api.md             # REST API specifications
│   ├── architecture.md    # Architecture diagrams & flow
│   └── setup.md           # Step-by-step installation instructions
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start
### 1. Backend
```bash
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app.main:app --port 8000 --reload
```

### 2. Frontend
```bash
npm run dev
```

### 3. ESP32 Hardware
1. Connect DHT22 to GPIO 4, LDR to GPIO 34, PIR to GPIO 27, MQ-135 to GPIO 35, Buzzer to GPIO 26, LED to GPIO 2.
2. Open `esp32/smart_hostel_esp32.ino` in Arduino IDE.
3. Update `WIFI_SSID`, `WIFI_PASSWORD`, and `BACKEND_URL`.
4. Upload to ESP32.

---

## 👤 Default Accounts
- **Admin Portal**: `admin@smarthostel.edu` / `Admin@123`
- **Student (Room 101)**: `student101@smarthostel.edu` / `Student@123`
- **Student (Room 102)**: `student102@smarthostel.edu` / `Student@123`
