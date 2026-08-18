from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services.task import TaskService


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]

Database = Annotated[
    Session,
    Depends(get_db),
]


# ============================================================
# CREATE TASK
# ============================================================

@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    data: TaskCreate,
    db: Database,
    current_user: CurrentUser,
) -> TaskResponse:

    try:
        return TaskService.create_task(
            db=db,
            user_id=current_user.id,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# ============================================================
# GET TASKS
# ============================================================

@router.get(
    "",
    response_model=list[TaskResponse],
)
def get_tasks(
    db: Database,
    current_user: CurrentUser,
) -> list[TaskResponse]:

    return TaskService.get_tasks(
        db=db,
        user_id=current_user.id,
    )


# ============================================================
# GET SINGLE TASK
# ============================================================

@router.get(
    "/{task_id}",
    response_model=TaskResponse,
)
def get_task(
    task_id: int,
    db: Database,
    current_user: CurrentUser,
) -> TaskResponse:

    task = TaskService.get_task(
        db=db,
        task_id=task_id,
        user_id=current_user.id,
    )

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


# ============================================================
# UPDATE SINGLE OCCURRENCE
# ============================================================

@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Database,
    current_user: CurrentUser,
) -> TaskResponse:

    try:
        task = TaskService.update_task(
            db=db,
            task_id=task_id,
            user_id=current_user.id,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


# ============================================================
# UPDATE ENTIRE RECURRING SERIES
# ============================================================

@router.patch(
    "/series/{task_id}",
    response_model=TaskResponse,
)
def update_task_series(
    task_id: int,
    data: TaskUpdate,
    db: Database,
    current_user: CurrentUser,
) -> TaskResponse:

    try:
        task = TaskService.update_task_series(
            db=db,
            task_id=task_id,
            user_id=current_user.id,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


# ============================================================
# DELETE TASK
# ============================================================

@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: int,
    db: Database,
    current_user: CurrentUser,
) -> None:

    deleted = TaskService.delete_task(
        db=db,
        task_id=task_id,
        user_id=current_user.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )


# ============================================================
# DELETE ENTIRE RECURRING SERIES
# ============================================================

@router.delete(
    "/series/{recurrence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task_series(
    recurrence_id: str,
    db: Database,
    current_user: CurrentUser,
) -> None:

    deleted_count = (
        TaskService.delete_task_series(
            db=db,
            recurrence_id=recurrence_id,
            user_id=current_user.id,
        )
    )

    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task series not found",
        )