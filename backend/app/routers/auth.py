import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, Role, SystemLog
from backend.app.schemas.schemas import Token, UserRegister, UserLogin, UserResponse
from backend.app.auth.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # Resolve role
    role_name = user_in.role_name.upper()
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name)
        db.add(role)
        db.commit()
        db.refresh(role)

    new_user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        password_hash=get_password_hash(user_in.password),
        role_id=role.id,
        room_id=user_in.room_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log action
    log = SystemLog(user_id=new_user.id, action="USER_REGISTERED", details=f"User {new_user.email} registered with role {role.name}")
    db.add(log)
    db.commit()

    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role_name=role.name,
        room_id=new_user.room_id,
        is_active=new_user.is_active,
        created_at=new_user.created_at
    )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    role_name = user.role.name if user.role else "STUDENT"
    access_token = create_access_token(data={"sub": user.email, "role": role_name, "uid": user.id})

    # Log login
    log = SystemLog(user_id=user.id, action="USER_LOGIN", details=f"User {user.email} logged in successfully")
    db.add(log)
    db.commit()

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=role_name,
        user_id=user.id,
        name=user.name,
        email=user.email,
        room_id=user.room_id
    )

@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else "STUDENT"
    access_token = create_access_token(data={"sub": current_user.email, "role": role_name, "uid": current_user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=role_name,
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        room_id=current_user.room_id
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log = SystemLog(user_id=current_user.id, action="USER_LOGOUT", details=f"User {current_user.email} logged out")
    db.add(log)
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role_name=current_user.role.name if current_user.role else "STUDENT",
        room_id=current_user.room_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
