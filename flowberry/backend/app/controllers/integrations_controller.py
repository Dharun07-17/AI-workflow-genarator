import json
from uuid import uuid4
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, CurrentUser
from app.core.db import get_db
from app.core.security import verify_password
from app.middleware.exception_middleware import AppException
from app.models.integration import Integration
from app.repositories.integration_repository import IntegrationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.integration import (
    IntegrationCreateRequest,
    IntegrationDeleteRequest,
    IntegrationCheckRequest,
)
from app.services.encryption_service import EncryptionService

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("")
def list_integrations(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = IntegrationRepository(db)
    rows = repo.list_for_user(user.user_id)
    items = []
    for row in rows:
        # Do not expose secrets
        items.append(
            {
                "id": row.id,
                "provider": row.provider,
                "display_name": row.display_name,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
                "has_oauth_json": True,
                "has_api_key": True,
            }
        )

    return {"success": True, "data": items, "message": "Integrations fetched"}


@router.post("")
def create_integration(
    payload: IntegrationCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.display_name.strip():
        raise AppException("INVALID_NAME", "Display name is required", 400)

    enc = EncryptionService()
    secret_payload = {
        "oauth_json": payload.oauth_json or "",
        "api_key": payload.api_key or "",
    }
    encrypted = enc.encrypt(json.dumps(secret_payload))

    repo = IntegrationRepository(db)
    integration = repo.create(
        Integration(
            id=str(uuid4()),
            user_id=user.user_id,
            provider=payload.provider,
            display_name=payload.display_name,
            credentials_encrypted=encrypted,
        )
    )

    return {
        "success": True,
        "data": {
            "id": integration.id,
            "provider": integration.provider,
            "display_name": integration.display_name,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
            "has_oauth_json": bool(payload.oauth_json),
            "has_api_key": bool(payload.api_key),
        },
        "message": "Integration created",
    }


@router.post("/check")
def check_integration(
    payload: IntegrationCheckRequest,
    user: CurrentUser = Depends(get_current_user),
):
    provider = payload.provider.strip()
    errors: list[str] = []

    oauth_required = provider in {"Google Drive", "Gmail", "Google Calendar"}
    api_required = provider in {"NewsAPI", "Notion", "SERP API"}

    if oauth_required:
        if not payload.oauth_json:
            errors.append("OAuth JSON is required for this provider.")
        else:
            try:
                parsed = json.loads(payload.oauth_json)
                if not isinstance(parsed, dict):
                    errors.append("OAuth JSON must be an object.")
            except Exception:
                errors.append("OAuth JSON must be valid JSON.")

    if api_required:
        if not payload.api_key or len(payload.api_key.strip()) < 8:
            errors.append("API key looks too short for this provider.")

    if not oauth_required and not api_required:
        # Generic validation if custom provider
        if not payload.oauth_json and not payload.api_key:
            errors.append("Provide OAuth JSON or API key.")

    return {"success": len(errors) == 0, "errors": errors}


@router.delete("/{integration_id}")
def delete_integration(
    integration_id: str,
    payload: IntegrationDeleteRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = IntegrationRepository(db)
    integration = repo.get(integration_id)
    if not integration or integration.user_id != user.user_id:
        raise AppException("INTEGRATION_NOT_FOUND", "Integration not found", 404)

    user_repo = UserRepository(db)
    current_user = user_repo.get_by_id(user.user_id)
    if not current_user or not verify_password(payload.password, current_user.password_hash):
        raise AppException("UNAUTHORIZED", "Password incorrect", 401)

    repo.delete(integration)
    return {"success": True, "data": {"deleted": integration_id}, "message": "Integration deleted"}
