from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.goal import Goal


class GoalRepository:

    @staticmethod
    def create(
        db: Session,
        user_id: int,
        title: str,
        description: str | None,
        category: str,
        target_value: int,
        current_value: int,
        start_date,
        target_date,
        status: str,
    ) -> Goal:

        goal = Goal(
            user_id=user_id,
            title=title,
            description=description,
            category=category,
            target_value=target_value,
            current_value=current_value,
            start_date=start_date,
            target_date=target_date,
            status=status,
        )

        db.add(goal)
        db.commit()
        db.refresh(goal)

        return goal

    @staticmethod
    def get_by_id(
        db: Session,
        goal_id: int,
        user_id: int,
    ) -> Goal | None:

        statement = select(Goal).where(
            Goal.id == goal_id,
            Goal.user_id == user_id,
        )

        return db.scalar(statement)

    @staticmethod
    def get_all(
        db: Session,
        user_id: int,
    ) -> list[Goal]:

        statement = (
            select(Goal)
            .where(
                Goal.user_id == user_id,
            )
            .order_by(
                Goal.target_date,
                Goal.id,
            )
        )

        return list(
            db.scalars(statement).all()
        )

    @staticmethod
    def delete(
        db: Session,
        goal: Goal,
    ) -> None:

        db.delete(goal)
        db.commit()