from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import RegisterRequest


class AuthService:

    @staticmethod
    def register(
        db: Session,
        data: RegisterRequest,
    ) -> User:

        existing_user = UserRepository.get_by_email(
            db,
            data.email,
        )

        if existing_user:
            raise ValueError(
                "Email is already registered"
            )

        password_hash = hash_password(
            data.password,
        )

        user = UserRepository.create(
            db=db,
            name=data.name,
            email=data.email,
            password_hash=password_hash,
        )

        return user

    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str,
    ) -> str:

        user = UserRepository.get_by_email(
            db,
            email,
        )

        if not user:
            raise ValueError(
                "Invalid email or password"
            )

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise ValueError(
                "Invalid email or password"
            )

        if not user.is_active:
            raise ValueError(
                "User account is inactive"
            )

        return create_access_token(user.id)

    @staticmethod
    def delete_account(
        db: Session,
        user: User,
        password: str,
    ) -> None:

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise ValueError(
                "Invalid password"
            )

        UserRepository.delete(
            db,
            user,
        )