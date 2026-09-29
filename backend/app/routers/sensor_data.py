import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.models import (
    SensorData, Room, Sensor, Prediction, Anomaly, Alert, AIReport
)
from backend.app.schemas.schemas import (
    SensorDataCreate, SensorDataResponse, SensorIngestResponse
)
from backend.app.ml.inference import anomaly_engine
from backend.app.genai.ai_service import generate_ai_report

router = APIRouter(prefix="/api/sensor-data", tags=["Sensors & Telemetry"])

@router.post("", response_model=SensorIngestResponse)
def ingest_sensor_data(data_in: SensorDataCreate, db: Session = Depends(get_db)):
    # 1. Verify Room exists
    room = db.query(Room).filter(Room.id == data_in.room_id).first()
    if not room:
        # Check if room exists by room_number if int matched
        room = db.query(Room).filter(Room.room_number == str(data_in.room_id)).first()
        if not room:
            # Auto-provision room so hardware doesn't fail
            room = Room(room_number=str(data_in.room_id), block="A", floor=1, status="ACTIVE")
            db.add(room)
            db.commit()
            db.refresh(room)

    # 2. Store raw telemetry
    new_data = SensorData(
        room_id=room.id,
        temperature=data_in.temperature,
        humidity=data_in.humidity,
        light=data_in.light,
        motion=data_in.motion,
        air_quality=data_in.air_quality,
        is_simulated=data_in.is_simulated,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(new_data)
    db.commit()
    db.refresh(new_data)

    # Update sensor last_seen
    sensors = db.query(Sensor).filter(Sensor.room_id == room.id).all()
    for s in sensors:
        s.last_seen = datetime.datetime.utcnow()
        s.status = "ONLINE"
    db.commit()

    # 3. Retrieve recent sequence for DNN inference
    recent_readings = (
        db.query(SensorData)
        .filter(SensorData.room_id == room.id)
        .order_by(desc(SensorData.timestamp))
        .limit(5)
        .all()
    )
    # Convert to chronological list of dicts
    seq_dicts = [
        {
            "temperature": r.temperature,
            "humidity": r.humidity,
            "light": r.light,
            "motion": r.motion,
            "air_quality": r.air_quality or 45.0
        }
        for r in reversed(recent_readings)
    ]

    # 4. Run DNN Anomaly Detection
    is_anomaly, anomaly_type, severity, confidence, desc_str = anomaly_engine.predict(seq_dicts)

    # 5. Store Prediction
    prediction_record = Prediction(
        sensor_data_id=new_data.id,
        model_name="LSTM-DNN-MultiSensor-v1",
        prediction="ANOMALY" if is_anomaly else "NORMAL",
        confidence=confidence,
        created_at=datetime.datetime.utcnow()
    )
    db.add(prediction_record)
    db.commit()

    alert_created = False
    ai_report_generated = False

    # 6. If Anomaly: create Anomaly, Alert, and GenAI Report
    if is_anomaly:
        anomaly_record = Anomaly(
            room_id=room.id,
            anomaly_type=anomaly_type,
            severity=severity,
            confidence=confidence,
            description=desc_str,
            status="ACTIVE",
            detected_at=datetime.datetime.utcnow()
        )
        db.add(anomaly_record)
        db.commit()
        db.refresh(anomaly_record)

        # Create Alert
        alert_record = Alert(
            room_id=room.id,
            anomaly_id=anomaly_record.id,
            severity=severity,
            message=f"[{severity}] {desc_str} in Room {room.room_number}",
            status="UNREAD",
            created_at=datetime.datetime.utcnow()
        )
        db.add(alert_record)
        db.commit()
        alert_created = True

        # Generate GenAI Report
        try:
            ai_output = generate_ai_report(
                room_info={"room_number": room.room_number, "block": room.block, "floor": room.floor},
                sensor_reading={
                    "temperature": new_data.temperature,
                    "humidity": new_data.humidity,
                    "light": new_data.light,
                    "motion": new_data.motion,
                    "air_quality": new_data.air_quality
                },
                prediction_result={
                    "anomaly_type": anomaly_type,
                    "confidence": confidence,
                    "severity": severity
                }
            )
            ai_report = AIReport(
                anomaly_id=anomaly_record.id,
                explanation=ai_output["explanation"],
                possible_causes=ai_output["possible_causes"],
                recommendation=ai_output["recommendation"],
                created_at=datetime.datetime.utcnow()
            )
            db.add(ai_report)
            db.commit()
            ai_report_generated = True
        except Exception as e:
            print(f"[GenAI Error] Could not generate report: {e}")

    return SensorIngestResponse(
        status="SUCCESS",
        data_id=new_data.id,
        room_id=room.id,
        is_anomaly=is_anomaly,
        anomaly_type=anomaly_type if is_anomaly else None,
        severity=severity if is_anomaly else None,
        confidence=confidence,
        alert_created=alert_created,
        ai_report_generated=ai_report_generated
    )

@router.get("", response_model=List[SensorDataResponse])
def get_sensor_data(
    room_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(SensorData)
    if room_id:
        query = query.filter(SensorData.room_id == room_id)
    return query.order_by(desc(SensorData.timestamp)).limit(limit).all()

@router.get("/latest/{room_id}", response_model=SensorDataResponse)
def get_latest_sensor_data(room_id: int, db: Session = Depends(get_db)):
    latest = (
        db.query(SensorData)
        .filter(SensorData.room_id == room_id)
        .order_by(desc(SensorData.timestamp))
        .first()
    )
    if not latest:
        # Check by room_number
        room = db.query(Room).filter(Room.room_number == str(room_id)).first()
        if room:
            latest = (
                db.query(SensorData)
                .filter(SensorData.room_id == room.id)
                .order_by(desc(SensorData.timestamp))
                .first()
            )
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No sensor data recorded for room {room_id}"
        )
    return latest

@router.get("/history/{room_id}", response_model=List[SensorDataResponse])
def get_sensor_history(
    room_id: int,
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db)
):
    target_id = room_id
    room = db.query(Room).filter((Room.id == room_id) | (Room.room_number == str(room_id))).first()
    if room:
        target_id = room.id

    records = (
        db.query(SensorData)
        .filter(SensorData.room_id == target_id)
        .order_by(desc(SensorData.timestamp))
        .limit(limit)
        .all()
    )
    return list(reversed(records))
