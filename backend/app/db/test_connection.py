from sqlalchemy import text

from app.db.session import engine


def test_database_connection() -> None:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        value = result.scalar_one()

        if value != 1:
            raise RuntimeError("Database connection test failed.")


if __name__ == "__main__":
    test_database_connection()
    print("PostgreSQL connection OK")