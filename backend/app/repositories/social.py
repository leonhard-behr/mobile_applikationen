"""database access for friendships, leaderboards, and social feeds."""

from uuid import UUID
from datetime import date
from sqlalchemy import select, or_, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.social import Friendship
from app.models.user import User
from app.models.game import GameSession


class SocialRepository:
    """Handles database operations for friendships and social query views."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_friendship(self, user_a_id: UUID, user_b_id: UUID) -> Friendship | None:
        """finds any friendship record between two users in both directions"""
        
        stmt = select(Friendship).where(
            or_(
                and_(Friendship.requester_id == user_a_id, Friendship.addressee_id == user_b_id),
                and_(Friendship.requester_id == user_b_id, Friendship.addressee_id == user_a_id)
            )
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()



    async def get_friendship_by_id(self, friendship_id: UUID) -> Friendship | None:
        """finds friendship by its primary key ID."""
        stmt = select(Friendship).where(Friendship.id == friendship_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()



    async def create_request(self, requester_id: UUID, addressee_id: UUID) -> Friendship:
        """creates a new pending friendship request"""
        
        friendship = Friendship(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status="pending"
        )

        self.db.add(friendship)
        
        await self.db.flush()
        return friendship



    async def accept_request(self, friendship: Friendship) -> None:
        """sets friendship status to accepted"""
        
        friendship.status = "accepted"
        
        await self.db.flush()



    async def remove_friendship(self, friendship: Friendship) -> None:
        """deletes friendship record (decline/unfriend/unblock)"""
        
        await self.db.delete(friendship)
        
        await self.db.flush()



    async def get_pending_incoming(self, user_id: UUID) -> list[tuple[Friendship, User]]:
        """returns pending friendship requests sent to this user, including requester profile details"""
        
        stmt = (
            select(Friendship, User)
            .join(User, User.id == Friendship.requester_id)
            .where(
                Friendship.addressee_id == user_id,
                Friendship.status == "pending",
                User.deleted_at.is_(None)
            )
            .order_by(Friendship.created_at.desc())
        )

        result = await self.db.execute(stmt)
        return list(result.all())



    async def get_pending_outgoing(self, user_id: UUID) -> list[tuple[Friendship, User]]:
        """returns pending friendship requests sent by this user, including addressee details"""
        
        stmt = (
            select(Friendship, User)
            .join(User, User.id == Friendship.addressee_id)
            .where(
                Friendship.requester_id == user_id,
                Friendship.status == "pending",
                User.deleted_at.is_(None)
            )
            .order_by(Friendship.created_at.desc())
        )

        result = await self.db.execute(stmt)
        return list(result.all())



    async def get_friends(self, user_id: UUID) -> list[User]:
        """returns active friends (accepted status) for the user"""
        # find requester
        stmt1 = (
            select(User)
            .join(Friendship, Friendship.addressee_id == User.id)
            .where(
                Friendship.requester_id == user_id,
                Friendship.status == "accepted",
                User.deleted_at.is_(None)
            )
        )
        res1 = await self.db.execute(stmt1)
        friends1 = res1.scalars().all()

        # find addresser
        stmt2 = (
            select(User)
            .join(Friendship, Friendship.requester_id == User.id)
            .where(
                Friendship.addressee_id == user_id,
                Friendship.status == "accepted",
                User.deleted_at.is_(None)
            )
        )   
        
        res2 = await self.db.execute(stmt2)
        friends2 = res2.scalars().all()

        return list(friends1) + list(friends2)






    async def get_friends_feed(self, friend_ids: list[UUID], limit: int = 30) -> list[tuple[GameSession, User]]:
        """returns recent completed daily games of friends for the social feed"""
        if not friend_ids:
            return []

        stmt = (
            select(GameSession, User)
            .join(User, User.id == GameSession.user_id)
            .where(
                GameSession.user_id.in_(friend_ids),
                GameSession.game_type == "daily",
                GameSession.won == True,
                User.deleted_at.is_(None)
            )
            .order_by(GameSession.completed_at.desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return list(result.all())





    async def get_daily_leaderboard(self, day: date, limit: int = 50) -> list[tuple[GameSession, User]]:
        """returns the daily leaderboard: users who won today, ordered by attempts then completion time"""
        
        stmt = (
            select(GameSession, User)
            .join(User, User.id == GameSession.user_id)
            .where(
                GameSession.day == day,
                GameSession.game_type == "daily",
                GameSession.won == True,
                User.deleted_at.is_(None)
            )
            .order_by(
                GameSession.total_attempts.asc(),
                GameSession.completed_at.asc()
            )
            .limit(limit)
        )
        
        result = await self.db.execute(stmt)
        return list(result.all())




    async def get_streak_leaderboard(self, limit: int = 50) -> list[User]:
        """returns the streak leaderboard: users ordered by active current streak"""

        stmt = (
            select(User)
            .where(User.deleted_at.is_(None), User.current_streak > 0)
            .order_by(User.current_streak.desc(), User.xp.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
