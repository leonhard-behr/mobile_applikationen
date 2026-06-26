"""Security utilities: password hashing (bcrypt) and JWT token management"""

from datetime import datetime, timedelta, timezone
from uuid import UUID
import bcrypt
from jose import JWTError, jwt
from app.core.config import get_settings

settings = get_settings()


def hash_password(plain: str) -> str:
    """hashes a plaintext password with bcrypt"""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """verify a plaintext password against its bcrypt hash"""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: UUID) -> str:
    """creates an access token (15 min default)"""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: UUID) -> str:
    """create a refresh token (7 days default)"""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """decodes and validates a JWT token.
    returns the payload dict on success.
    raises JWTError on invalid tokens"""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def decode_access_token(token: str) -> UUID | None:
    """decodes an access token and returns the user UUID, or None if invalid"""
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return UUID(user_id)
    except (JWTError, ValueError):
        return None


def decode_refresh_token(token: str) -> UUID | None:
    """decodes a refresh token and returns the user UUID, or None if invalid"""
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return UUID(user_id)
    except (JWTError, ValueError):
        return None
