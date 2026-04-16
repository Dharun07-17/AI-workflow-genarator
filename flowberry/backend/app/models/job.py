from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), index=True)
    workflow_step_id: Mapped[str] = mapped_column(ForeignKey("workflow_steps.id"), index=True)
    queue_name: Mapped[str] = mapped_column(String(64), nullable=False)
    worker_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message_sanitized: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    workflow = relationship("Workflow", back_populates="jobs")
