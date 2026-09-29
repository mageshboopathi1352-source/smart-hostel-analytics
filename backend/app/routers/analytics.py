from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.app.database import get_db
from backend.app.models.models import SensorData, Anomaly, Room

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/temperature/{room_id}")
def get_temperature_analytics(room_id: int, limit: int = Query(50, le=100), db: Session = Depends(get_db)):
    records = (
        db.query(SensorData.timestamp, SensorData.temperature)
        .filter(SensorData.room_id == room_id)
        .order_by(desc(SensorData.timestamp))
        .limit(limit)
        .all()
    )
    return [{"timestamp": r[0].isoformat(), "temperature": r[1]} for r in reversed(records)]

@router.get("/humidity/{room_id}")
def get_humidity_analytics(room_id: int, limit: int = Query(50, le=100), db: Session = Depends(get_db)):
    records = (
        db.query(SensorData.timestamp, SensorData.humidity)
        .filter(SensorData.room_id == room_id)
        .order_by(desc(SensorData.timestamp))
        .limit(limit)
        .all()
    )
    return [{"timestamp": r[0].isoformat(), "humidity": r[1]} for r in reversed(records)]

@router.get("/anomalies")
def get_anomalies_distribution(db: Session = Depends(get_db)):
    counts = (
        db.query(Anomaly.anomaly_type, func.count(Anomaly.id))
        .group_by(Anomaly.anomaly_type)
        .all()
    )
    return [{"anomaly_type": c[0], "count": c[1]} for c in counts]

@router.get("/rooms")
def get_room_comparisons(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    comparison = []
    for r in rooms:
        latest = (
            db.query(SensorData)
            .filter(SensorData.room_id == r.id)
            .order_by(desc(SensorData.timestamp))
            .first()
        )
        anomaly_count = db.query(Anomaly).filter(Anomaly.room_id == r.id, Anomaly.status == "ACTIVE").count()
        comparison.append({
            "room_id": r.id,
            "room_number": r.room_number,
            "block": r.block,
            "floor": r.floor,
            "temperature": latest.temperature if latest else 26.5,
            "humidity": latest.humidity if latest else 50.0,
            "air_quality": latest.air_quality if latest else 45.0,
            "active_anomalies": anomaly_count,
            "status": "ANOMALOUS" if anomaly_count > 0 else "NORMAL"
        })
    return comparison
