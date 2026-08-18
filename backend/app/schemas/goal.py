from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class GoalCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    category: str = Field(
        default="PERSONAL",
        min_length=1,
        max_length=50,
    )

    target_value: int = Field(
        default=100,
        ge=1,
    )

    current_value: int = Field(
        default=0,
        ge=0,
    )

    start_date: date

    target_date: date

    status: str = Field(
        default="ACTIVE",
        min_length=1,
        max_length=20,
    )


class GoalUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    target_value: int | None = Field(
        default=None,
        ge=1,
    )

    current_value: int | None = Field(
        default=None,
        ge=0,
    )

    start_date: date | None = None

    target_date: date | None = None

    status: str | None = Field(
        default=None,
        min_length=1,
        max_length=20,
    )


class GoalResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    user_id: int
    title: str
    description: str | None
    category: str
    target_value: int
    current_value: int
    start_date: date
    target_date: date
    status: str
    created_at: datetime
    updated_at: datetime