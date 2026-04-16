import base64
import hashlib
import json
import os
import re
import secrets
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
from uuid import uuid4
import httpx
from fastapi import APIRouter, Depends
from jose import jwt
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, CurrentUser
from app.auth.tokens import build_tokens, hash_token, decode_refresh
from app.core.config import settings
from app.core.db import get_db
from app.core.security import verify_password, hash_password
from app.middleware.exception_middleware import AppException
from app.models.integration import Integration
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RefreshRequest, MFARequest, MFAEmailRequest, GoogleLoginRequest
from app.services.encryption_service import EncryptionService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/public-config")
def public_config():
    """Public, non-secret auth config for the frontend."""
    return {
        "success": True,
        "data": {
            "google_oauth_client_id": settings.google_oauth_client_id,
            "google_oauth_enabled": bool(settings.google_oauth_client_id),
        },
        "message": "Auth config",
    }


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    enc = EncryptionService()
    user_repo = UserRepository(db)
    refresh_repo = RefreshTokenRepository(db)

    user = user_repo.get_by_email_hash(enc.hash_for_lookup(payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise AppException("UNAUTHORIZED", "Invalid credentials", 401)

    if user.mfa_enabled:
        mfa_token = jwt.encode({"sub": user.id, "typ": "mfa"}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return {
            "success": True,
            "data": {"requires_mfa": True, "mfa_token": mfa_token},
            "message": "MFA required",
        }

    access, refresh, jti, exp = build_tokens(user.id, user.role)
    refresh_repo.create(
        RefreshToken(
            id=str(uuid4()),
            user_id=user.id,
            token_hash=hash_token(refresh),
            jti=jti,
            expires_at=exp,
        )
    )
    return {"success": True, "data": {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}, "message": "Login successful"}


@router.post("/google/login")
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    client_id = settings.google_oauth_client_id
    if not client_id:
        raise AppException("GOOGLE_OAUTH_NOT_CONFIGURED", "Google Sign-In is not configured", 400)

    # Verify the Google ID token using Google's tokeninfo endpoint.
    # This avoids adding extra dependencies and is OK for low-volume server-side login.
    # For high-volume production, consider verifying against Google's JWKS locally with caching.
    with httpx.Client(timeout=10) as client:
        resp = client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": payload.credential})

    if resp.status_code != 200:
        raise AppException("GOOGLE_OAUTH_FAILED", "Invalid Google credential", 401)

    info = resp.json() or {}
    if info.get("aud") != client_id:
        raise AppException("GOOGLE_OAUTH_FAILED", "Google token audience mismatch", 401)

    iss = info.get("iss")
    if iss not in {"accounts.google.com", "https://accounts.google.com"}:
        raise AppException("GOOGLE_OAUTH_FAILED", "Google token issuer mismatch", 401)

    # tokeninfo returns email_verified as string "true"/"false" in many cases.
    email_verified = info.get("email_verified")
    if email_verified not in {True, "true", "True"}:
        raise AppException("GOOGLE_OAUTH_FAILED", "Google email not verified", 401)

    email = (info.get("email") or "").strip()
    if not email or not _is_valid_email(email):
        raise AppException("GOOGLE_OAUTH_FAILED", "Google account email missing/invalid", 401)

    name = (info.get("name") or "").strip() or None

    enc = EncryptionService()
    user_repo = UserRepository(db)
    refresh_repo = RefreshTokenRepository(db)

    user = user_repo.get_by_email_hash(enc.hash_for_lookup(email))
    if not user:
        # Create a user record. Password is random since this is an OAuth identity.
        name_encrypted = enc.encrypt(name) if name else None
        user = user_repo.create(
            User(
                id=str(uuid4()),
                email_encrypted=enc.encrypt(email),
                email_hash=enc.hash_for_lookup(email),
                phone_encrypted=None,
                name_encrypted=name_encrypted,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role="user",
                mfa_enabled=False,
                mfa_secret_encrypted=None,
                mfa_otp_hash=None,
                mfa_otp_expires_at=None,
                mfa_otp_email_encrypted=None,
                is_active=True,
            )
        )

    if not user.is_active:
        raise AppException("UNAUTHORIZED", "User is disabled", 401)

    if user.mfa_enabled:
        mfa_token = jwt.encode({"sub": user.id, "typ": "mfa"}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return {
            "success": True,
            "data": {"requires_mfa": True, "mfa_token": mfa_token},
            "message": "MFA required",
        }

    access, refresh, jti, exp = build_tokens(user.id, user.role)
    refresh_repo.create(
        RefreshToken(
            id=str(uuid4()),
            user_id=user.id,
            token_hash=hash_token(refresh),
            jti=jti,
            expires_at=exp,
        )
    )
    return {
        "success": True,
        "data": {"access_token": access, "refresh_token": refresh, "token_type": "bearer"},
        "message": "Login successful",
    }


@router.post("/mfa/verify")
def mfa_verify(payload: MFARequest, db: Session = Depends(get_db)):
    try:
        mfa_payload = jwt.decode(payload.mfa_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception as exc:
        raise AppException("UNAUTHORIZED", "Invalid MFA token", 401) from exc

    user_id = mfa_payload.get("sub")
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise AppException("UNAUTHORIZED", "User not found", 401)
    if not user.mfa_enabled:
        raise AppException("FORBIDDEN", "MFA not enabled", 403)
    if not user.mfa_otp_hash or not user.mfa_otp_expires_at:
        raise AppException("FORBIDDEN", "OTP not requested", 403)
    if user.mfa_otp_expires_at < _utc_now():
        raise AppException("UNAUTHORIZED", "OTP expired", 401)

    expected = _hash_otp(user.id, payload.otp_code)
    if expected != user.mfa_otp_hash:
        raise AppException("UNAUTHORIZED", "Invalid OTP", 401)

    user.mfa_otp_hash = None
    user.mfa_otp_expires_at = None
    user.mfa_otp_email_encrypted = None
    db.commit()

    refresh_repo = RefreshTokenRepository(db)
    access, refresh, jti, exp = build_tokens(user.id, user.role)
    refresh_repo.create(
        RefreshToken(
            id=str(uuid4()),
            user_id=user.id,
            token_hash=hash_token(refresh),
            jti=jti,
            expires_at=exp,
        )
    )

    return {"success": True, "data": {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}, "message": "MFA verified"}


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    decoded = decode_refresh(payload.refresh_token)
    jti = decoded["jti"]
    sub = decoded["sub"]

    refresh_repo = RefreshTokenRepository(db)
    stored = refresh_repo.get_active_by_jti(jti)
    if not stored or stored.token_hash != hash_token(payload.refresh_token):
        raise AppException("UNAUTHORIZED", "Refresh token invalid", 401)

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(sub)
    if not user:
        raise AppException("UNAUTHORIZED", "User not found", 401)

    refresh_repo.revoke(stored)
    access, refresh_token, new_jti, exp = build_tokens(user.id, user.role)
    refresh_repo.create(
        RefreshToken(
            id=str(uuid4()),
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=new_jti,
            expires_at=exp,
        )
    )

    return {
        "success": True,
        "data": {"access_token": access, "refresh_token": refresh_token, "token_type": "bearer"},
        "message": "Token refreshed",
    }


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    row = user_repo.get_by_id(user.user_id)
    return {
        "success": True,
        "data": {"id": user.user_id, "role": user.role, "mfa_enabled": bool(row.mfa_enabled) if row else False},
        "message": "Current user",
    }


@router.post("/mfa/enable")
def mfa_enable(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    row = user_repo.get_by_id(user.user_id)
    if not row:
        raise AppException("UNAUTHORIZED", "User not found", 401)
    row.mfa_enabled = True
    db.commit()

    return {"success": True, "data": {"mfa_enabled": True}, "message": "MFA enabled"}


@router.post("/mfa/disable")
def mfa_disable(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    row = user_repo.get_by_id(user.user_id)
    if not row:
        raise AppException("UNAUTHORIZED", "User not found", 401)
    row.mfa_enabled = False
    row.mfa_otp_hash = None
    row.mfa_otp_expires_at = None
    row.mfa_otp_email_encrypted = None
    db.commit()
    return {"success": True, "data": {"mfa_enabled": False}, "message": "MFA disabled"}


@router.post("/mfa/request")
def mfa_request(payload: MFAEmailRequest, db: Session = Depends(get_db)):
    try:
        mfa_payload = jwt.decode(payload.mfa_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception as exc:
        raise AppException("UNAUTHORIZED", "Invalid MFA token", 401) from exc

    user_id = mfa_payload.get("sub")
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise AppException("UNAUTHORIZED", "User not found", 401)
    if not user.mfa_enabled:
        raise AppException("FORBIDDEN", "MFA not enabled", 403)

    email = payload.email.strip()
    if not _is_valid_email(email):
        raise AppException("INVALID_EMAIL", "Email address is invalid", 400)

    otp_code = _generate_otp()
    user.mfa_otp_hash = _hash_otp(user.id, otp_code)
    user.mfa_otp_expires_at = _utc_now() + _otp_ttl()
    user.mfa_otp_email_encrypted = EncryptionService().encrypt(email)
    db.commit()

    _send_mfa_email(db, user.id, email, otp_code)

    return {"success": True, "data": {"sent_to": email, "expires_in_seconds": int(_otp_ttl().total_seconds())}, "message": "OTP sent"}


def _send_mfa_email(db: Session, user_id: str, to_email: str, otp_code: str) -> None:
    integration = (
        db.query(Integration)
        .filter(Integration.user_id == user_id, Integration.provider == "Gmail")
        .order_by(Integration.updated_at.desc())
        .first()
    )
    if not integration:
        raise AppException("INTEGRATION_MISSING", "No Gmail integration found for user", 400)

    enc = EncryptionService()
    creds = _decrypt_credentials(enc, integration)
    access_token = _get_access_token(db, integration, creds)

    message = EmailMessage()
    message["To"] = to_email
    message["Subject"] = "Your Flowberry login code"
    message.set_content(
        f"Your one-time login code is: {otp_code}\n"
        f"It expires in {int(_otp_ttl().total_seconds() / 60)} minutes."
    )
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=20) as client:
        resp = client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers=headers,
            json={"raw": raw},
        )
        resp.raise_for_status()


def _decrypt_credentials(enc: EncryptionService, integration: Integration) -> dict:
    try:
        raw = enc.decrypt(integration.credentials_encrypted)
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return {"oauth_json": "", "api_key": "", "oauth_tokens": {}}


def _get_access_token(db: Session, integration: Integration, creds: dict) -> str:
    tokens = creds.get("oauth_tokens") or {}
    access_token = tokens.get("access_token")
    expires_in = tokens.get("expires_in")
    created_at = tokens.get("created_at")
    if access_token and expires_in and created_at:
        if time.time() < (created_at + int(expires_in) - 60):
            return access_token

    refresh_token = tokens.get("refresh_token")
    oauth_json = creds.get("oauth_json") or ""
    if not refresh_token or not oauth_json:
        raise AppException("OAUTH_MISSING", "Gmail OAuth tokens missing; connect the integration first", 400)

    try:
        parsed = json.loads(oauth_json)
    except Exception:
        raise AppException("OAUTH_INVALID", "Gmail OAuth JSON invalid", 400)

    config = parsed.get("web") or parsed.get("installed") or {}
    client_id = config.get("client_id")
    client_secret = config.get("client_secret")
    token_uri = config.get("token_uri")
    if not client_id or not client_secret or not token_uri:
        raise AppException("OAUTH_INVALID", "Gmail OAuth JSON missing required fields", 400)

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    with httpx.Client(timeout=20) as client:
        resp = client.post(token_uri, data=data)
        resp.raise_for_status()
        payload = resp.json()

    tokens.update(
        {
            "access_token": payload.get("access_token"),
            "expires_in": payload.get("expires_in"),
            "scope": payload.get("scope") or tokens.get("scope"),
            "token_type": payload.get("token_type") or tokens.get("token_type"),
            "created_at": int(time.time()),
        }
    )
    creds["oauth_tokens"] = tokens
    integration.credentials_encrypted = EncryptionService().encrypt(json.dumps(creds))
    db.commit()

    if not tokens.get("access_token"):
        raise AppException("OAUTH_REFRESH_FAILED", "Failed to refresh Gmail access token", 400)
    return tokens["access_token"]


def _generate_otp() -> str:
    return f"{int.from_bytes(os.urandom(3), 'big') % 1000000:06d}"


def _hash_otp(user_id: str, otp_code: str) -> str:
    return hashlib.sha256(f"{user_id}:{otp_code}".encode()).hexdigest()


def _otp_ttl() -> timedelta:
    return timedelta(minutes=5)


def _utc_now():
    return datetime.utcnow()


def _is_valid_email(email: str) -> bool:
    return re.match(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", email, flags=re.I) is not None
