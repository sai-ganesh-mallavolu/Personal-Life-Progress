from sqlalchemy import inspect, text

from app.db.session import engine


COLUMNS = {
    "recurrence_id": """
        ALTER TABLE daily_tasks
        ADD COLUMN recurrence_id VARCHAR(36)
    """,
    "recurrence_type": """
        ALTER TABLE daily_tasks
        ADD COLUMN recurrence_type VARCHAR(20)
    """,
    "recurrence_end_date": """
        ALTER TABLE daily_tasks
        ADD COLUMN recurrence_end_date DATE
    """,
    "recurrence_days": """
        ALTER TABLE daily_tasks
        ADD COLUMN recurrence_days VARCHAR(20)
    """,
    "recurrence_interval": """
        ALTER TABLE daily_tasks
        ADD COLUMN recurrence_interval INTEGER
    """,
}


def update_task_recurrence() -> None:

    inspector = inspect(engine)

    if "daily_tasks" not in inspector.get_table_names():
        raise RuntimeError(
            "daily_tasks table does not exist.",
        )

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(
            "daily_tasks",
        )
    }

    with engine.begin() as connection:

        # ====================================================
        # ADD MISSING COLUMNS
        # ====================================================

        for column_name, sql in COLUMNS.items():

            if column_name not in existing_columns:
                connection.execute(
                    text(sql),
                )

                print(
                    f"Added column: {column_name}",
                )

            else:
                print(
                    f"Column already exists: {column_name}",
                )

        # ====================================================
        # EXISTING TASKS
        # ====================================================

        connection.execute(
            text(
                """
                UPDATE daily_tasks
                SET recurrence_type = 'NONE'
                WHERE recurrence_type IS NULL
                """
            )
        )

        connection.execute(
            text(
                """
                UPDATE daily_tasks
                SET recurrence_interval = 1
                WHERE recurrence_interval IS NULL
                """
            )
        )

    print(
        "Task recurrence schema updated successfully.",
    )


if __name__ == "__main__":
    update_task_recurrence()