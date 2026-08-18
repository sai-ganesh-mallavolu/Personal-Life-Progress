from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.focus_session import FocusSession


class FocusSessionRepository:

    @staticmethod
    def create(
        db: Session,
        user_id: int,
        started_at: datetime,
        ended_at: datetime,
        duration_minutes: int,
        task_id: int | None = None,
    ) -> FocusSession:

        session = FocusSession(
            user_id=user_id,
            task_id=task_id,
            started_at=started_at,
            ended_at=ended_at,
            duration_minutes=duration_minutes,
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        return session

    @staticmethod
    def get_by_id(
        db: Session,
        session_id: int,
        user_id: int,
    ) -> FocusSession | None:

        return (
            db.query(FocusSession)
            .filter(
                FocusSession.id == session_id,
                FocusSession.user_id == user_id,
            )
            .first()
        )

    @staticmethod
    def get_all(
        db: Session,
        user_id: int,
    ) -> list[FocusSession]:

        return (
            db.query(FocusSession)
            .filter(
                FocusSession.user_id == user_id,
            )
            .order_by(
                FocusSession.started_at.desc(),
            )
            .all()
        )

    @staticmethod
    def get_total_minutes_for_date(
        db: Session,
        user_id: int,
        target_date: date,
    ) -> int:

        result = (
            db.query(
                func.coalesce(
                    func.sum(
                        FocusSession.duration_minutes,
                    ),
                    0,
                )
            )
            .filter(
                FocusSession.user_id == user_id,
                func.date(
                    FocusSession.started_at,
                )
                == target_date,
            )
            .scalar()
        )

        return int(result or 0)