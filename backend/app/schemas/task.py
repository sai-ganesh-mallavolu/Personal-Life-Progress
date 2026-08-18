from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


RecurrenceType = Literal[
    "NONE",
    "DAILY",
    "WEEKLY",
    "WEEKDAYS",
    "WEEKENDS",
    "CUSTOM",
]


class TaskCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    category: str = Field(
        default="PERSONAL",
        max_length=50,
    )

    priority: str = Field(
        default="MEDIUM",
        max_length=20,
    )

    task_date: date

    due_time: time | None = None

    notes: str | None = None

    # ========================================================
    # GOAL
    # ========================================================

    # Optional goal association.
    # Existing tasks can still be created without a goal.
    goal_id: int | None = None

    # ========================================================
    # RECURRENCE
    # ========================================================

    recurrence_type: RecurrenceType = "NONE"

    recurrence_end_date: date | None = None

    # Weekday numbers:
    #
    # 0 = Monday
    # 1 = Tuesday
    # 2 = Wednesday
    # 3 = Thursday
    # 4 = Friday
    # 5 = Saturday
    # 6 = Sunday
    #
    # Example:
    # [0, 2, 4] = Monday, Wednesday, Friday
    recurrence_days: list[int] = Field(
        default_factory=list,
    )

    # Every N weeks for WEEKLY/CUSTOM.
    recurrence_interval: int = Field(
        default=1,
        ge=1,
        le=52,
    )

    @field_validator("recurrence_days")
    @classmethod
    def validate_recurrence_days(
        cls,
        value: list[int],
    ) -> list[int]:

        if len(value) > 7:
            raise ValueError(
                "A maximum of 7 recurrence days is allowed.",
            )

        if len(set(value)) != len(value):
            raise ValueError(
                "recurrence_days cannot contain duplicates.",
            )

        invalid_days = [
            day
            for day in value
            if day < 0 or day > 6
        ]

        if invalid_days:
            raise ValueError(
                "recurrence_days must contain values from 0 to 6.",
            )

        return sorted(value)


class TaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = None

    category: str | None = Field(
        default=None,
        max_length=50,
    )

    priority: str | None = Field(
        default=None,
        max_length=20,
    )

    task_date: date | None = None

    due_time: time | None = None

    completed: bool | None = None

    notes: str | None = None

    # ========================================================
    # GOAL
    # ========================================================

    # Optional goal association.
    # None means the task does not belong to a goal.
    goal_id: int | None = None

    # ========================================================
    # RECURRENCE
    # ========================================================

    recurrence_type: RecurrenceType | None = None

    recurrence_end_date: date | None = None

    recurrence_days: list[int] | None = None

    recurrence_interval: int | None = Field(
        default=None,
        ge=1,
        le=52,
    )

    @field_validator("recurrence_days")
    @classmethod
    def validate_recurrence_days(
        cls,
        value: list[int] | None,
    ) -> list[int] | None:

        if value is None:
            return None

        if len(value) > 7:
            raise ValueError(
                "A maximum of 7 recurrence days is allowed.",
            )

        if len(set(value)) != len(value):
            raise ValueError(
                "recurrence_days cannot contain duplicates.",
            )

        invalid_days = [
            day
            for day in value
            if day < 0 or day > 6
        ]

        if invalid_days:
            raise ValueError(
                "recurrence_days must contain values from 0 to 6.",
            )

        return sorted(value)


class TaskResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    user_id: int

    title: str
    description: str | None

    category: str
    priority: str

    task_date: date
    due_time: time | None

    completed: bool
    completed_at: datetime | None

    notes: str | None

    # ========================================================
    # GOAL RESPONSE
    # ========================================================

    goal_id: int | None

    # ========================================================
    # RECURRENCE RESPONSE
    # ========================================================

    recurrence_id: str | None

    recurrence_type: str

    recurrence_end_date: date | None

    recurrence_days: str | None

    recurrence_interval: int

    created_at: datetime
    updated_at: datetime