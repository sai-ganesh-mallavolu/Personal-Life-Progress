from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.goal import (
    GoalCreate,
    GoalResponse,
    GoalUpdate,
)
from app.services.goal import GoalService


router = APIRouter(
    prefix="/goals",
    tags=["Goals"],
)


CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]

Database = Annotated[
    Session,
    Depends(get_db),
]


@router.post(
    "",
    response_model=GoalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goal(
    data: GoalCreate,
    db: Database,
    current_user: CurrentUser,
) -> GoalResponse:

    try:
        return GoalService.create_goal(
            db=db,
            user_id=current_user.id,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=list[GoalResponse],
)
def get_goals(
    db: Database,
    current_user: CurrentUser,
) -> list[GoalResponse]:

    return GoalService.get_goals(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/{goal_id}",
    response_model=GoalResponse,
)
def get_goal(
    goal_id: int,
    db: Database,
    current_user: CurrentUser,
) -> GoalResponse:

    goal = GoalService.get_goal(
        db=db,
        goal_id=goal_id,
        user_id=current_user.id,
    )

    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return goal


@router.patch(
    "/{goal_id}",
    response_model=GoalResponse,
)
def update_goal(
    goal_id: int,
    data: GoalUpdate,
    db: Database,
    current_user: CurrentUser,
) -> GoalResponse:

    try:
        goal = GoalService.update_goal(
            db=db,
            goal_id=goal_id,
            user_id=current_user.id,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return goal


@router.delete(
    "/{goal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_goal(
    goal_id: int,
    db: Database,
    current_user: CurrentUser,
) -> None:

    deleted = GoalService.delete_goal(
        db=db,
        goal_id=goal_id,
        user_id=current_user.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )