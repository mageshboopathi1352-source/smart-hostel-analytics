import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)  # ADMIN, STUDENT

    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    role = relationship("Role", back_populates="users")
    room = relationship("Room", back_populates="occupants")
    logs = relationship("SystemLog", back_populates="user")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_number = Column(String(20), unique=True, index=True, nullable=False)
    block = Column(String(20), nullable=False)
    floor = Column(Integer, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, MAINTENANCE, INACTIVE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    occupants = relationship("User", back_populates="room")
    sensors = relationship("Sensor", back_populates="room", cascade="all, delete-orphan")
    sensor_data = relationship("SensorData", back_populates="room", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="room", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="room", cascade="all, delete-orphan")

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    sensor_type = Column(String(50), nullable=False)  # DHT22, LDR, PIR, MQ-135, MULTI
    device_id = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(20), default="ONLINE")  # ONLINE, OFFLINE, FAULT
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("Room", back_populates="sensors")

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    light = Column(Float, nullable=False)
    motion = Column(Integer, default=0)  # 0 or 1
    air_quality = Column(Float, nullable=True)  # PPM
    is_simulated = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    room = relationship("Room", back_populates="sensor_data")
    predictions = relationship("Prediction", back_populates="sensor_data", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_room_timestamp", "room_id", "timestamp"),
    )

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sensor_data_id = Column(Integer, ForeignKey("sensor_data.id"), nullable=False)
    model_name = Column(String(100), nullable=False)
    prediction = Column(String(50), nullable=False)  # NORMAL, ANOMALY
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sensor_data = relationship("SensorData", back_populates="predictions")

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    anomaly_type = Column(String(100), nullable=False)  # OVERHEATING, FIRE_RISK, HIGH_HUMIDITY, SENSOR_FAULT
    severity = Column(String(20), nullable=False)  # WARNING, CRITICAL, INFO
    confidence = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, RESOLVED, INVESTIGATING
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    room = relationship("Room", back_populates="anomalies")
    alerts = relationship("Alert", back_populates="anomaly", cascade="all, delete-orphan")
    ai_report = relationship("AIReport", back_populates="anomaly", uselist=False, cascade="all, delete-orphan")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), nullable=False)
    severity = Column(String(20), nullable=False)  # WARNING, CRITICAL
    message = Column(Text, nullable=False)
    status = Column(String(20), default="UNREAD")  # UNREAD, READ, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    room = relationship("Room", back_populates="alerts")
    anomaly = relationship("Anomaly", back_populates="alerts")

class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), nullable=False, unique=True)
    explanation = Column(Text, nullable=False)
    possible_causes = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    anomaly = relationship("Anomaly", back_populates="ai_report")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="logs")
