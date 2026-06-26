"""Auth service: logic for registration, login, token refresh, and profile"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.core.exceptions import (
    InvalidCredentials,
    UserAlreadyExists,
    TokenInvalid,
    UserNotFound,
)
from app.repositories.user import UserRepository
from app.models.user import User

logger = logging.getLogger(__name__)


class AuthService:
    """Orchestrates authentication workflows"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, username: str, email: str, password: str, display_name: str | None = None) -> tuple[User, str, str]:
        """registers a new user. returns (user, access token, refresh token). raises UserAlreadyExists if username or email is taken."""
        
        # checks for uniqueness
        if await self.repo.get_by_username(username):
            raise UserAlreadyExists("username")
        if await self.repo.get_by_email(email):
            raise UserAlreadyExists("email")

        
        # creates user
        hashed = hash_password(password)
        user = await self.repo.create(
            username=username,
            email=email,
            password_hash=hashed,
            display_name=display_name,
        )
        await self.db.commit()
        await self.db.refresh(user)


        # issues tokens
        access = create_access_token(user.id)
        refresh = create_refresh_token(user.id)

        logger.info(f"New user registered: {user.username} (id={user.id})")
        return user, access, refresh



    async def login(self, username: str, password: str) -> tuple[User, str, str]:
        """authenticates a user by username + password. returns (user, access_token, refresh_token). raises InvalidCredentials if authentication fails."""
        
        
        user = await self.repo.get_by_username(username) # gets user
        if user is None:
            raise InvalidCredentials()

        if not verify_password(password, user.password_hash): # verifies password
            raise InvalidCredentials()

        await self.repo.update_last_active(user) # updates activity
        await self.db.commit()
        
        access = create_access_token(user.id) # issues tokens
        refresh = create_refresh_token(user.id)

        logger.info(f"User logged in: {user.username}")
        return user, access, refresh



    async def refresh(self, refresh_token: str) -> tuple[User, str]:
        """validates a refresh token and issues a new access token. returns (user, new_access_token). raises TokenInvalid if the refresh token is invalid/expired."""
        
        user_id: UUID | None = decode_refresh_token(refresh_token)
        if user_id is None:
            raise TokenInvalid("Refresh token is invalid or expired.")

        user = await self.repo.get_by_id(user_id)
        if user is None:
            raise UserNotFound()

        # updates activity
        await self.repo.update_last_active(user)
        await self.db.commit()

        access = create_access_token(user.id)
        return user, access



    async def get_profile(self, user_id: UUID) -> User:
        """gets a users profile by ID. raises UserNotFound if not found."""
        
        user = await self.repo.get_by_id(user_id)
        if user is None:
            raise UserNotFound()
        return user



    async def update_profile(self, user: User, display_name: str | None = None, avatar_url: str | None = None, is_public: bool | None = None,) -> User:
        """updates a users profile. raises UserNotFound if not found."""
        
        user = await self.repo.update_profile(
            user,
            display_name=display_name,
            avatar_url=avatar_url,
            is_public=is_public,
        )
        await self.db.commit()
        await self.db.refresh(user)
        return user



    async def delete_account(self, user: User) -> None:
        """soft-delete a user account."""
        
        await self.repo.soft_delete(user)
        await self.db.commit()
        logger.info(f"User soft-deleted: {user.username} (id={user.id})")
