from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), index=True)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id"), nullable=True, index=True)
    step_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    level: Mapped[str] = mapped_column(String(16), default="INFO")
    message_sanitized: Mapped[str] = mapped_column(String(500), nullable=False)
    context_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    trace_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    span_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="logs")
