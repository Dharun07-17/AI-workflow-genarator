from sqlalchemy.orm import Session
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep
from app.models.job import Job


class WorkflowRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_workflow(self, workflow: Workflow) -> Workflow:
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def bulk_create_steps(self, steps: list[WorkflowStep]) -> list[WorkflowStep]:
        self.db.add_all(steps)
        self.db.commit()
        return steps

    def create_jobs(self, jobs: list[Job]) -> list[Job]:
        self.db.add_all(jobs)
        self.db.commit()
        return jobs

    def get_workflow(self, workflow_id: str, user_id: str | None = None) -> Workflow | None:
        query = self.db.query(Workflow).filter(Workflow.id == workflow_id)
        if user_id is not None:
            query = query.filter(Workflow.user_id == user_id)
        return query.first()

    def list_steps(self, workflow_id: str) -> list[WorkflowStep]:
        return self.db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow_id).order_by(WorkflowStep.step_order.asc()).all()

    def mark_status(self, workflow_id: str, status: str) -> None:
        row = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if row:
            row.status = status
            self.db.commit()
