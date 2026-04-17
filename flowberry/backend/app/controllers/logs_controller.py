from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, CurrentUser
from app.core.db import get_db
from app.repositories.log_repository import LogRepository
from app.services.workflow_naming_service import suggest_workflow_name

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/recent")
def recent_logs(
    limit: int = Query(default=120, ge=1, le=500),
    workflow_id: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = LogRepository(db).list_recent_for_user(user_id=user.user_id, limit=limit, workflow_id=workflow_id)
    # Return in chronological order so the UI reads naturally.
    rows = list(reversed(rows))

    return {
        "success": True,
        "data": [
            {
                "id": log.id,
                "workflow_id": wf.id,
                "workflow_name": (wf.display_name or "").strip() or suggest_workflow_name(wf.intent_summary or wf.original_prompt),
                "workflow_status": wf.status,
                "job_id": log.job_id,
                "level": log.level,
                "message": log.message_sanitized,
                "trace_id": log.trace_id,
                "created_at": log.created_at,
            }
            for (log, wf) in rows
        ],
        "message": "Recent logs fetched",
    }
