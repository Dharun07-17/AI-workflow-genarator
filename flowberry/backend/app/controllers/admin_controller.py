from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.core.db import get_db
from app.models.workflow import Workflow
from app.middleware.exception_middleware import AppException
from app.repositories.workflow_repository import WorkflowRepository

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


@router.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: str, _: object = Depends(require_admin), db: Session = Depends(get_db)):
    repo = WorkflowRepository(db)
    workflow = repo.get_workflow(workflow_id)
    if not workflow:
        raise AppException("WORKFLOW_NOT_FOUND", "Workflow does not exist", 404)

    repo.delete_workflow(workflow_id)
    return {"success": True, "data": {"deleted": workflow_id}, "message": "Workflow deleted"}
