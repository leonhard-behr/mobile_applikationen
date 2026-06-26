"""Game service
logic for daily/freeplay games.

Orchestrates the RankingService, GameRepository, and EmbeddingService"""

import asyncio
import hashlib
import logging
import random
from datetime import date
from uuid import UUID

import numpy as np
from scipy.spatial.distance import cosine
from sklearn.decomposition import PCA

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidWordLength
import app.infra.embedding as embedding
from app.repositories.game import GameRepository
from app.services.ranking import (
    ranking_service,
    CachedRankings,
    _compute_similarity,
    scale_similarity,
)
from data.words import get_daily_word, WORD_POOL

logger = logging.getLogger(__name__)

MAX_HINTS = 3
HINT_RANKS = [1000, 500, 100]


class GameService:
    """Orchestrates game workflows against the database."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = GameRepository(db)





    async def start_daily(self, user_id: UUID) -> dict:
        """starts or resumes current days daily game for a user."""
        today = date.today()
        target_word = get_daily_word(today)

        # checking if daily rankings are computed in memory
        cr = await ranking_service.ensure_rankings(target_word)

        # checking for daily word in database
        daily_row = await self.repo.get_daily_word(today)
        if daily_row is None:
            daily_row = await self.repo.upsert_daily_word(
                day=today,
                word=target_word,
                anchor_word=cr.anchor_word,
                anchor_similarity=cr.anchor_similarity,
                anchor_rank=cr.anchor_rank,
            )

        # checking for daily game session for the user
        session = await self.repo.get_daily_session(user_id, today)
        is_new = session is None
        if is_new:
            session = await self.repo.create_session(
                user_id=user_id,
                day=today,
                target_word=target_word,
                game_type="daily",
            )
            await self.db.commit()

        result = {
            "anchor_word": cr.anchor_word,
            "anchor_similarity": cr.anchor_similarity,
            "anchor_rank": cr.anchor_rank,
            "today": today.isoformat(),
            "total_ranked": len(cr.rankings),
            "letters": self._get_letters(target_word, session.total_attempts),
            "word_length": len(target_word),
            "session_id": str(session.id),
            "won": session.won,
            "hints_used": session.hints_used_count,
            "penalty_attempts": session.penalty_attempts,
        }

        if not is_new:
            guesses = await self.repo.get_guesses(session.id)
            hints = await self.repo.get_hints(session.id)
            result["guesses"] = [
                {
                    "word": g.word,
                    "similarity": g.raw_similarity,
                    "scaled_similarity": g.scaled_similarity,
                    "rank": g.rank,
                    "is_correct": g.is_correct,
                }
                for g in guesses
            ]
            result["hints"] = [
                {
                    "hint_number": h.hint_number,
                    "rank": h.hint_rank,
                    "word": h.hint_word,
                }
                for h in hints
            ]

        return result






    async def submit_guess(self, user_id: UUID, word: str, session_id: UUID | None = None, attempts: int = 0) -> dict:
        """processes a guess in the daily game:
            1. resolves daily game session
            2. computes embedding + similarity + rank
            3. persists the guess
            4. if correct, marks session as won
        """
        word = word.strip().lower()
        if not word:
            from app.core.exceptions import EmptyGuess
            raise EmptyGuess()

        # resolves
        session = await self._resolve_session(user_id, session_id)

        if session.won:
            from app.core.exceptions import GameAlreadyCompleted
            raise GameAlreadyCompleted()

        
        if await self.repo.guess_exists(session.id, word): # checks for duplicate
            from app.core.exceptions import DuplicateGuess
            raise DuplicateGuess(word)

        
        cr = await ranking_service.ensure_rankings(session.target_word)     # gets rankings for this target

        
        vec = await asyncio.to_thread(embedding.get_embedding, word)        # gets embedding
        raw_sim = _compute_similarity(vec, cr.target_vector)                # computes similarity
        is_correct = word == session.target_word

        # gets rank
        if is_correct:
            display_rank = 0
            rank_for_db = 0
        else:
            rank_for_db = ranking_service.compute_rank_for_guess(cr, word, raw_sim)
            display_rank = rank_for_db


        scaled = scale_similarity(raw_sim, cr.anchor_similarity, cr.max_similarity)

        existing_guesses = await self.repo.get_guesses(session.id)
        guess_number = len(existing_guesses) + 1

        # persists guess 
        await self.repo.add_guess(
            session_id=session.id,
            guess_number=guess_number,
            word=word,
            raw_similarity=raw_sim,
            scaled_similarity=scaled,
            rank=rank_for_db,
            is_correct=is_correct,
        )

        await self.repo.increment_attempts(session) # session update

        win_data = None
        if is_correct:
            await self.repo.mark_won(session)
            await self.db.commit()

            # streak, XP, achievements
            from app.services.achievement import AchievementEngine
            engine = AchievementEngine(self.db)
            win_data = await engine.process_win(
                user_id=user_id,
                total_attempts=session.total_attempts,
                hints_used=session.hints_used_count,
            )
        else:
            await self.db.commit()


        letter_attempts = max(attempts, session.total_attempts)

        logger.info(f"Guess: '{word}' | Rank: {display_rank} | Sim: {scaled}% | Correct: {is_correct} | User: {user_id}")

        result = {
            "word": word,
            "similarity": raw_sim,
            "scaled_similarity": scaled,
            "rank": display_rank,
            "total_ranked": len(cr.rankings),
            "is_correct": is_correct,
            "letters": self._get_letters(session.target_word, letter_attempts),
            "word_length": len(session.target_word),
        }

        if win_data:
            result["win_data"] = win_data

        return result






    async def request_hint(self, user_id: UUID, hint_number: int, current_best_rank: int | None = None, session_id: UUID | None = None) -> dict:
        """requests a hint:
            1. resolves session
            2. checks hint limit
            3. ensures rankings
            4. computes adaptive rank
            5. persists hint
        """
        
        session = await self._resolve_session(user_id, session_id)

        if hint_number < 1 or hint_number > MAX_HINTS:
            from app.core.exceptions import HintLimitReached
            raise HintLimitReached(MAX_HINTS)

        cr = await ranking_service.ensure_rankings(session.target_word)

        # adaptive rank selection
        if current_best_rank is not None and current_best_rank > 2:
            target_rank = max(2, current_best_rank // 2)
        else:
            target_rank = HINT_RANKS[hint_number - 1]

        idx = min(target_rank - 1, len(cr.rankings) - 1)
        hint_word, _ = cr.rankings[idx]



        # persists hint
        await self.repo.add_hint(
            session_id=session.id,
            hint_number=hint_number,
            hint_word=hint_word,
            hint_rank=idx + 1,
        )
        await self.repo.increment_hints(session)
        await self.db.commit()

        return {
            "hint_number": hint_number,
            "rank": idx + 1,
            "word": hint_word,
        }





    async def get_letters(self, user_id: UUID, attempts: int, session_id: UUID | None = None) -> dict:
        """gets revealed letters in word for display
            1. resolves session
            2. gets letters based on attempts
            3. returns letters with length
        """
        
        session = await self._resolve_session(user_id, session_id)
        letters = self._get_letters(session.target_word, attempts)
        return {
            "letters": letters,
            "length": len(session.target_word),
        }










    async def get_victory_coordinates(self, words: list[str]) -> dict:
        """ computes 2d coordinates of words using pca"""
        words = [w.strip().lower() for w in words]

        if len(words) < 2:
            raise InvalidWordLength("At least 2 words required for PCA.")

        # gets embeddings for all words
        word_vecs = await asyncio.to_thread(embedding.get_embeddings_batch, words)
        vectors = np.array([word_vecs[w] for w in words])

        # reduce to 2d
        n_components = min(2, len(words), vectors.shape[1])
        pca = PCA(n_components=n_components)
        coords_2d = pca.fit_transform(vectors)

        coordinates = []
        for i, word in enumerate(words):
            coordinates.append({
                "word": word,
                "x": round(float(coords_2d[i][0]), 4),
                "y": round(float(coords_2d[i][1]), 4) if n_components == 2 else 0.0,
            })

        return {"coordinates": coordinates}





    async def start_new_game(self, user_id: UUID) -> dict:
        """starts a new freeplay game with a random word
            1. selects random word
            2. ensures rankings
            3. creates session
            4. returns game data
        """
        new_word = random.choice(WORD_POOL)
        today = date.today()

        cr = await ranking_service.ensure_rankings(new_word)

        session = await self.repo.create_session(
            user_id=user_id,
            day=today,
            target_word=new_word,
            game_type="freeplay",
        )
        await self.db.commit()

        logger.info(f"New freeplay game: user={user_id}, word_hash={hashlib.sha256(new_word.encode()).hexdigest()[:8]}, anchor='{cr.anchor_word}' ({cr.anchor_similarity:.1f}%)")

        return {
            "anchor_word": cr.anchor_word,
            "anchor_similarity": cr.anchor_similarity,
            "anchor_rank": cr.anchor_rank,
            "today": today.isoformat(),
            "game_id": str(session.id),
            "total_ranked": len(cr.rankings),
            "letters": self._get_letters(new_word, 0),
            "word_length": len(new_word),
        }





    async def get_history(self, user_id: UUID, limit: int = 50, offset: int = 0) -> dict:
        games, total = await self.repo.get_user_history(user_id, limit, offset)
        return {
            "games": [
                {
                    "day": g.day.isoformat(),
                    "won": g.won,
                    "total_attempts": g.total_attempts,
                    "hints_used": g.hints_used_count,
                    "target_word": g.target_word if g.won else None,
                    "completed_at": g.completed_at,
                }
                for g in games
            ],
            "total": total,
        }





    async def _resolve_session(self, user_id: UUID, session_id: UUID | None) -> "GameSession":
        """resolve session by id or default to today's daily session"""
        from app.models.game import GameSession as GameSessionModel
        from app.core.exceptions import GameSessionNotFound

        if session_id:
            session = await self.repo.get_session_by_id(session_id)
            if session is None or session.user_id != user_id:
                raise GameSessionNotFound()
            return session

        # default to todays daily session
        session = await self.repo.get_daily_session(user_id, date.today())
        if session is None:
            raise GameSessionNotFound()
        return session




    @staticmethod
    def _get_letters(target_word: str, attempts: int) -> list[str]:
        """reveal one letter for every 3 attempts"""
        revealed_count = min(attempts // 3, len(target_word))
        return [
            char if i < revealed_count else ""
            for i, char in enumerate(target_word)
        ]
