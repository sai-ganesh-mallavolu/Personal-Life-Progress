from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models.focus_session import FocusSession
from app.repositories.focus_session import FocusSessionRepository
from app.schemas.focus_session import (
    FocusSessionCreate,
    FocusTimeResponse,
)


class FocusSessionService:

    @staticmethod
    def create_session(
        db: Session,
        user_id: int,
        data: FocusSessionCreate,
    ) -> FocusSession:

        if data.ended_at <= data.started_at:
            raise ValueError(
                "ended_at must be after started_at."
            )

        actual_duration = int(
            (
                data.ended_at - data.started_at
            ).total_seconds()
            // 60
        )

        if actual_duration < 1:
            raise ValueError(
                "Focus session must be at least 1 minute."
            )

        return FocusSessionRepository.create(
            db=db,
            user_id=user_id,
            task_id=data.task_id,
            started_at=data.started_at,
            ended_at=data.ended_at,
            duration_minutes=actual_duration,
        )

    @staticmethod
    def get_sessions(
        db: Session,
        user_id: int,
    ) -> list[FocusSession]:

        return FocusSessionRepository.get_all(
            db=db,
            user_id=user_id,
        )

    @staticmethod
    def get_session(
        db: Session,
        session_id: int,
        user_id: int,
    ) -> FocusSession | None:

        return FocusSessionRepository.get_by_id(
            db=db,
            session_id=session_id,
            user_id=user_id,
        )

    @staticmethod
    def get_today_focus_time(
        db: Session,
        user_id: int,
        target_date: date,
    ) -> FocusTimeResponse:

        total_minutes = (
            FocusSessionRepository
            .get_total_minutes_for_date(
                db=db,
                user_id=user_id,
                target_date=target_date,
            )
        )

        return FocusTimeResponse(
            date=target_date.isoformat(),
            total_minutes=total_minutes,
        )