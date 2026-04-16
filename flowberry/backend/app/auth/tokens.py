import hashlib
from datetime import datetime, timedelta
from uuid import uuid4
from jose import jwt, JWTError
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def build_tokens(user_id: str, role: str) -> tuple[str, str, str, datetime]:
    jti = str(uuid4())
    refresh = create_refresh_token(user_id, jti)
    access = create_access_token(user_id, role)
    expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_ttl_days)
    return access, refresh, jti, expires_at


def decode_refresh(refresh_token: str) -> dict:
    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid refresh token") from exc

    if payload.get("typ") != "refresh":
        raise ValueError("Invalid refresh token type")
    return payload
