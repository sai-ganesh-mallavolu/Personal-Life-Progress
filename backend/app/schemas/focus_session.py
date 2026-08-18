from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FocusSessionCreate(BaseModel):
    started_at: datetime
    ended_at: datetime
    duration_minutes: int = Field(
        ge=1,
        le=1440,
    )
    task_id: int | None = None


class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    user_id: int
    task_id: int | None
    started_at: datetime
    ended_at: datetime
    duration_minutes: int


class FocusTimeResponse(BaseModel):
    date: str
    total_minutes: int