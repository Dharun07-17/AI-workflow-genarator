from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


class DatabaseManager:
    _instance: "DatabaseManager | None" = None

    def __new__(cls) -> "DatabaseManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.engine = create_engine(settings.database_url, pool_pre_ping=True)
            cls._instance.session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=cls._instance.engine,
                expire_on_commit=False,
            )
        return cls._instance

    def get_session(self) -> Session:
        return self.session_factory()


db_manager = DatabaseManager()


def get_db() -> Generator[Session, None, None]:
    db = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()
