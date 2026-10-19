from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.utils.timezone import ist_now

class ScheduleRun(Base):
    __tablename__ = "schedule_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(50), default="PENDING_REVIEW")
    solver_status: Mapped[str] = mapped_column(String(50))
    objective_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    runtime_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_tasks: Mapped[int] = mapped_column(Integer, default=0)
    scheduled_tasks: Mapped[int] = mapped_column(Integer, default=0)
    unscheduled_tasks: Mapped[int] = mapped_column(Integer, default=0)
    scenario_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_schedule_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reviewer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ist_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ist_now, onupdate=ist_now)

    assignments: Mapped[list["Assignment"]] = relationship("Assignment", back_populates="schedule_run", cascade="all, delete-orphan")

class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_run_id: Mapped[int] = mapped_column(Integer, ForeignKey("schedule_runs.id"))
    task_id: Mapped[str] = mapped_column(String(50), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    staff_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False)
    unscheduled_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ist_now)

    schedule_run: Mapped["ScheduleRun"] = relationship("ScheduleRun", back_populates="assignments")
