# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# The engine manages the pool of connections to PostgreSQL.
engine = create_engine(settings.database_url, pool_pre_ping=True)

# A session is one "conversation" with the database (one per request).
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """All table classes inherit from this so SQLAlchemy can track them."""


def get_db():
    """FastAPI dependency: open a session, hand it to the endpoint, then close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()