from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import Room, Sensor, Anomaly, Alert, User, Role, SystemLog
from backend.app.schemas.schemas import AdminDashboardStats, UserResponse, UserUpdate
from backend.app.auth.security import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

@router.get("/dashboard", response_model=AdminDashboardStats)
def get_admin_dashboard(db: Session = Depends(get_db), admin=Depends(require_admin)):
    total_rooms = db.query(Room).count()
    active_sensors = db.query(Sensor).count()
    online_devices = db.query(Sensor).filter(Sensor.status == "ONLINE").count()
    active_anomalies = db.query(Anomaly).filter(Anomaly.status == "ACTIVE").count()
    critical_alerts = db.query(Alert).filter(Alert.status == "UNREAD", Alert.severity == "CRITICAL").count()

    # Rooms with active anomalies
    anomalous_room_ids = db.query(Anomaly.room_id).filter(Anomaly.status == "ACTIVE").distinct().all()
    anom_set = {r[0] for r in anomalous_room_ids}
    normal_rooms = max(0, total_rooms - len(anom_set))

    return AdminDashboardStats(
        total_rooms=total_rooms,
        active_sensors=active_sensors,
        online_devices=online_devices,
        normal_rooms=normal_rooms,
        active_anomalies=active_anomalies,
        critical_alerts=critical_alerts
    )

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    users = db.query(User).all()
    return [
        UserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role_name=u.role.name if u.role else "STUDENT",
            room_id=u.room_id,
            is_active=u.is_active,
            created_at=u.created_at
        )
        for u in users
    ]

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.name is not None:
        user.name = user_in.name
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.room_id is not None:
        user.room_id = user_in.room_id
    if user_in.role_name is not None:
        role = db.query(Role).filter(Role.name == user_in.role_name.upper()).first()
        if role:
            user.role_id = role.id

    db.commit()
    db.refresh(user)

    log = SystemLog(
        user_id=admin.id,
        action="ADMIN_UPDATE_USER",
        details=f"Admin {admin.email} updated user #{user_id} ({user.email})"
    )
    db.add(log)
    db.commit()

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role_name=user.role.name if user.role else "STUDENT",
        room_id=user.room_id,
        is_active=user.is_active,
        created_at=user.created_at
    )

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted successfully"}
