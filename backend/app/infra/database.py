"""Async PostgreSQL engine"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,                         # health-check before reuse
    pool_recycle=settings.DB_POOL_RECYCLE,      # recycle after 1 h
    echo=settings.DEBUG,                        # SQL logging in dev only
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,                     # avoiding lazy-load after commit
)


async def get_db_session() -> AsyncSession:
    """FastAPI dependency, yielding a transactional session"""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
