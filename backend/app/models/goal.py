from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PERSONAL",
    )

    target_value: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,
    )

    current_value: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    target_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVE",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ========================================================
    # USER
    # ========================================================

    user = relationship(
        "User",
        back_populates="goals",
    )

    # ========================================================
    # TASK RELATIONSHIP
    # ========================================================

    tasks = relationship(
        "DailyTask",
        back_populates="goal",
        passive_deletes=True,
    )