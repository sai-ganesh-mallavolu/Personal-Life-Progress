from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DailyTask(Base):
    __tablename__ = "daily_tasks"

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

    # ========================================================
    # GOAL
    # ========================================================

    # Optional relationship.
    # Existing tasks can continue to work without a goal.
    goal_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "goals.id",
            ondelete="SET NULL",
        ),
        nullable=True,
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

    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEDIUM",
    )

    task_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    due_time: Mapped[time | None] = mapped_column(
        Time,
        nullable=True,
    )

    completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ========================================================
    # RECURRENCE
    # ========================================================

    # Same UUID is stored for every occurrence
    # belonging to the same recurring series.
    recurrence_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )

    # NONE / DAILY / WEEKLY / WEEKDAYS / WEEKENDS / CUSTOM
    recurrence_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="NONE",
        index=True,
    )

    # Final date of the recurring series.
    recurrence_end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    # Selected weekdays for WEEKLY/CUSTOM.
    #
    # Format:
    # 0 = Monday
    # 1 = Tuesday
    # 2 = Wednesday
    # 3 = Thursday
    # 4 = Friday
    # 5 = Saturday
    # 6 = Sunday
    #
    # Example:
    # "0,2,4" = Monday, Wednesday, Friday
    recurrence_days: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    # Repeat interval.
    #
    # DAILY      -> normally 1
    # WEEKLY     -> every N weeks
    # CUSTOM     -> every N weeks
    recurrence_interval: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    # ========================================================
    # TIMESTAMPS
    # ========================================================

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
        back_populates="tasks",
    )

    # ========================================================
    # GOAL RELATIONSHIP
    # ========================================================

    goal = relationship(
        "Goal",
        back_populates="tasks",
    )