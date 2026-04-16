import json
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.execution_log import ExecutionLog


class LogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        workflow_id: str,
        message: str,
        level: str = "INFO",
        job_id: str | None = None,
        step_id: str | None = None,
        context: dict | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
    ) -> ExecutionLog:
        log = ExecutionLog(
            id=str(uuid4()),
            workflow_id=workflow_id,
            job_id=job_id,
            step_id=step_id,
            level=level,
            message_sanitized=message,
            context_json=json.dumps(context or {}),
            trace_id=trace_id,
            span_id=span_id,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list_for_workflow(self, workflow_id: str) -> list[ExecutionLog]:
        return self.db.query(ExecutionLog).filter(ExecutionLog.workflow_id == workflow_id).order_by(ExecutionLog.created_at.asc()).all()
