from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.repositories.goal import GoalRepository
from app.schemas.goal import GoalCreate, GoalUpdate


class GoalService:

    @staticmethod
    def create_goal(
        db: Session,
        user_id: int,
        data: GoalCreate,
    ) -> Goal:

        if data.current_value > data.target_value:
            raise ValueError(
                "Current value cannot be greater than target value"
            )

        if data.target_date < data.start_date:
            raise ValueError(
                "Target date cannot be before start date"
            )

        return GoalRepository.create(
            db=db,
            user_id=user_id,
            title=data.title,
            description=data.description,
            category=data.category,
            target_value=data.target_value,
            current_value=data.current_value,
            start_date=data.start_date,
            target_date=data.target_date,
            status=data.status,
        )

    @staticmethod
    def get_goals(
        db: Session,
        user_id: int,
    ) -> list[Goal]:

        return GoalRepository.get_all(
            db=db,
            user_id=user_id,
        )

    @staticmethod
    def get_goal(
        db: Session,
        goal_id: int,
        user_id: int,
    ) -> Goal | None:

        return GoalRepository.get_by_id(
            db=db,
            goal_id=goal_id,
            user_id=user_id,
        )

    @staticmethod
    def update_goal(
        db: Session,
        goal_id: int,
        user_id: int,
        data: GoalUpdate,
    ) -> Goal | None:

        goal = GoalRepository.get_by_id(
            db=db,
            goal_id=goal_id,
            user_id=user_id,
        )

        if goal is None:
            return None

        update_data = data.model_dump(
            exclude_unset=True,
        )

        new_start_date = update_data.get(
            "start_date",
            goal.start_date,
        )

        new_target_date = update_data.get(
            "target_date",
            goal.target_date,
        )

        new_target_value = update_data.get(
            "target_value",
            goal.target_value,
        )

        new_current_value = update_data.get(
            "current_value",
            goal.current_value,
        )

        if new_target_date < new_start_date:
            raise ValueError(
                "Target date cannot be before start date"
            )

        if new_current_value > new_target_value:
            raise ValueError(
                "Current value cannot be greater than target value"
            )

        for field, value in update_data.items():
            setattr(
                goal,
                field,
                value,
            )

        db.commit()
        db.refresh(goal)

        return goal

    @staticmethod
    def delete_goal(
        db: Session,
        goal_id: int,
        user_id: int,
    ) -> bool:

        goal = GoalRepository.get_by_id(
            db=db,
            goal_id=goal_id,
            user_id=user_id,
        )

        if goal is None:
            return False

        GoalRepository.delete(
            db=db,
            goal=goal,
        )

        return True