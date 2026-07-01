"""handles friendship management, leaderboards, feeds, and public profiles"""

import logging
from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.social import SocialRepository
from app.repositories.user import UserRepository
from app.repositories.game import GameRepository
from app.services.achievement import AchievementEngine
from app.infra.redis import redis_client
from app.core.exceptions import (
    UserNotFound,
    SelfFriendshipRequest,
    AlreadyFriends,
    FriendRequestAlreadySent,
    FriendRequestNotFound,
    ProfileNotPublic,
)

logger = logging.getLogger(__name__)


class SocialService:
    """orchestrates social features and coordinate with repositories."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SocialRepository(db)
        self.user_repo = UserRepository(db)
        self.game_repo = GameRepository(db)



    async def send_friend_request(self, requester_id: UUID, target_username: str) -> dict:
        """sends a friend request to another user by username."""

        target_user = await self.user_repo.get_by_username(target_username)

        if not target_user:
            raise UserNotFound()

        if target_user.id == requester_id:
            raise SelfFriendshipRequest()

        existing = await self.repo.get_friendship(requester_id, target_user.id)
        if existing:
            if existing.status == "accepted":
                raise AlreadyFriends()

            elif existing.status == "pending":
                # if the requester already sent a friend request to the target
                if existing.requester_id == requester_id:
                    raise FriendRequestAlreadySent()
                # if the target already sent a friend request to the requester
                else:
                    # auto-accept
                    await self.repo.accept_request(existing)
                    await self.db.commit()
                    return {
                        "friendship_id": str(existing.id),
                        "status": "accepted",
                        "message": f"Auto-accepted friend request from {target_username}."
                    }
            elif existing.status == "blocked":
                return {"message": "Request could not be sent."}

        friendship = await self.repo.create_request(requester_id, target_user.id)
        await self.db.commit()

        return {
            "friendship_id": str(friendship.id),
            "status": "pending",
            "message": f"Friend request sent to {target_username}."
        }



    async def respond_to_request(self, user_id: UUID, request_id: UUID, accept: bool) -> dict:
        """accepts or declines a friend request."""
        friendship = await self.repo.get_friendship_by_id(request_id)

        if not friendship or friendship.addressee_id != user_id:
            raise FriendRequestNotFound()

        if friendship.status != "pending":
            return {"message": "Friend request has already been resolved."}

        if accept:
            await self.repo.accept_request(friendship)
            message = "Friend request accepted."
            status = "accepted"
        else:
            await self.repo.remove_friendship(friendship)
            message = "Friend request declined."
            status = "declined"

        await self.db.commit()
        return {"friendship_id": str(request_id), "status": status, "message": message}



    async def remove_friend(self, user_id: UUID, friend_username: str) -> dict:
        """removes an existing friendship."""
        friend_user = await self.user_repo.get_by_username(friend_username)
        
        if not friend_user:
            raise UserNotFound()

        friendship = await self.repo.get_friendship(user_id, friend_user.id)
        if not friendship or friendship.status != "accepted":
            raise FriendRequestNotFound()

        await self.repo.remove_friendship(friendship)
        await self.db.commit()

        return {"message": f"Unfriended {friend_username}."}


    async def get_friends_list(self, user_id: UUID) -> list[dict]:
        """lists all friends for the user."""
        friends = await self.repo.get_friends(user_id)
        all_friends = []

        for u in friends:
            all_friends.append({
                "id": str(u.id),
                "username": u.username,
                "display_name": u.display_name,
                "xp": u.xp,
                "level": u.level,
                "current_streak": u.current_streak,
            })

        return all_friends

    async def get_pending_incoming(self, user_id: UUID) -> list[dict]:
        """lists incoming friend requests."""
        requests = await self.repo.get_pending_incoming(user_id)
        all_requests = []

        for f, u in requests:
            all_requests.append({
                "request_id": str(f.id),
                "sender_id": str(u.id),
                "username": u.username,
                "display_name": u.display_name,
                "created_at": f.created_at.isoformat(),
            })
        
        return all_requests



    async def get_pending_outgoing(self, user_id: UUID) -> list[dict]:
        """lists outgoing sent pending friend requests."""
        requests = await self.repo.get_pending_outgoing(user_id)
        all_requests = []

        for f, u in requests:
            all_requests.append({
                "request_id": str(f.id),
                "addressee_id": str(u.id),
                "username": u.username,
                "display_name": u.display_name,
                "created_at": f.created_at.isoformat(),
            })

        return all_requests



    async def get_social_feed(self, user_id: UUID, limit: int = 30) -> list[dict]:
        """gets feed of completed daily challenges by friends."""
        friends = await self.repo.get_friends(user_id)
        friend_ids = [u.id for u in friends]

        if not friend_ids:
            return []

        feed = await self.repo.get_friends_feed(friend_ids, limit=limit)

        formatted_feed = []

        for g, u in feed:
            formatted_feed.append({
                "username": u.username,
                "display_name": u.display_name,
                "day": g.day.isoformat(),
                "target_word": g.target_word,
                "total_attempts": g.total_attempts,
                "hints_used": g.hints_used_count,
                "completed_at": g.completed_at.isoformat() if g.completed_at else None,
            })

        return formatted_feed







    async def get_daily_leaderboard(self, day: date, limit: int = 50) -> list[dict]:
        """get daily leaderboard, with optional Redis cache lookup/set."""

        cache_key = f"leaderboard:daily:{day.isoformat()}:{limit}"
        cached = await redis_client.get_json(cache_key)

        if cached is not None:
            return cached

        results = await self.repo.get_daily_leaderboard(day, limit=limit)
        formatted = [
            {
                "username": u.username,
                "display_name": u.display_name,
                "total_attempts": g.total_attempts,
                "hints_used": g.hints_used_count,
                "completed_at": g.completed_at.isoformat() if g.completed_at else None,
                "xp_earned": 25,
            }
            for g, u in results
        ]

        await redis_client.set_json(cache_key, formatted, ex=300)  # 5 min cache
        return formatted

    async def get_streak_leaderboard(self, limit: int = 50) -> list[dict]:
        """get streak leaderboard, with optional Redis cache lookup/set."""

        cache_key = f"leaderboard:streak:{limit}"
        cached = await redis_client.get_json(cache_key)

        if cached is not None:
            return cached

        results = await self.repo.get_streak_leaderboard(limit=limit)
        formatted = [
            {
                "username": u.username,
                "display_name": u.display_name,
                "current_streak": u.current_streak,
                "best_streak": u.best_streak,
                "level": u.level,
                "xp": u.xp,
            }
            for u in results
        ]

        await redis_client.set_json(cache_key, formatted, ex=300)  # 5 min cache
        return formatted

    async def get_public_profile(self, username: str) -> dict:
        """view another users public profile, stats and achievements."""

        user = await self.user_repo.get_by_username(username)
        
        if not user:
            raise UserNotFound()

        if not user.is_public:
            raise ProfileNotPublic()

        ach_engine = AchievementEngine(self.db)
        achievements = await ach_engine.get_user_achievements(user.id)

        games, total = await self.game_repo.get_user_history(user.id, limit=999, offset=0)

        completed_games = []
        for g in games:
            if g.won:
                completed_games.append(
                {
                    "day": g.day.isoformat(),
                    "won": g.won,
                    "total_attempts": g.total_attempts,
                    "hints_used": g.hints_used_count,
                    "completed_at": g.completed_at.isoformat() if g.completed_at else None,
                }
            )

        return {
            "username": user.username,
            "display_name": user.display_name,
            "xp": user.xp,
            "level": user.level,
            "current_streak": user.current_streak,
            "best_streak": user.best_streak,
            "total_games": total,
            "completed_games": completed_games,
            "achievements": achievements,
        }
