"""add task recurrence and focus sessions

Revision ID: a7c91e2f4b11
Revises: 41c4d9550999
Create Date: 2026-08-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7c91e2f4b11"
down_revision: Union[str, Sequence[str], None] = "41c4d9550999"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add task recurrence fields and create focus sessions."""

    # ============================================================
    # DAILY TASK RECURRENCE
    # ============================================================

    op.add_column(
        "daily_tasks",
        sa.Column(
            "recurrence_id",
            sa.String(length=36),
            nullable=True,
        ),
    )

    op.add_column(
        "daily_tasks",
        sa.Column(
            "recurrence_type",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "daily_tasks",
        sa.Column(
            "recurrence_end_date",
            sa.Date(),
            nullable=True,
        ),
    )

    op.add_column(
        "daily_tasks",
        sa.Column(
            "recurrence_days",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "daily_tasks",
        sa.Column(
            "recurrence_interval",
            sa.Integer(),
            nullable=True,
        ),
    )

    # ============================================================
    # EXISTING TASK DEFAULT VALUES
    # ============================================================

    op.execute(
        """
        UPDATE daily_tasks
        SET recurrence_type = 'NONE'
        WHERE recurrence_type IS NULL
        """
    )

    op.execute(
        """
        UPDATE daily_tasks
        SET recurrence_interval = 1
        WHERE recurrence_interval IS NULL
        """
    )

    # ============================================================
    # MAKE REQUIRED COLUMNS NON-NULL
    # ============================================================

    op.alter_column(
        "daily_tasks",
        "recurrence_type",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="NONE",
    )

    op.alter_column(
        "daily_tasks",
        "recurrence_interval",
        existing_type=sa.Integer(),
        nullable=False,
        server_default="1",
    )

    # ============================================================
    # INDEXES
    # ============================================================

    op.create_index(
        op.f("ix_daily_tasks_recurrence_id"),
        "daily_tasks",
        ["recurrence_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_daily_tasks_recurrence_type"),
        "daily_tasks",
        ["recurrence_type"],
        unique=False,
    )

    # ============================================================
    # FOCUS SESSIONS
    # ============================================================

    op.create_table(
        "focus_sessions",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "task_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "ended_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "duration_minutes",
            sa.Integer(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["task_id"],
            ["daily_tasks.id"],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    # ============================================================
    # FOCUS SESSION INDEXES
    # ============================================================

    op.create_index(
        op.f("ix_focus_sessions_id"),
        "focus_sessions",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_focus_sessions_user_id"),
        "focus_sessions",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_focus_sessions_task_id"),
        "focus_sessions",
        ["task_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove task recurrence fields and focus sessions."""

    # ============================================================
    # FOCUS SESSIONS
    # ============================================================

    op.drop_index(
        op.f("ix_focus_sessions_task_id"),
        table_name="focus_sessions",
    )

    op.drop_index(
        op.f("ix_focus_sessions_user_id"),
        table_name="focus_sessions",
    )

    op.drop_index(
        op.f("ix_focus_sessions_id"),
        table_name="focus_sessions",
    )

    op.drop_table("focus_sessions")

    # ============================================================
    # DAILY TASK RECURRENCE
    # ============================================================

    op.drop_index(
        op.f("ix_daily_tasks_recurrence_type"),
        table_name="daily_tasks",
    )

    op.drop_index(
        op.f("ix_daily_tasks_recurrence_id"),
        table_name="daily_tasks",
    )

    op.drop_column(
        "daily_tasks",
        "recurrence_interval",
    )

    op.drop_column(
        "daily_tasks",
        "recurrence_days",
    )

    op.drop_column(
        "daily_tasks",
        "recurrence_end_date",
    )

    op.drop_column(
        "daily_tasks",
        "recurrence_type",
    )

    op.drop_column(
        "daily_tasks",
        "recurrence_id",
    )