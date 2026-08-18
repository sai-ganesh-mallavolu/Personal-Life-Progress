from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from app.repositories.goal import GoalRepository

from sqlalchemy.orm import Session

from app.models.daily_task import DailyTask
from app.repositories.task import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:

    # ========================================================
    # GOAL OWNERSHIP VALIDATION
    # ========================================================

    @staticmethod
    def _validate_goal_ownership(
        db: Session,
        user_id: int,
        goal_id: int | None,
    ) -> None:

        if goal_id is None:
            return

        goal = GoalRepository.get_by_id(
            db=db,
            goal_id=goal_id,
            user_id=user_id,
        )

        if goal is None:
            raise ValueError(
                "Goal not found or does not belong to the current user"
            )

    # ========================================================
    # RECURRENCE HELPERS
    # ========================================================

    @staticmethod
    def _normalize_recurrence_days(
        recurrence_type: str,
        recurrence_days: list[int],
        start_date: date,
    ) -> list[int]:

        if recurrence_type == "WEEKDAYS":
            return [0, 1, 2, 3, 4]

        if recurrence_type == "WEEKENDS":
            return [5, 6]

        if recurrence_type == "WEEKLY":
            # If no day was explicitly selected,
            # use the task's starting weekday.
            if not recurrence_days:
                return [start_date.weekday()]

            return sorted(set(recurrence_days))

        if recurrence_type == "CUSTOM":
            if not recurrence_days:
                raise ValueError(
                    "recurrence_days is required "
                    "for a custom recurring task.",
                )

            return sorted(set(recurrence_days))

        return []

    @staticmethod
    def _serialize_recurrence_days(
        days: list[int],
    ) -> str | None:

        if not days:
            return None

        return ",".join(
            str(day)
            for day in sorted(set(days))
        )

    @staticmethod
    def _parse_recurrence_days(
        value: str | None,
    ) -> list[int]:

        if not value:
            return []

        try:
            return sorted(
                set(
                    int(day.strip())
                    for day in value.split(",")
                    if day.strip() != ""
                )
            )
        except ValueError:
            return []

    @staticmethod
    def _is_recurrence_date(
        current_date: date,
        start_date: date,
        recurrence_type: str,
        recurrence_days: list[int],
        recurrence_interval: int,
    ) -> bool:

        weekday = current_date.weekday()

        if recurrence_type == "DAILY":
            return True

        if recurrence_type == "WEEKDAYS":
            return weekday in {
                0,
                1,
                2,
                3,
                4,
            }

        if recurrence_type == "WEEKENDS":
            return weekday in {
                5,
                6,
            }

        if recurrence_type in {
            "WEEKLY",
            "CUSTOM",
        }:
            if weekday not in recurrence_days:
                return False

            # Monday of the starting week.
            start_week_monday = (
                start_date
                - timedelta(
                    days=start_date.weekday(),
                )
            )

            # Monday of the current week.
            current_week_monday = (
                current_date
                - timedelta(
                    days=current_date.weekday(),
                )
            )

            weeks_difference = (
                current_week_monday
                - start_week_monday
            ).days // 7

            return (
                weeks_difference
                % recurrence_interval
                == 0
            )

        return False

    @staticmethod
    def _validate_recurrence_settings(
        recurrence_type: str,
        recurrence_end_date: date | None,
        recurrence_days: list[int],
        recurrence_interval: int,
        start_date: date,
    ) -> list[int]:

        if recurrence_type == "NONE":

            if recurrence_end_date is not None:
                raise ValueError(
                    "recurrence_end_date can only "
                    "be used with a recurring task.",
                )

            if recurrence_days:
                raise ValueError(
                    "recurrence_days can only "
                    "be used with a recurring task.",
                )

            if recurrence_interval != 1:
                raise ValueError(
                    "recurrence_interval must be 1 "
                    "for a non-recurring task.",
                )

            return []

        if recurrence_end_date is None:
            raise ValueError(
                "recurrence_end_date is required "
                "for a recurring task.",
            )

        if recurrence_end_date < start_date:
            raise ValueError(
                "recurrence_end_date must be "
                "on or after task_date.",
            )

        if recurrence_interval < 1:
            raise ValueError(
                "recurrence_interval must be at least 1.",
            )

        normalized_days = (
            TaskService._normalize_recurrence_days(
                recurrence_type=recurrence_type,
                recurrence_days=recurrence_days,
                start_date=start_date,
            )
        )

        if recurrence_type == "DAILY":

            if recurrence_interval != 1:
                raise ValueError(
                    "Daily recurring tasks currently "
                    "support an interval of 1 only.",
                )

            normalized_days = []

        if recurrence_type in {
            "WEEKLY",
            "CUSTOM",
        } and not normalized_days:
            raise ValueError(
                "At least one weekday must be selected.",
            )

        return normalized_days

    @staticmethod
    def _generate_recurrence_tasks(
        *,
        user_id: int,
        title: str,
        description: str | None,
        category: str,
        priority: str,
        start_date: date,
        due_time,
        notes: str | None,
        goal_id: int | None,
        recurrence_id: str,
        recurrence_type: str,
        recurrence_end_date: date,
        recurrence_days: list[int],
        recurrence_interval: int,
    ) -> list[DailyTask]:

        serialized_days = (
            TaskService._serialize_recurrence_days(
                recurrence_days,
            )
        )

        tasks: list[DailyTask] = []

        current_date = start_date

        while current_date <= recurrence_end_date:

            should_create = (
                TaskService._is_recurrence_date(
                    current_date=current_date,
                    start_date=start_date,
                    recurrence_type=recurrence_type,
                    recurrence_days=recurrence_days,
                    recurrence_interval=recurrence_interval,
                )
            )

            if should_create:
                tasks.append(
                    DailyTask(
                        user_id=user_id,
                        title=title,
                        description=description,
                        category=category,
                        priority=priority,
                        task_date=current_date,
                        due_time=due_time,
                        notes=notes,
                        goal_id=goal_id,
                        recurrence_id=recurrence_id,
                        recurrence_type=recurrence_type,
                        recurrence_end_date=recurrence_end_date,
                        recurrence_days=serialized_days,
                        recurrence_interval=recurrence_interval,
                        completed=False,
                        completed_at=None,
                    )
                )

            current_date += timedelta(days=1)

        return tasks

    # ========================================================
    # CREATE TASK
    # ========================================================

    @staticmethod
    def create_task(
        db: Session,
        user_id: int,
        data: TaskCreate,
    ) -> DailyTask:

        # ====================================================
        # VALIDATE GOAL OWNERSHIP
        # ====================================================

        TaskService._validate_goal_ownership(
            db=db,
            user_id=user_id,
            goal_id=data.goal_id,
        )

        recurrence_type = data.recurrence_type

        # ====================================================
        # NORMAL TASK
        # ====================================================

        if recurrence_type == "NONE":

            TaskService._validate_recurrence_settings(
                recurrence_type="NONE",
                recurrence_end_date=data.recurrence_end_date,
                recurrence_days=data.recurrence_days,
                recurrence_interval=data.recurrence_interval,
                start_date=data.task_date,
            )

            return TaskRepository.create(
                db=db,
                user_id=user_id,
                title=data.title,
                description=data.description,
                category=data.category,
                priority=data.priority,
                task_date=data.task_date,
                due_time=data.due_time,
                notes=data.notes,
                goal_id=data.goal_id,
                recurrence_id=None,
                recurrence_type="NONE",
                recurrence_end_date=None,
                recurrence_days=None,
                recurrence_interval=1,
            )

        # ====================================================
        # RECURRING TASK VALIDATION
        # ====================================================

        recurrence_days = (
            TaskService._validate_recurrence_settings(
                recurrence_type=recurrence_type,
                recurrence_end_date=data.recurrence_end_date,
                recurrence_days=data.recurrence_days,
                recurrence_interval=data.recurrence_interval,
                start_date=data.task_date,
            )
        )

        recurrence_id = str(uuid4())

        tasks = TaskService._generate_recurrence_tasks(
            user_id=user_id,
            title=data.title,
            description=data.description,
            category=data.category,
            priority=data.priority,
            start_date=data.task_date,
            due_time=data.due_time,
            notes=data.notes,
            goal_id=data.goal_id,
            recurrence_id=recurrence_id,
            recurrence_type=recurrence_type,
            recurrence_end_date=data.recurrence_end_date,
            recurrence_days=recurrence_days,
            recurrence_interval=data.recurrence_interval,
        )

        if not tasks:
            raise ValueError(
                "No task occurrences could be generated "
                "for the selected recurrence settings.",
            )

        created_tasks = TaskRepository.create_many(
            db=db,
            tasks=tasks,
        )

        return created_tasks[0]

    # ========================================================
    # GET TASKS
    # ========================================================

    @staticmethod
    def get_tasks(
        db: Session,
        user_id: int,
    ) -> list[DailyTask]:

        return TaskRepository.get_all(
            db=db,
            user_id=user_id,
        )

    # ========================================================
    # GET SINGLE TASK
    # ========================================================

    @staticmethod
    def get_task(
        db: Session,
        task_id: int,
        user_id: int,
    ) -> DailyTask | None:

        return TaskRepository.get_by_id(
            db=db,
            task_id=task_id,
            user_id=user_id,
        )

    # ========================================================
    # UPDATE SINGLE OCCURRENCE
    # ========================================================

    @staticmethod
    def update_task(
        db: Session,
        task_id: int,
        user_id: int,
        data: TaskUpdate,
    ) -> DailyTask | None:

        task = TaskRepository.get_by_id(
            db=db,
            task_id=task_id,
            user_id=user_id,
        )

        if task is None:
            return None

        update_data = data.model_dump(
            exclude_unset=True,
        )

        
        # ====================================================
        # GOAL OWNERSHIP VALIDATION
        # ====================================================

        if "goal_id" in update_data:
            TaskService._validate_goal_ownership(
                db=db,
                user_id=user_id,
                goal_id=data.goal_id,
            )
        # ====================================================
        # COMPLETION
        # ====================================================

        if "completed" in update_data:

            if update_data["completed"] is True:
                task.completed_at = (
                    datetime.now(timezone.utc)
                )
            else:
                task.completed_at = None

        # ====================================================
        # UPDATE ONLY THIS OCCURRENCE
        # ====================================================

        for field, value in update_data.items():
            setattr(
                task,
                field,
                value,
            )

        db.commit()
        db.refresh(task)

        return task

    # ========================================================
    # UPDATE ENTIRE RECURRING SERIES
    # ========================================================

    @staticmethod
    def update_task_series(
        db: Session,
        task_id: int,
        user_id: int,
        data: TaskUpdate,
    ) -> DailyTask | None:

        task = TaskRepository.get_by_id(
            db=db,
            task_id=task_id,
            user_id=user_id,
        )

        if task is None:
            return None

        if not task.recurrence_id:
            raise ValueError(
                "This task does not belong to a recurring series.",
            )

        if task.recurrence_type == "NONE":
            raise ValueError(
                "This task does not belong to a recurring series.",
            )

        # ====================================================
        # GOAL OWNERSHIP VALIDATION
        # ====================================================

        update_data = data.model_dump(
            exclude_unset=True,
        )

        if "goal_id" in update_data:
            TaskService._validate_goal_ownership(
                db=db,
                user_id=user_id,
                goal_id=data.goal_id,
            )

        # SERIES UPDATE STARTS FROM THIS OCCURRENCE
        # ====================================================

        start_date = task.task_date

        recurrence_type = (
            data.recurrence_type
            if data.recurrence_type is not None
            else task.recurrence_type
        )

        recurrence_end_date = (
            data.recurrence_end_date
            if data.recurrence_end_date is not None
            else task.recurrence_end_date
        )

        recurrence_interval = (
            data.recurrence_interval
            if data.recurrence_interval is not None
            else task.recurrence_interval
        )

        existing_days = (
            TaskService._parse_recurrence_days(
                task.recurrence_days,
            )
        )

        recurrence_days = (
            data.recurrence_days
            if data.recurrence_days is not None
            else existing_days
        )

        # ====================================================
        # NORMAL TASK CONVERSION
        # ====================================================

        if recurrence_type == "NONE":

            # Preserve the selected occurrence,
            # but remove future occurrences.
            future_tasks = TaskRepository.get_series_from_date(
                db=db,
                user_id=user_id,
                recurrence_id=task.recurrence_id,
                start_date=start_date,
            )

            for future_task in future_tasks:
                db.delete(future_task)

            task.recurrence_id = None
            task.recurrence_type = "NONE"
            task.recurrence_end_date = None
            task.recurrence_days = None
            task.recurrence_interval = 1

            if data.title is not None:
                task.title = data.title

            if data.description is not None:
                task.description = data.description

            if data.category is not None:
                task.category = data.category

            if data.priority is not None:
                task.priority = data.priority

            if data.due_time is not None:
                task.due_time = data.due_time

            if data.notes is not None:
                task.notes = data.notes

            if "goal_id" in update_data:
                task.goal_id = data.goal_id

            db.commit()
            db.refresh(task)

            return task

        # ====================================================
        # VALIDATE NEW RECURRENCE
        # ====================================================

        recurrence_days = (
            TaskService._validate_recurrence_settings(
                recurrence_type=recurrence_type,
                recurrence_end_date=recurrence_end_date,
                recurrence_days=recurrence_days,
                recurrence_interval=recurrence_interval,
                start_date=start_date,
            )
        )

        # ====================================================
        # UPDATE SELECTED OCCURRENCE / FUTURE
        # ====================================================

        future_tasks = TaskRepository.get_series_from_date(
            db=db,
            user_id=user_id,
            recurrence_id=task.recurrence_id,
            start_date=start_date,
        )

        # Delete selected occurrence and all future
        # occurrences. Past history remains untouched.
        for future_task in future_tasks:
            db.delete(future_task)

        db.flush()

        # ====================================================
        # GENERATE NEW FUTURE OCCURRENCES
        # ====================================================

        new_tasks = TaskService._generate_recurrence_tasks(
            user_id=user_id,
            title=(
                data.title
                if data.title is not None
                else task.title
            ),
            description=(
                data.description
                if data.description is not None
                else task.description
            ),
            category=(
                data.category
                if data.category is not None
                else task.category
            ),
            priority=(
                data.priority
                if data.priority is not None
                else task.priority
            ),
            start_date=start_date,
            due_time=(
                data.due_time
                if data.due_time is not None
                else task.due_time
            ),
            notes=(
                data.notes
                if data.notes is not None
                else task.notes
            ),
            goal_id=(
                data.goal_id
                if "goal_id" in update_data
                else task.goal_id
            ),
            recurrence_id=task.recurrence_id,
            recurrence_type=recurrence_type,
            recurrence_end_date=recurrence_end_date,
            recurrence_days=recurrence_days,
            recurrence_interval=recurrence_interval,
        )

        if not new_tasks:
            raise ValueError(
                "No task occurrences could be generated "
                "for the selected recurrence settings.",
            )

        db.add_all(new_tasks)
        db.commit()

        # Return the occurrence corresponding to
        # the selected start date.
        updated_task = (
            db.query(DailyTask)
            .filter(
                DailyTask.user_id == user_id,
                DailyTask.recurrence_id
                == task.recurrence_id,
                DailyTask.task_date == start_date,
            )
            .order_by(DailyTask.id)
            .first()
        )

        return updated_task

    # ========================================================
    # DELETE SINGLE OCCURRENCE
    # ========================================================

    @staticmethod
    def delete_task(
        db: Session,
        task_id: int,
        user_id: int,
    ) -> bool:

        task = TaskRepository.get_by_id(
            db=db,
            task_id=task_id,
            user_id=user_id,
        )

        if task is None:
            return False

        TaskRepository.delete(
            db=db,
            task=task,
        )

        return True

    # ========================================================
    # DELETE ENTIRE SERIES
    # ========================================================

    @staticmethod
    def delete_task_series(
        db: Session,
        recurrence_id: str,
        user_id: int,
    ) -> int:

        tasks = TaskRepository.get_series(
            db=db,
            user_id=user_id,
            recurrence_id=recurrence_id,
        )

        if not tasks:
            return 0

        count = len(tasks)

        TaskRepository.delete_many(
            db=db,
            tasks=tasks,
        )

        return count





