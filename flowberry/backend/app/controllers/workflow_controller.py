from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, CurrentUser
from app.core.db import get_db
from app.middleware.exception_middleware import AppException
from app.repositories.log_repository import LogRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.workflow import WorkflowCreateRequest
from app.services.fizz_planning_service import FizzPlanningService
from app.services.queue_publisher_service import QueuePublisherService
from app.services.workflow_execution_service import WorkflowExecutionService
from app.events.listeners import observer_singleton

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("")
async def create_workflow(
    payload: WorkflowCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.prompt.strip():
        raise AppException("INVALID_PROMPT", "Prompt cannot be empty", 400)

    planner = FizzPlanningService()
    plan = planner.create_plan(payload.prompt)

    publisher = QueuePublisherService()
    executor = WorkflowExecutionService(db=db, publisher=publisher, observer=observer_singleton)
    data = await executor.create_and_dispatch(user.user_id, payload.prompt, plan)
    await publisher.close()

    return {"success": True, "data": data, "message": "Workflow created"}


@router.get("/{workflow_id}")
def get_workflow(
    workflow_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = WorkflowRepository(db)
    workflow = repo.get_workflow(workflow_id, None if user.role == "admin" else user.user_id)
    if not workflow:
        raise AppException("WORKFLOW_NOT_FOUND", "Workflow does not exist", 404)

    return {
        "success": True,
        "data": {
            "id": workflow.id,
            "status": workflow.status,
            "intent_summary": workflow.intent_summary,
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at,
        },
        "message": "Workflow fetched",
    }


@router.get("/{workflow_id}/steps")
def get_steps(
    workflow_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = WorkflowRepository(db)
    workflow = repo.get_workflow(workflow_id, None if user.role == "admin" else user.user_id)
    if not workflow:
        raise AppException("WORKFLOW_NOT_FOUND", "Workflow does not exist", 404)
    steps = repo.list_steps(workflow_id)
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "step_order": s.step_order,
                "step_name": s.step_name,
                "step_type": s.step_type,
                "status": s.status,
                "depends_on_step_id": s.depends_on_step_id,
            }
            for s in steps
        ],
        "message": "Workflow steps fetched",
    }


@router.get("/{workflow_id}/logs")
def get_logs(
    workflow_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workflow_repo = WorkflowRepository(db)
    workflow = workflow_repo.get_workflow(workflow_id, None if user.role == "admin" else user.user_id)
    if not workflow:
        raise AppException("WORKFLOW_NOT_FOUND", "Workflow does not exist", 404)

    logs = LogRepository(db).list_for_workflow(workflow_id)
    return {
        "success": True,
        "data": [
            {
                "id": l.id,
                "job_id": l.job_id,
                "level": l.level,
                "message": l.message_sanitized,
                "trace_id": l.trace_id,
                "created_at": l.created_at,
            }
            for l in logs
        ],
        "message": "Logs fetched",
    }


@router.post("/{workflow_id}/retry")
async def retry_workflow(
    workflow_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = WorkflowRepository(db)
    workflow = repo.get_workflow(workflow_id, None if user.role == "admin" else user.user_id)
    if not workflow:
        raise AppException("WORKFLOW_NOT_FOUND", "Workflow does not exist", 404)

    steps = [s for s in repo.list_steps(workflow_id) if s.status in {"failed", "queued"}]
    publisher = QueuePublisherService()
    for step in steps:
        await publisher.publish_job(
            queue_name=step.step_type,
            payload={
                "workflow_id": workflow_id,
                "workflow_step_id": step.id,
                "idempotency_key": f"{workflow_id}:{step.id}",
                "retry": True,
            },
            idempotency_key=f"{workflow_id}:{step.id}",
        )
    await publisher.close()

    return {"success": True, "data": {"queued_steps": len(steps)}, "message": "Retry queued"}
