"""Achievement engine: evaluates and awards achievements after game events.
Achievement definitions are stored in ACHIEVEMENT_DEFS.
"""

import logging
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import GameSession
from app.models.social import Achievement
from app.models.user import User
from app.repositories.user import UserRepository

logger = logging.getLogger(__name__)

# TODO: ADD NEW ACHIEVEMENTS
# - FIRST FRIEND REQUEST
# - 10 FRIEND REQUESTS

ACHIEVEMENT_DEFS: list[dict] = [
    {
        "key": "first_win",
        "name": "First Steps",
        "description": "Win your first game",
        "xp": 50,
    },
    {
        "key": "streak_3",
        "name": "Hat Trick",
        "description": "Win 3 days in a row",
        "xp": 100,
    },
    {
        "key": "streak_7",
        "name": "Week Warrior",
        "description": "Win 7 days in a row",
        "xp": 250,
    },
    {
        "key": "streak_14",
        "name": "Fortnight Focus",
        "description": "Win 14 days in a row",
        "xp": 500,
    },
    {
        "key": "streak_30",
        "name": "Monthly Master",
        "description": "Win 30 days in a row",
        "xp": 1000,
    },
    {
        "key": "under_3",
        "name": "Sharp Mind",
        "description": "Win a game in 3 or fewer guesses",
        "xp": 150,
    },
    {
        "key": "under_5",
        "name": "Quick Thinker",
        "description": "Win a game in 5 or fewer guesses",
        "xp": 75,
    },
    {
        "key": "no_hints",
        "name": "Solo Explorer",
        "description": "Win a game without using any hints",
        "xp": 100,
    },
    {
        "key": "games_10",
        "name": "Warming Up",
        "description": "Play 10 games",
        "xp": 100,
    },
    {
        "key": "games_50",
        "name": "Dedicated Player",
        "description": "Play 50 games",
        "xp": 300,
    },
    {
        "key": "games_100",
        "name": "Century Club",
        "description": "Play 100 games",
        "xp": 500,
    },
    {
        "key": "perfect_3",
        "name": "Triple Perfection",
        "description": "Get 3 perfect games (<=3 guesses)",
        "xp": 200,
    },
    {
        "key": "perfect_10",
        "name": "Precision Expert",
        "description": "Get 10 perfect games (<=3 guesses)",
        "xp": 500,
    },
]


XP_BASE_WIN = 25             # base XP for any win
XP_SPEED_BONUS_MAX = 50      # bonus XP for fast wins (<=3 guesses)
XP_NO_HINT_BONUS = 15        # bonus XP for no hints used
XP_STREAK_MULTIPLIER = 5     # bonus XP per day of streak


