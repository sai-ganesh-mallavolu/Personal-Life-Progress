"""add goal to daily tasks

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
    """Add optional goal relationship to daily tasks."""

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
    """Remove goal relationship from daily tasks."""

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
