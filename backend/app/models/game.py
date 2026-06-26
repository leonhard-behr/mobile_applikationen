"""Game models:
DailyWord, GameSession, Guess, HintUsed"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    String, Integer, Float, Boolean, Date, ForeignKey, Index,
    UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class DailyWord(Base):
    """Pre-computed daily word with its anchor and metadata. One row per calendar day, seeded at startup or by cron."""

    __tablename__ = "daily_words"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    word: Mapped[str] = mapped_column(String(100), nullable=False)
    anchor_word: Mapped[str] = mapped_column(String(100), nullable=False)
    anchor_similarity: Mapped[float] = mapped_column(Float, nullable=False)
    anchor_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)


    def __repr__(self) -> str:
        return f"<DailyWord {self.day}: '{self.word}'>"


class GameSession(TimestampMixin, Base):
    """A single game played by a user (DAILY or FREEPLAY). Each user has a maximum of ONE DAILY session per day."""

    __tablename__ = "game_sessions"

    __table_args__ = (
        UniqueConstraint("user_id", "day", "game_type", name="uq_user_daily_game"),
        Index("ix_game_sessions_day_won", "day", "won"),
    )


    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    day: Mapped[date] = mapped_column(Date, index=True, nullable=False)


    game_type: Mapped[str] = mapped_column(
        String(20), default="daily", nullable=False,
        comment="daily | freeplay"
    )


    target_word: Mapped[str] = mapped_column(String(100), nullable=False)
    won: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hints_used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    penalty_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


    user: Mapped["User"] = relationship(back_populates="game_sessions")
    guesses: Mapped[list["Guess"]] = relationship(
        back_populates="session",
        order_by="Guess.guess_number",
        cascade="all, delete-orphan",
    )
    hints: Mapped[list["HintUsed"]] = relationship(
        back_populates="session",
        order_by="HintUsed.hint_number",
        cascade="all, delete-orphan",
    )


    def __repr__(self) -> str:
        return f"<GameSession {self.id} user={self.user_id} day={self.day} won={self.won}>"


class Guess(Base):
    """Individual guess within a game session.Unique on (session_id, word) to support retries."""

    __tablename__ = "guesses"
    __table_args__ = (UniqueConstraint("session_id", "word", name="uq_guess_session_word"))

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"),
        index=True, nullable=False,
    )

    guess_number: Mapped[int] = mapped_column(Integer, nullable=False)
    word: Mapped[str] = mapped_column(String(200), nullable=False)
    raw_similarity: Mapped[float] = mapped_column(Float, nullable=False)
    scaled_similarity: Mapped[float] = mapped_column(Float, nullable=False)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    guessed_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    session: Mapped["GameSession"] = relationship(back_populates="guesses")


    def __repr__(self) -> str:
        return f"<Guess '{self.word}' rank={self.rank} correct={self.is_correct}>"



class HintUsed(Base):
    """Record of a hint consumed within a game session."""

    __tablename__ = "hints_used"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True, nullable=False)

    hint_number: Mapped[int] = mapped_column(Integer, nullable=False)
    hint_word: Mapped[str] = mapped_column(String(200), nullable=False)
    hint_rank: Mapped[int] = mapped_column(Integer, nullable=False)
    used_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    session: Mapped["GameSession"] = relationship(back_populates="hints")

    def __repr__(self) -> str:
        return f"<HintUsed #{self.hint_number} '{self.hint_word}' rank={self.hint_rank}>"
