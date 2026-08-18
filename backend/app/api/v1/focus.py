from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.focus_session import FocusSession
from app.models.user import User
from app.schemas.focus_session import (
    FocusSessionCreate,
    FocusSessionResponse,
    FocusTimeResponse,
)
from app.services.focus_session import FocusSessionService


router = APIRouter(
    prefix="/focus",
    tags=["Focus"],
)


@router.post(
    "/sessions",
    response_model=FocusSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_focus_session(
    data: FocusSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusSession:

    try:
        return FocusSessionService.create_session(
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
    "/sessions",
    response_model=list[FocusSessionResponse],
)
def get_focus_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FocusSession]:

    return FocusSessionService.get_sessions(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=FocusSessionResponse,
)
def get_focus_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusSession:

    session = FocusSessionService.get_session(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Focus session not found.",
        )

    return session


@router.get(
    "/today",
    response_model=FocusTimeResponse,
)
def get_today_focus_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusTimeResponse:

    return FocusSessionService.get_today_focus_time(
        db=db,
        user_id=current_user.id,
        target_date=date.today(),
    )