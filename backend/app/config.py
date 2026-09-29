import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AIoT Smart Hostel Environment Analytics"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database configuration
    # Supports MySQL or automated SQLite fallback
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./smart_hostel.db"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "smart-hostel-aiot-jwt-super-secret-key-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # GenAI / Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # ML Model Path
    MODEL_PATH: str = os.getenv("MODEL_PATH", "ml/model/anomaly_dnn_weights.json")

    # Anomaly Thresholds
    TEMP_WARNING_THRESHOLD: float = 32.0
    TEMP_CRITICAL_THRESHOLD: float = 37.0
    HUMIDITY_WARNING_THRESHOLD: float = 70.0
    HUMIDITY_CRITICAL_THRESHOLD: float = 85.0
    AIR_QUALITY_CRITICAL_THRESHOLD: float = 120.0

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
