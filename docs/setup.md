# Installation & Quickstart Guide

## Prerequisites
- Node.js >= 18.x
- Python >= 3.10
- MySQL Server (optional, fallback SQLite is automated)
- Arduino IDE (for ESP32 firmware deployment)

## 1. Backend Setup
```bash
# Navigate to backend and install requirements
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run FastAPI backend
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 2. Frontend Setup
```bash
# In frontend directory
cd frontend
npm install
npm run dev
```

## 3. Machine Learning Training & Evaluation
```bash
# Train the LSTM Deep Neural Network
python3 -m ml.train

# Evaluate model metrics (Accuracy, Precision, Recall, F1, Confusion Matrix)
python3 -m ml.evaluate
```

## 4. Default Credentials
- **Admin**: `admin@smarthostel.edu` / `Admin@123`
- **Student (Room 101)**: `student101@smarthostel.edu` / `Student@123`
- **Student (Room 102)**: `student102@smarthostel.edu` / `Student@123`
