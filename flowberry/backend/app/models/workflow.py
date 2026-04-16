from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    original_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    intent_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    priority: Mapped[str] = mapped_column(String(16), default="normal")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="workflows")
    steps = relationship("WorkflowStep", back_populates="workflow")
    jobs = relationship("Job", back_populates="workflow")
    logs = relationship("ExecutionLog", back_populates="workflow")
