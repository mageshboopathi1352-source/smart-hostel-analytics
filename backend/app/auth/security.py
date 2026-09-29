import os
import hashlib
import binascii
import datetime
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.models import User, Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Robust Password Hashing
def get_password_hash(password: str) -> str:
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    except Exception:
        # High security PBKDF2 fallback
        salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
        pwdhash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000)
        pwdhash = binascii.hexlify(pwdhash)
        return (salt + pwdhash).decode('ascii')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        salt = hashed_password[:64].encode('ascii')
        stored_hash = hashed_password[64:].encode('ascii')
        pwdhash = hashlib.pbkdf2_hmac('sha512', plain_password.encode('utf-8'), salt, 100000)
        return binascii.hexlify(pwdhash) == stored_hash

# JWT handling
def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})

    try:
        from jose import jwt
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    except Exception:
        # Built-in lightweight fallback JWT signing
        import json
        import base64
        import hmac
        header = {"alg": "HS256", "typ": "JWT"}
        h_bytes = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=')
        # Serialize datetime for json
        clean_encode = {k: (v.timestamp() if isinstance(v, datetime.datetime) else v) for k, v in to_encode.items()}
        p_bytes = base64.urlsafe_b64encode(json.dumps(clean_encode).encode()).rstrip(b'=')
        message = h_bytes + b'.' + p_bytes
        sig = hmac.new(settings.JWT_SECRET_KEY.encode(), message, hashlib.sha256).digest()
        s_bytes = base64.urlsafe_b64encode(sig).rstrip(b'=')
        return (message + b'.' + s_bytes).decode('utf-8')

def decode_access_token(token: str) -> dict:
    try:
        from jose import jwt
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        import json
        import base64
        import hmac
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid token")
        h_bytes, p_bytes, s_bytes = parts[0].encode(), parts[1].encode(), parts[2].encode()
        # Verify sig
        message = h_bytes + b'.' + p_bytes
        expected_sig = hmac.new(settings.JWT_SECRET_KEY.encode(), message, hashlib.sha256).digest()
        calc_s_bytes = base64.urlsafe_b64encode(expected_sig).rstrip(b'=')
        if not hmac.compare_digest(calc_s_bytes, s_bytes):
            raise ValueError("Signature mismatch")
        # Add padding
        rem = len(p_bytes) % 4
        if rem > 0:
            p_bytes += b'=' * (4 - rem)
        payload = json.loads(base64.urlsafe_b64decode(p_bytes).decode('utf-8'))
        exp = payload.get("exp")
        if exp and datetime.datetime.utcnow().timestamp() > exp:
            raise ValueError("Token expired")
        return payload

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required"
        )
    return current_user

def require_student_or_admin(current_user: User = Depends(get_current_user)) -> User:
    return current_user
