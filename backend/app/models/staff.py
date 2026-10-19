from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.utils.timezone import ist_now

class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    staff_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(100))
    skill_category: Mapped[str] = mapped_column(String(100))
    availability_status: Mapped[str] = mapped_column(String(50), default="available")
    availability_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ist_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ist_now, onupdate=ist_now)