class AchievementEngine:
    """Evaluates and awards achievements and XP after game events"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def process_win(self, user_id: UUID, total_attempts: int, hints_used: int) -> dict:
        """called after a game is won
            - streak update
            - xp calculation and award
            - achievement evaluation
        returns a summary dict with XP earned and achievements unlocked"""

        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            return {"xp_earned": 0, "achievements": []}

        # update streak
        new_streak = await self._compute_streak(user_id)
        best_streak = max(user.best_streak, new_streak)
        await self.user_repo.update_streak(user, new_streak, best_streak)

        # calculate XP
        xp = XP_BASE_WIN
        
        # speed bonus (linear: 50 XP at 1 guess, 0 at 10+)
        if total_attempts <= 10:
            xp += max(0, int(XP_SPEED_BONUS_MAX * (1 - (total_attempts - 1) / 9)))
        
        # no-hint bonus
        if hints_used == 0:
            xp += XP_NO_HINT_BONUS
            
        # streak multiplier
        xp += new_streak * XP_STREAK_MULTIPLIER

        # evaluate achievements
        newly_earned = await self._evaluate_achievements(
            user_id, total_attempts, hints_used, new_streak
        )

        # add achievement XP
        achievement_xp = sum(a["xp_reward"] for a in newly_earned)
        total_xp = xp + achievement_xp

        # award XP
        await self.user_repo.add_xp(user, total_xp)
        await self.db.commit()

        logger.info(
            f"Win processed: user={user_id}, streak={new_streak}, "
            f"xp={total_xp} (base={xp}, achievements={achievement_xp}), "
            f"new_achievements={[a['key'] for a in newly_earned]}"
        )

        return {
            "xp_earned": total_xp,
            "new_level": user.level,
            "current_streak": new_streak,
            "best_streak": best_streak,
            "achievements": newly_earned,
        }



    async def get_user_achievements(self, user_id: UUID) -> list[dict]:
        """gets all achievements earned by a user"""

        result = await self.db.execute(
            select(Achievement)
            .where(Achievement.user_id == user_id)
            .order_by(Achievement.earned_at.desc())
        )
        achievements = result.scalars().all()
        
        result = []
        for a in achievements:
            result.append({
                "key": a.achievement_key,
                "name": a.achievement_name,
                "description": a.description,
                "xp_reward": a.xp_reward,
                "earned_at": a.earned_at.isoformat() if a.earned_at else None,
            })

        return result




    async def get_all_definitions(self, user_id: UUID) -> list[dict]:
        """returns all achievement definitions with earned status"""
        
        earned_keys = set()
        result = await self.db.execute(
            select(Achievement.achievement_key)
            .where(Achievement.user_id == user_id)
        )
        for row in result.scalars():
            earned_keys.add(row)

        result = []
        for d in ACHIEVEMENT_DEFS:
            result.append({
                "key": d["key"],
                "name": d["name"],
                "description": d["description"],
                "xp_reward": d["xp"],
                "earned": d["key"] in earned_keys,
            })

        return result



    async def _compute_streak(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(GameSession.day)
            .where(
                GameSession.user_id == user_id,
                GameSession.game_type == "daily",
                GameSession.won == True,
            )
            .order_by(GameSession.day.desc())
        )
        won_days = [row for row in result.scalars()]

        if not won_days:
            return 0

        today = date.today()
        streak = 0
        expected = today

        for day in won_days:
            if day == expected:
                streak += 1
                expected = date.fromordinal(expected.toordinal() - 1)
            elif day < expected:
                break

        return streak



    async def _evaluate_achievements(self,user_id: UUID,total_attempts: int,hints_used: int,current_streak: int,) -> list[dict]:
        
        result = await self.db.execute(
            select(Achievement.achievement_key)
            .where(Achievement.user_id == user_id)
        )
        earned_keys = {row for row in result.scalars()}

        total_wins = await self._count_wins(user_id)
        perfect_games = await self._count_perfect_games(user_id)

        newly_earned: list[dict] = []

        for defn in ACHIEVEMENT_DEFS:
            if defn["key"] in earned_keys:
                continue

            earned = False
            key = defn["key"]

            if key == "first_win":
                earned = total_wins >= 1
            elif key == "streak_3":
                earned = current_streak >= 3
            elif key == "streak_7":
                earned = current_streak >= 7
            elif key == "streak_14":
                earned = current_streak >= 14
            elif key == "streak_30":
                earned = current_streak >= 30
            elif key == "under_3":
                earned = total_attempts <= 3
            elif key == "under_5":
                earned = total_attempts <= 5
            elif key == "no_hints":
                earned = hints_used == 0
            elif key == "games_10":
                earned = total_wins >= 10
            elif key == "games_50":
                earned = total_wins >= 50
            elif key == "games_100":
                earned = total_wins >= 100
            elif key == "perfect_3":
                earned = perfect_games >= 3
            elif key == "perfect_10":
                earned = perfect_games >= 10

            if earned:
                achievement = Achievement(
                    user_id=user_id,
                    achievement_key=key,
                    achievement_name=defn["name"],
                    description=defn["description"],
                    xp_reward=defn["xp"],
                )

                self.db.add(achievement)
                newly_earned.append({
                    "key": key,
                    "name": defn["name"],
                    "description": defn["description"],
                    "xp_reward": defn["xp"],
                })
                logger.info(f"Achievement unlocked: '{key}' for user={user_id}")

        if newly_earned:
            await self.db.flush()

        return newly_earned


    async def _count_wins(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                GameSession.user_id == user_id,
                GameSession.won == True,
            )
        )
        return result.scalar() or 0



    async def _count_perfect_games(self, user_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                GameSession.user_id == user_id,
                GameSession.won == True,
                GameSession.total_attempts <= 3,
            )
        )
        return result.scalar() or 0
