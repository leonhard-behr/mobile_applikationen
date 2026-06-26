"""Application config via Pydantic Settings"""

from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Centralised configuration — reads from env vars and .env file."""

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR.parent / ".env"),     # project root .env
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Vector Valley"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"         # used for JWT signing

    DATABASE_URL: str = "postgresql+asyncpg://vv_user:vv_password@localhost:5432/vectorvalley"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 3600

    REDIS_URL: str = "redis://localhost:6379/0"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    OPENAI_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_CACHE_PATH: str = str(_BACKEND_DIR / "embedding_cache.db")

    HOST: str = "0.0.0.0"
    PORT: int = 6000
    CORS_ORIGINS: list[str] = ["*"]


@lru_cache()
def get_settings() -> Settings:
    """cached settings singleton"""
    return Settings()
