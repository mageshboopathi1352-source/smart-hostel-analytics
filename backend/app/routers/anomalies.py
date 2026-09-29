import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.models import Anomaly, Alert, SystemLog
from backend.app.schemas.schemas import AnomalyResponse, AnomalyResolve
from backend.app.auth.security import get_current_user

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])

@router.get("", response_model=List[AnomalyResponse])
def list_anomalies(
    room_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(Anomaly)
    if room_id:
        q = q.filter(Anomaly.room_id == room_id)
    if status_filter:
        q = q.filter(Anomaly.status == status_filter.upper())
    return q.order_by(desc(Anomaly.detected_at)).limit(limit).all()

@router.get("/{anomaly_id}", response_model=AnomalyResponse)
def get_anomaly(anomaly_id: int, db: Session = Depends(get_db)):
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly record not found")
    return anomaly

@router.put("/{anomaly_id}/resolve", response_model=AnomalyResponse)
def resolve_anomaly(anomaly_id: int, resolve_in: AnomalyResolve, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly record not found")

    anomaly.status = resolve_in.status
    anomaly.resolved_at = datetime.datetime.utcnow()

    # Also resolve any associated alerts
    alerts = db.query(Alert).filter(Alert.anomaly_id == anomaly.id).all()
    for alert in alerts:
        alert.status = "RESOLVED"

    # Log action
    log = SystemLog(
        user_id=current_user.id if current_user else None,
        action="ANOMALY_RESOLVED",
        details=f"Anomaly #{anomaly_id} ({anomaly.anomaly_type}) in Room {anomaly.room_id} resolved by {current_user.email if current_user else 'system'}"
    )
    db.add(log)
    db.commit()
    db.refresh(anomaly)
    return anomaly
