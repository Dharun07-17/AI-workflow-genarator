from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id"), index=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(64), nullable=False)
    step_type: Mapped[str] = mapped_column(String(64), nullable=False)
    depends_on_step_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    input_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    workflow = relationship("Workflow", back_populates="steps")
