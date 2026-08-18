from app.db.session import engine
from app.models.focus_session import FocusSession


def create_focus_table() -> None:
    FocusSession.__table__.create(
        bind=engine,
        checkfirst=True,
    )


if __name__ == "__main__":
    create_focus_table()
    print("FocusSession table created/verified successfully.")