from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.core.config import settings
import hashlib

# Password hashing context with bcrypt
# Using bcrypt with truncated password handling for passwords > 72 bytes
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_password(password: str) -> str:
    """
    Normalize password for bcrypt hashing.
    Bcrypt has a 72-byte limit. For longer passwords, we pre-hash with SHA256.
    This ensures consistent behavior for both hashing and verification.
    """
    password_bytes = password.encode('utf-8')
    
    # If password exceeds 72 bytes, pre-hash with SHA256 (always 64 chars)
    if len(password_bytes) > 72:
        return hashlib.sha256(password_bytes).hexdigest()
    
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    normalized_password = _normalize_password(plain_password)
    return pwd_context.verify(normalized_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    Passwords longer than 72 bytes are pre-hashed with SHA256.
    """
    normalized_password = _normalize_password(password)
    return pwd_context.hash(normalized_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

