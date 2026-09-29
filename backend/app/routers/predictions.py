import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.models import Prediction, SensorData
from backend.app.schemas.schemas import PredictionRequest, PredictionResponse
from backend.app.ml.inference import anomaly_engine

router = APIRouter(prefix="/api", tags=["AI & DNN Predictions"])

@router.post("/predict-anomaly", response_model=PredictionResponse)
def predict_anomaly(req: PredictionRequest, db: Session = Depends(get_db)):
    # Build reading dict
    reading = {
        "temperature": req.temperature,
        "humidity": req.humidity,
        "light": req.light,
        "motion": req.motion,
        "air_quality": req.air_quality or 45.0
    }
    # Retrieve past readings for room if available
    recent = (
        db.query(SensorData)
        .filter(SensorData.room_id == req.room_id)
        .order_by(desc(SensorData.timestamp))
        .limit(4)
        .all()
    )
    seq = [{"temperature": r.temperature, "humidity": r.humidity, "light": r.light, "motion": r.motion, "air_quality": r.air_quality or 45.0} for r in reversed(recent)]
    seq.append(reading)

    is_anomaly, anomaly_type, severity, confidence, desc_str = anomaly_engine.predict(seq)

    return PredictionResponse(
        room_id=req.room_id,
        prediction="ANOMALY" if is_anomaly else "NORMAL",
        confidence=confidence,
        anomaly_type=anomaly_type,
        model_name="LSTM-DNN-MultiSensor-v1",
        features=reading
    )

@router.get("/predictions/{room_id}")
def get_predictions_for_room(room_id: int, limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    predictions = (
        db.query(Prediction)
        .join(SensorData, Prediction.sensor_data_id == SensorData.id)
        .filter(SensorData.room_id == room_id)
        .order_by(desc(Prediction.created_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": p.id,
            "sensor_data_id": p.sensor_data_id,
            "model_name": p.model_name,
            "prediction": p.prediction,
            "confidence": p.confidence,
            "created_at": p.created_at
        }
        for p in predictions
    ]
