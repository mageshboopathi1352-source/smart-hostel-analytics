import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.models import AIReport, Anomaly, Room, SensorData
from backend.app.schemas.schemas import AIReportResponse, AIAnalysisRequest
from backend.app.genai.ai_service import generate_ai_report

router = APIRouter(prefix="/api", tags=["GenAI Intelligent Explanation"])

@router.post("/analyze-anomaly", response_model=AIReportResponse)
def analyze_anomaly(req: AIAnalysisRequest, db: Session = Depends(get_db)):
    anomaly = db.query(Anomaly).filter(Anomaly.id == req.anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    # If report already exists, return it
    if anomaly.ai_report:
        return anomaly.ai_report

    room = db.query(Room).filter(Room.id == anomaly.room_id).first()
    latest_data = (
        db.query(SensorData)
        .filter(SensorData.room_id == anomaly.room_id)
        .order_by(desc(SensorData.timestamp))
        .first()
    )

    ai_result = generate_ai_report(
        room_info={"room_number": room.room_number if room else "Unknown", "block": room.block if room else "A", "floor": room.floor if room else 1},
        sensor_reading={
            "temperature": latest_data.temperature if latest_data else 35.0,
            "humidity": latest_data.humidity if latest_data else 75.0,
            "light": latest_data.light if latest_data else 400.0,
            "motion": latest_data.motion if latest_data else 0,
            "air_quality": latest_data.air_quality if latest_data else 95.0
        },
        prediction_result={
            "anomaly_type": anomaly.anomaly_type,
            "confidence": anomaly.confidence,
            "severity": anomaly.severity
        }
    )

    new_report = AIReport(
        anomaly_id=anomaly.id,
        explanation=ai_result["explanation"],
        possible_causes=ai_result["possible_causes"],
        recommendation=ai_result["recommendation"],
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.get("/ai-reports/{room_id}", response_model=List[AIReportResponse])
def get_ai_reports_for_room(room_id: int, db: Session = Depends(get_db)):
    reports = (
        db.query(AIReport)
        .join(Anomaly, AIReport.anomaly_id == Anomaly.id)
        .filter(Anomaly.room_id == room_id)
        .order_by(desc(AIReport.created_at))
        .limit(20)
        .all()
    )
    return reports
