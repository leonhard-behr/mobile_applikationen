# async postgresql engine

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
    pool_recycle=settings.DB_POOL_RECYCLE,      # recycle after 1 hour
    echo=settings.DEBUG,                        # sql logging in dev only
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,                     # avoid lazy-loading after commit
)

