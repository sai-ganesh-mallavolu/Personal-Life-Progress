from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.daily_task import DailyTask


class TaskRepository:

    # ========================================================
    # CREATE
    # ========================================================

    @staticmethod
    def create(
        db: Session,
        user_id: int,
        title: str,
        description: str | None,
        category: str,
        priority: str,
        task_date,
        due_time,
        notes: str | None,
        goal_id: int | None = None,
        recurrence_id: str | None = None,
        recurrence_type: str = "NONE",
        recurrence_end_date=None,
        recurrence_days: str | None = None,
        recurrence_interval: int = 1,
    ) -> DailyTask:

        task = DailyTask(
            user_id=user_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            task_date=task_date,
            due_time=due_time,
            notes=notes,

            # ====================================================
            # GOAL
            # ====================================================

            goal_id=goal_id,

            # ====================================================
            # RECURRENCE
            # ====================================================

            recurrence_id=recurrence_id,
            recurrence_type=recurrence_type,
            recurrence_end_date=recurrence_end_date,
            recurrence_days=recurrence_days,
            recurrence_interval=recurrence_interval,
        )

        db.add(task)
        db.commit()
        db.refresh(task)

        return task

    # ========================================================
    # CREATE MANY
    # ========================================================

    @staticmethod
    def create_many(
        db: Session,
        tasks: list[DailyTask],
    ) -> list[DailyTask]:

        if not tasks:
            return []

        db.add_all(tasks)
        db.commit()

        for task in tasks:
            db.refresh(task)

        return tasks

    # ========================================================
    # GET BY ID
    # ========================================================

    @staticmethod
    def get_by_id(
        db: Session,
        task_id: int,
        user_id: int,
    ) -> DailyTask | None:

        statement = select(DailyTask).where(
            DailyTask.id == task_id,
            DailyTask.user_id == user_id,
        )

        return db.scalar(statement)

    # ========================================================
    # GET ALL
    # ========================================================

    @staticmethod
    def get_all(
        db: Session,
        user_id: int,
    ) -> list[DailyTask]:

        statement = (
            select(DailyTask)
            .where(
                DailyTask.user_id == user_id,
            )
            .order_by(
                DailyTask.task_date,
                DailyTask.due_time,
                DailyTask.id,
            )
        )

        return list(
            db.scalars(statement).all(),
        )

    # ========================================================
    # GET SERIES
    # ========================================================

    @staticmethod
    def get_series(
        db: Session,
        user_id: int,
        recurrence_id: str,
    ) -> list[DailyTask]:

        statement = (
            select(DailyTask)
            .where(
                DailyTask.user_id == user_id,
                DailyTask.recurrence_id
                == recurrence_id,
            )
            .order_by(
                DailyTask.task_date,
                DailyTask.id,
            )
        )

        return list(
            db.scalars(statement).all(),
        )

    # ========================================================
    # GET SERIES FROM DATE
    # ========================================================

    @staticmethod
    def get_series_from_date(
        db: Session,
        user_id: int,
        recurrence_id: str,
        start_date: date,
    ) -> list[DailyTask]:

        statement = (
            select(DailyTask)
            .where(
                DailyTask.user_id == user_id,
                DailyTask.recurrence_id
                == recurrence_id,
                DailyTask.task_date >= start_date,
            )
            .order_by(
                DailyTask.task_date,
                DailyTask.id,
            )
        )

        return list(
            db.scalars(statement).all(),
        )

    # ========================================================
    # DELETE
    # ========================================================

    @staticmethod
    def delete(
        db: Session,
        task: DailyTask,
    ) -> None:

        db.delete(task)
        db.commit()

    # ========================================================
    # DELETE MANY
    # ========================================================

    @staticmethod
    def delete_many(
        db: Session,
        tasks: list[DailyTask],
    ) -> None:

        if not tasks:
            return

        for task in tasks:
            db.delete(task)

        db.commit()