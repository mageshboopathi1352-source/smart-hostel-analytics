import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ================= AUTH SCHEMAS =================
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    email: str
    room_id: Optional[int] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role_name: str = Field(default="STUDENT") # ADMIN or STUDENT
    room_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role_name: str
    room_id: Optional[int] = None
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    room_id: Optional[int] = None
    role_name: Optional[str] = None

# ================= ROOM SCHEMAS =================
class RoomCreate(BaseModel):
    room_number: str
    block: str
    floor: int
    status: str = "ACTIVE"

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    block: Optional[str] = None
    floor: Optional[int] = None
    status: Optional[str] = None

class RoomResponse(BaseModel):
    id: int
    room_number: str
    block: str
    floor: int
    status: str
    created_at: datetime.datetime
    sensor_count: Optional[int] = 0
    active_anomalies_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ================= SENSOR SCHEMAS =================
class SensorCreate(BaseModel):
    room_id: int
    sensor_type: str
    device_id: str
    status: str = "ONLINE"

class SensorUpdate(BaseModel):
    status: Optional[str] = None
    sensor_type: Optional[str] = None

class SensorResponse(BaseModel):
    id: int
    room_id: int
    sensor_type: str
    device_id: str
    status: str
    last_seen: datetime.datetime
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ================= SENSOR DATA SCHEMAS =================
class SensorDataCreate(BaseModel):
    room_id: int
    temperature: float
    humidity: float
    light: float
    motion: int = 0
    air_quality: Optional[float] = None
    is_simulated: bool = False

class SensorDataResponse(BaseModel):
    id: int
    room_id: int
    temperature: float
    humidity: float
    light: float
    motion: int
    air_quality: Optional[float]
    is_simulated: bool
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class SensorIngestResponse(BaseModel):
    status: str
    data_id: int
    room_id: int
    is_anomaly: bool
    anomaly_type: Optional[str] = None
    severity: Optional[str] = None
    confidence: Optional[float] = None
    alert_created: bool = False
    ai_report_generated: bool = False

# ================= ANOMALY & ALERT SCHEMAS =================
class AnomalyResponse(BaseModel):
    id: int
    room_id: int
    anomaly_type: str
    severity: str
    confidence: float
    description: str
    status: str
    detected_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class AnomalyResolve(BaseModel):
    status: str = "RESOLVED"

class AlertResponse(BaseModel):
    id: int
    room_id: int
    anomaly_id: int
    severity: str
    message: str
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ================= PREDICTION SCHEMAS =================
class PredictionRequest(BaseModel):
    room_id: int
    temperature: float
    humidity: float
    light: float
    motion: int
    air_quality: Optional[float] = 45.0

class PredictionResponse(BaseModel):
    room_id: int
    prediction: str # NORMAL or ANOMALY
    confidence: float
    anomaly_type: str
    model_name: str
    features: dict

# ================= GENAI SCHEMAS =================
class AIAnalysisRequest(BaseModel):
    anomaly_id: int

class AIReportResponse(BaseModel):
    id: int
    anomaly_id: int
    explanation: str
    possible_causes: str
    recommendation: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ================= ADMIN & ANALYTICS SCHEMAS =================
class AdminDashboardStats(BaseModel):
    total_rooms: int
    active_sensors: int
    online_devices: int
    normal_rooms: int
    active_anomalies: int
    critical_alerts: int

class HealthResponse(BaseModel):
    status: str
    database: str
    dnn_model: str
    genai: str
    timestamp: datetime.datetime
