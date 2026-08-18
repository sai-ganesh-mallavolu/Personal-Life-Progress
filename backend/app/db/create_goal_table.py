from app.db.session import engine
from app.models.goal import Goal


def create_goal_table() -> None:
    Goal.__table__.create(
        bind=engine,
        checkfirst=True,
    )


if __name__ == "__main__":
    create_goal_table()

    print(
        "Goal table created/verified successfully."
    )