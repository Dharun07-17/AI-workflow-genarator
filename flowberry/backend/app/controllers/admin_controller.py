from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.core.db import get_db
from app.models.workflow import Workflow

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/workflows")
def list_all_workflows(_: object = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Workflow).order_by(Workflow.created_at.desc()).limit(200).all()
    return {
        "success": True,
        "data": [
            {
                "id": w.id,
                "user_id": w.user_id,
                "status": w.status,
                "intent_summary": w.intent_summary,
                "created_at": w.created_at,
            }
            for w in rows
        ],
        "message": "Admin workflows fetched",
    }
