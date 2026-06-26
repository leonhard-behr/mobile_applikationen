"""FastAPI dependency injection: database sessions and auth"""

from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infra.database import async_session_factory
from app.models.user import User
from app.core.security import decode_access_token
from app.core.exceptions import TokenInvalid, TokenExpired, UserNotFound

# OAuth2 schema: extracts token
oauth2_schema = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """yields a transactional database session, then closes it"""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(token: str = Depends(oauth2_schema), db: AsyncSession = Depends(get_db),) -> User:
    """validates the JWT access token and return the authenticated User.
    raises 401 if the token is invalid or the user doesn't exist"""
    
    user_id: UUID | None = decode_access_token(token)
    if user_id is None:
        raise TokenInvalid()

    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise UserNotFound()

    return user
