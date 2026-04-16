from datetime import datetime
from sqlalchemy.orm import Session
from app.models.job import Job


class JobRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_idempotency_key(self, key: str) -> Job | None:
        return self.db.query(Job).filter(Job.idempotency_key == key).first()

    def mark_running(self, job: Job) -> None:
        job.status = "running"
        job.started_at = datetime.utcnow()
        self.db.commit()

    def mark_done(self, job: Job) -> None:
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        self.db.commit()

    def mark_failed(self, job: Job, code: str, message: str) -> None:
        job.status = "failed"
        job.error_code = code
        job.error_message_sanitized = message[:500]
        job.retry_count += 1
        self.db.commit()
