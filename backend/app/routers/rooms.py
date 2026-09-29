import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import Room, Sensor, Anomaly
from backend.app.schemas.schemas import RoomCreate, RoomUpdate, RoomResponse
from backend.app.auth.security import require_admin, get_current_user

router = APIRouter(prefix="/api/rooms", tags=["Rooms Management"])

@router.get("", response_model=List[RoomResponse])
def list_rooms(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    results = []
    for r in rooms:
        s_count = db.query(Sensor).filter(Sensor.room_id == r.id).count()
        a_count = db.query(Anomaly).filter(Anomaly.room_id == r.id, Anomaly.status == "ACTIVE").count()
        results.append(RoomResponse(
            id=r.id,
            room_number=r.room_number,
            block=r.block,
            floor=r.floor,
            status=r.status,
            created_at=r.created_at,
            sensor_count=s_count,
            active_anomalies_count=a_count
        ))
    return results

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_in: RoomCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(Room).filter(Room.room_number == room_in.room_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room {room_in.room_number} already exists"
        )
    room = Room(
        room_number=room_in.room_number,
        block=room_in.block,
        floor=room_in.floor,
        status=room_in.status,
        created_at=datetime.datetime.utcnow()
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return RoomResponse(
        id=room.id,
        room_number=room.room_number,
        block=room.block,
        floor=room.floor,
        status=room.status,
        created_at=room.created_at,
        sensor_count=0,
        active_anomalies_count=0
    )

@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    s_count = db.query(Sensor).filter(Sensor.room_id == room.id).count()
    a_count = db.query(Anomaly).filter(Anomaly.room_id == room.id, Anomaly.status == "ACTIVE").count()
    return RoomResponse(
        id=room.id,
        room_number=room.room_number,
        block=room.block,
        floor=room.floor,
        status=room.status,
        created_at=room.created_at,
        sensor_count=s_count,
        active_anomalies_count=a_count
    )

@router.put("/{room_id}", response_model=RoomResponse)
def update_room(room_id: int, update_in: RoomUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if update_in.room_number is not None:
        room.room_number = update_in.room_number
    if update_in.block is not None:
        room.block = update_in.block
    if update_in.floor is not None:
        room.floor = update_in.floor
    if update_in.status is not None:
        room.status = update_in.status
    db.commit()
    db.refresh(room)
    return RoomResponse(
        id=room.id,
        room_number=room.room_number,
        block=room.block,
        floor=room.floor,
        status=room.status,
        created_at=room.created_at,
        sensor_count=db.query(Sensor).filter(Sensor.room_id == room.id).count(),
        active_anomalies_count=db.query(Anomaly).filter(Anomaly.room_id == room.id, Anomaly.status == "ACTIVE").count()
    )

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return {"message": f"Room {room_id} deleted successfully"}
