import pytest
from fastapi.testclient import TestClient
from backend.app.main import app, on_startup

# Ensure tables and initial seeds are present
on_startup()

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert "HEALTHY" in data["database"]

def test_admin_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@smarthostel.edu",
        "password": "Admin@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    return data["access_token"]

def test_student_login():
    response = client.post("/api/auth/login", json={
        "email": "student101@smarthostel.edu",
        "password": "Student@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "STUDENT"
    assert data["room_id"] is not None

def test_invalid_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@smarthostel.edu",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401

def test_sensor_ingestion_normal():
    payload = {
        "room_id": 101,
        "temperature": 27.5,
        "humidity": 55.0,
        "light": 420.0,
        "motion": 1,
        "air_quality": 45.0,
        "is_simulated": True
    }
    response = client.post("/api/sensor-data", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["is_anomaly"] is False

def test_sensor_ingestion_anomaly_and_alert():
    # Send extreme overheating telemetry
    payload = {
        "room_id": 101,
        "temperature": 39.5,
        "humidity": 88.0,
        "light": 650.0,
        "motion": 1,
        "air_quality": 160.0,
        "is_simulated": True
    }
    response = client.post("/api/sensor-data", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["is_anomaly"] is True
    assert data["severity"] == "CRITICAL"
    assert data["alert_created"] is True

def test_get_sensor_history():
    response = client.get("/api/sensor-data/history/101")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_get_rooms():
    response = client.get("/api/rooms")
    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) >= 4
    room_numbers = [r["room_number"] for r in rooms]
    assert "101" in room_numbers

def test_predict_anomaly_endpoint():
    payload = {
        "room_id": 102,
        "temperature": 38.0,
        "humidity": 85.0,
        "light": 500.0,
        "motion": 0,
        "air_quality": 140.0
    }
    response = client.post("/api/predict-anomaly", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "ANOMALY"
    assert data["confidence"] > 0.8
