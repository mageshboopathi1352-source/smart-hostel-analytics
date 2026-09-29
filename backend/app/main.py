import os
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.models import Role, User, Room, Sensor, SensorData
from backend.app.auth.security import get_password_hash
from backend.app.routers import (
    auth, sensor_data, rooms, sensors, predictions,
    anomalies, alerts, genai_routes, admin, analytics, health
)

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-time multi-sensor environment monitoring, LSTM anomaly prediction, and GenAI diagnostics for student hostel rooms."
)

# Enable CORS for React frontend and external IoT nodes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(sensor_data.router)
app.include_router(rooms.router)
app.include_router(sensors.router)
app.include_router(predictions.router)
app.include_router(anomalies.router)
app.include_router(alerts.router)
app.include_router(genai_routes.router)
app.include_router(admin.router)
app.include_router(analytics.router)

def seed_database(db: Session):
    # 1. Seed Roles
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        admin_role = Role(name="ADMIN")
        db.add(admin_role)

    student_role = db.query(Role).filter(Role.name == "STUDENT").first()
    if not student_role:
        student_role = Role(name="STUDENT")
        db.add(student_role)
    db.commit()

    # 2. Seed Default Rooms
    default_rooms = [
        {"room_number": "101", "block": "A", "floor": 1},
        {"room_number": "102", "block": "A", "floor": 1},
        {"room_number": "103", "block": "B", "floor": 1},
        {"room_number": "201", "block": "B", "floor": 2}
    ]
    created_rooms = {}
    for r_data in default_rooms:
        rm = db.query(Room).filter(Room.room_number == r_data["room_number"]).first()
        if not rm:
            rm = Room(room_number=r_data["room_number"], block=r_data["block"], floor=r_data["floor"], status="ACTIVE")
            db.add(rm)
            db.commit()
            db.refresh(rm)
        created_rooms[rm.room_number] = rm

    # 3. Seed Default Users
    admin_user = db.query(User).filter(User.email == "admin@smarthostel.edu").first()
    if not admin_user:
        admin_user = User(
            name="Hostel Chief Warden",
            email="admin@smarthostel.edu",
            password_hash=get_password_hash("Admin@123"),
            role_id=admin_role.id,
            is_active=True
        )
        db.add(admin_user)

    student_101 = db.query(User).filter(User.email == "student101@smarthostel.edu").first()
    if not student_101:
        student_101 = User(
            name="Alex Morgan (Resident 101)",
            email="student101@smarthostel.edu",
            password_hash=get_password_hash("Student@123"),
            role_id=student_role.id,
            room_id=created_rooms["101"].id,
            is_active=True
        )
        db.add(student_101)

    student_102 = db.query(User).filter(User.email == "student102@smarthostel.edu").first()
    if not student_102:
        student_102 = User(
            name="Maya Patel (Resident 102)",
            email="student102@smarthostel.edu",
            password_hash=get_password_hash("Student@123"),
            role_id=student_role.id,
            room_id=created_rooms["102"].id,
            is_active=True
        )
        db.add(student_102)
    db.commit()

    # 4. Seed Sensors
    for r_num, r_obj in created_rooms.items():
        existing_sensor = db.query(Sensor).filter(Sensor.room_id == r_obj.id).first()
        if not existing_sensor:
            sensor = Sensor(
                room_id=r_obj.id,
                sensor_type="ESP32_MULTI_SENSOR",
                device_id=f"ESP32_HOSTEL_{r_num}",
                status="ONLINE",
                last_seen=datetime.datetime.utcnow(),
                created_at=datetime.datetime.utcnow()
            )
            db.add(sensor)
    db.commit()

    # 5. Seed Initial Telemetry History if empty
    r101 = created_rooms.get("101")
    if r101 and db.query(SensorData).filter(SensorData.room_id == r101.id).count() == 0:
        base_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        for i in range(15):
            t = base_time + datetime.timedelta(minutes=i * 2)
            db.add(SensorData(
                room_id=r101.id,
                temperature=26.5 + (i * 0.1),
                humidity=52.0 + (i * 0.2),
                light=350 + (i * 5),
                motion=1 if i % 3 == 0 else 0,
                air_quality=42.0 + (i * 0.5),
                is_simulated=True,
                timestamp=t
            ))
        db.commit()

@app.on_event("startup")
def on_startup():
    print("[Startup] Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        print("[Startup] Seeded roles, default admin, student users, rooms, and sensors.")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
