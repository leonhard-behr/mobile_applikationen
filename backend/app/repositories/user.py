"""User repository
database CRUD operations for the User model"""

from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """All database access for User entities"""

    def __init__(self, db: AsyncSession):
        self.db = db



    async def get_by_id(self, user_id: UUID) -> User | None:
        """fetches a non-deleted user by ID"""
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()



    async def get_by_username(self, username: str) -> User | None:
        """fetches a non-deleted user by username (case-insensitive)"""
        result = await self.db.execute(
            select(User).where(
                func.lower(User.username) == username.lower(),
                User.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()



    async def get_by_email(self, email: str) -> User | None:
        """fetches a non-deleted user by email (case-insensitive)"""
        result = await self.db.execute(
            select(User).where(
                func.lower(User.email) == email.lower(),
                User.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()



    async def create(self, username: str, email: str, password_hash: str, display_name: str | None = None,) -> User:
        """creates a new user and flushes (but don't commit) to get the ID"""
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            display_name=display_name or username,
        )
        self.db.add(user)
        await self.db.flush() # assigns user.id
        return user



    async def update_profile(self, user: User, display_name: str | None = None, avatar_url: str | None = None, is_public: bool | None = None,) -> User:
        """updates mutable profile fields"""
        if display_name is not None:
            user.display_name = display_name
        if avatar_url is not None:
            user.avatar_url = avatar_url
        if is_public is not None:
            user.is_public = is_public
        await self.db.flush()
        return user



    async def update_last_active(self, user: User) -> None:
        """touches the last_active_at timestamp"""
        user.last_active_at = datetime.utcnow()
        await self.db.flush()



    async def soft_delete(self, user: User) -> None:
        """soft-delete: set deleted_at timestamp"""
        user.deleted_at = datetime.utcnow()
        await self.db.flush()



    async def update_streak(self, user: User, current: int, best: int) -> None:
        """updates streak counters"""
        user.current_streak = current
        user.best_streak = best
        await self.db.flush()



    async def add_xp(self, user: User, amount: int) -> None:
        """add xp and recalculate level (100 XP per level)"""
        user.xp += amount
        user.level = (user.xp // 100) + 1
        await self.db.flush()
