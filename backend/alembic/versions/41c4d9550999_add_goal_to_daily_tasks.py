"""add goals and goal relationship to daily tasks

Revision ID: 41c4d9550999
Revises: 08f180e4356f
Create Date: 2026-08-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "41c4d9550999"
down_revision: Union[str, Sequence[str], None] = "08f180e4356f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create goals table and link daily tasks to goals."""

    # ============================================================
    # CREATE GOALS TABLE
    # ============================================================

    op.create_table(
        "goals",
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
            "title",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "target_value",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "current_value",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "start_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "target_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ============================================================
    # GOALS INDEXES
    # ============================================================

    op.create_index(
        op.f("ix_goals_id"),
        "goals",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_goals_user_id"),
        "goals",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_goals_target_date"),
        "goals",
        ["target_date"],
        unique=False,
    )

    op.create_index(
        op.f("ix_goals_status"),
        "goals",
        ["status"],
        unique=False,
    )

    # ============================================================
    # ADD GOAL TO DAILY TASKS
    # ============================================================

    op.add_column(
        "daily_tasks",
        sa.Column(
            "goal_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_index(
        op.f("ix_daily_tasks_goal_id"),
        "daily_tasks",
        ["goal_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_daily_tasks_goal_id_goals",
        "daily_tasks",
        "goals",
        ["goal_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Remove goal relationship and goals table."""

    # ============================================================
    # REMOVE DAILY TASK → GOAL FOREIGN KEY
    # ============================================================

    op.drop_constraint(
        "fk_daily_tasks_goal_id_goals",
        "daily_tasks",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_daily_tasks_goal_id"),
        table_name="daily_tasks",
    )

    op.drop_column(
        "daily_tasks",
        "goal_id",
    )

    # ============================================================
    # REMOVE GOALS TABLE
    # ============================================================

    op.drop_index(
        op.f("ix_goals_status"),
        table_name="goals",
    )

    op.drop_index(
        op.f("ix_goals_target_date"),
        table_name="goals",
    )

    op.drop_index(
        op.f("ix_goals_user_id"),
        table_name="goals",
    )

    op.drop_index(
        op.f("ix_goals_id"),
        table_name="goals",
    )

    op.drop_table("goals")