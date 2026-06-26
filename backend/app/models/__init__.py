"""Re-exporting all ORM models so Alembic and other modules can import from app.models directly. Importing this package is enough to register every table with the SQLAlchemy metadata."""

from app.models.base import Base, TimestampMixin
from app.models.user import User
from app.models.game import DailyWord, GameSession, Guess, HintUsed
from app.models.social import Achievement, Friendship

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "DailyWord",
    "GameSession",
    "Guess",
    "HintUsed",
    "Achievement",
    "Friendship",
]
