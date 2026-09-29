import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import Sensor, Room
from backend.app.schemas.schemas import SensorCreate, SensorUpdate, SensorResponse
from backend.app.auth.security import require_admin

router = APIRouter(prefix="/api/sensors", tags=["Sensors Management"])

@router.get("", response_model=List[SensorResponse])
def list_sensors(db: Session = Depends(get_db)):
    return db.query(Sensor).all()

@router.post("", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
def create_sensor(sensor_in: SensorCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    room = db.query(Room).filter(Room.id == sensor_in.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    existing = db.query(Sensor).filter(Sensor.device_id == sensor_in.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Sensor device_id {sensor_in.device_id} already exists")

    sensor = Sensor(
        room_id=sensor_in.room_id,
        sensor_type=sensor_in.sensor_type,
        device_id=sensor_in.device_id,
        status=sensor_in.status,
        last_seen=datetime.datetime.utcnow(),
        created_at=datetime.datetime.utcnow()
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    return sensor

@router.put("/{sensor_id}", response_model=SensorResponse)
def update_sensor(sensor_id: int, update_in: SensorUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    if update_in.status is not None:
        sensor.status = update_in.status
    if update_in.sensor_type is not None:
        sensor.sensor_type = update_in.sensor_type
    db.commit()
    db.refresh(sensor)
    return sensor

@router.delete("/{sensor_id}")
def delete_sensor(sensor_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    db.delete(sensor)
    db.commit()
    return {"message": f"Sensor {sensor_id} deleted successfully"}
