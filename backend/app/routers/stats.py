"""Stats router
 /api/stats/* endpoints

Provides user profile stats, game history, achievement data
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.game import GameService
from app.services.achievement import AchievementEngine

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/profile")
async def get_profile_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),):
    """returns the authenticated user's profile stats (XP, level, streaks, total games, win rate)"""

    engine = AchievementEngine(db)                                                  # achievement engine instance
    svc = GameService(db)                                                           # game history service instance
    history_data = await svc.get_history(user.id, limit=9999, offset=0)             # get all game history for the user

    # calc stats
    total_games = history_data["total"]
    won_games = sum(1 for g in history_data["games"] if g["won"])
    perfect_games = sum(1 for g in history_data["games"] if g["won"] and g["total_attempts"] <= 3)

    # avg attempts
    avg_attempts = 0
    if won_games > 0:
        avg_attempts = round(sum(g["total_attempts"] for g in history_data["games"] if g["won"]) / won_games)

    return {
        "username": user.username,
        "display_name": user.display_name,
        "xp": user.xp,
        "level": user.level,
        "current_streak": user.current_streak,
        "best_streak": user.best_streak,
        "total_games": total_games,
        "won_games": won_games,
        "perfect_games": perfect_games,
        "avg_attempts": avg_attempts,
    }



@router.get("/journey")
async def get_journey(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db), limit: int = Query(30, ge=1, le=100),):
    """returns game history formatted for the journey view. Includes status of the current day (completed, in-progress, upcoming)"""
    
    svc = GameService(db)                                                   # game history service instance
    history_data = await svc.get_history(user.id, limit=limit, offset=0)    # get all game history for the user

    # calc journey stations
    from datetime import date, timedelta

    today = date.today()
    games_by_day = {g["day"]: g for g in history_data["games"]}

    stations = []

    # building journey stations
    for i in range(limit):

        d = today - timedelta(days=limit - 1 - i)
        day_str = d.isoformat()
        game = games_by_day.get(day_str)

        is_today = d == today

        if game and game["won"]:
            stations.append({
                "id": i + 1,
                "date": day_str,
                "date_label": _format_date_label(d),
                "status": "completed",
                "attempts": game["total_attempts"],
                "word": game["target_word"],
                "hints_used": game["hints_used"],
            })

        elif is_today:
            stations.append({
                "id": i + 1,
                "date": day_str,
                "date_label": _format_date_label(d),
                "status": "today",
                "attempts": game["total_attempts"] if game else 0,
                "word": None,
                "hints_used": 0,
            })

        else:
            stations.append({
                "id": i + 1,
                "date": day_str,
                "date_label": _format_date_label(d),
                "status": "missed" if d < today else "locked",
                "attempts": None,
                "word": None,
                "hints_used": 0,
            })

    return {"stations": stations}


@router.get("/achievements")
async def get_achievements(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),):
    """returns all achievement definitions with earned status"""
    
    engine = AchievementEngine(db)
    definitions = await engine.get_all_definitions(user.id)
    earned = await engine.get_user_achievements(user.id)

    return {
        "definitions": definitions,
        "earned": earned,
        "total_earned": len(earned),
        "total_available": len(definitions),
    }


def _format_date_label(d) -> str:
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return f"{months[d.month - 1]} {d.day}"
