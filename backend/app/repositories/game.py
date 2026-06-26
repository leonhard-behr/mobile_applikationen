"""Game repository
Database CRUD for game sessions, guesses, hints, daily words.
"""

import uuid as uuid_mod
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.game import DailyWord, GameSession, Guess, HintUsed


class GameRepository:
    """Database access for game domain entities."""

    def __init__(self, db: AsyncSession):
        self.db = db


    async def get_daily_word(self, day: date) -> DailyWord | None:
        result = await self.db.execute(
            select(DailyWord).where(DailyWord.day == day)
        )
        return result.scalar_one_or_none()



    async def upsert_daily_word(self, day: date, word: str, anchor_word: str, anchor_similarity: float, anchor_rank: int | None) -> DailyWord:
        """inserts or updates daily word entry"""
        stmt = pg_insert(DailyWord).values(
            day=day,
            word=word,
            anchor_word=anchor_word,
            anchor_similarity=anchor_similarity,
            anchor_rank=anchor_rank,
        ).on_conflict_do_update(
            index_elements=["day"],
            set_={
                "word": word,
                "anchor_word": anchor_word,
                "anchor_similarity": anchor_similarity,
                "anchor_rank": anchor_rank,
            },
        ).returning(DailyWord)

        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.scalar_one()



    async def get_daily_session(self, user_id: UUID, day: date) -> GameSession | None:
        """finds users daily session for a given date."""
        result = await self.db.execute(
            select(GameSession).where(
                GameSession.user_id == user_id,
                GameSession.day == day,
                GameSession.game_type == "daily",
            )
        )
        return result.scalar_one_or_none()



    async def get_session_by_id(self, session_id: UUID) -> GameSession | None:
        result = await self.db.execute(
            select(GameSession).where(GameSession.id == session_id)
        )
        return result.scalar_one_or_none()



    async def create_session(self, user_id: UUID, day: date, target_word: str, game_type: str = "daily") -> GameSession:
        session = GameSession(
            user_id=user_id,
            day=day,
            target_word=target_word,
            game_type=game_type,
        )

        self.db.add(session)
        await self.db.flush()
        return session




    async def mark_won(self, session: GameSession) -> None:
        session.won = True
        session.completed_at = datetime.utcnow()
        await self.db.flush()




    async def increment_attempts(self, session: GameSession) -> None:
        session.total_attempts += 1
        await self.db.flush()




    async def increment_hints(self, session: GameSession) -> None:
        session.hints_used_count += 1
        session.penalty_attempts += 1
        await self.db.flush()




    async def get_user_history(self, user_id: UUID, limit: int = 50, offset: int = 0) -> tuple[list[GameSession], int]:
        """returns limited game history for user"""
        count_result = await self.db.execute(
            select(func.count()).where(
                GameSession.user_id == user_id,
                GameSession.game_type == "daily",
            )
        )
        total = count_result.scalar() or 0

        result = await self.db.execute(
            select(GameSession)
            .where(
                GameSession.user_id == user_id,
                GameSession.game_type == "daily",
            )
            .order_by(GameSession.day.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total




    async def get_guesses(self, session_id: UUID) -> list[Guess]:
        result = await self.db.execute(
            select(Guess)
            .where(Guess.session_id == session_id)
            .order_by(Guess.guess_number)
        )
        return list(result.scalars().all())



    async def add_guess(self, session_id: UUID, guess_number: int, word: str, raw_similarity: float, scaled_similarity: float, rank: int | None, is_correct: bool) -> Guess | None:
        """inserts a guess. returns None if guess already exists"""
        stmt = pg_insert(Guess).values(
            id=uuid_mod.uuid4(),
            session_id=session_id,
            guess_number=guess_number,
            word=word,
            raw_similarity=raw_similarity,
            scaled_similarity=scaled_similarity,
            rank=rank,
            is_correct=is_correct,
        ).on_conflict_do_nothing(
            constraint="uq_guess_session_word"
        ).returning(Guess)

        result = await self.db.execute(stmt)
        await self.db.flush()
        row = result.scalar_one_or_none()
        return row




    async def guess_exists(self, session_id: UUID, word: str) -> bool:
        result = await self.db.execute(
            select(Guess.id).where(
                Guess.session_id == session_id,
                Guess.word == word,
            )
        )
        return result.scalar_one_or_none() is not None




    async def get_hints(self, session_id: UUID) -> list[HintUsed]:
        result = await self.db.execute(
            select(HintUsed)
            .where(HintUsed.session_id == session_id)
            .order_by(HintUsed.hint_number)
        )
        return list(result.scalars().all())



    async def add_hint(self, session_id: UUID, hint_number: int, hint_word: str, hint_rank: int) -> HintUsed:
        hint = HintUsed(
            session_id=session_id,
            hint_number=hint_number,
            hint_word=hint_word,
            hint_rank=hint_rank,
        )
        self.db.add(hint)
        await self.db.flush()
        return hint
