"""Redis infrastructure client.
Handles caching and rate limiting with fallbacks."""

import logging
import json
from typing import Any
import redis.asyncio as aioredis
from fastapi import HTTPException, status
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class RedisClient:
    """Redis client wrapper."""

    def __init__(self):
        self._redis: aioredis.Redis | None = None
        self._enabled = False

    def connect(self) -> None:
        """innit connection pool. called during app startup"""
        try:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0
            )
            self._enabled = True
            logger.info("Redis client initialized")
            
        except Exception as e:
            logger.warning(f"Failed to initialize Redis connection: {e}")
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis connection failed.",
            )   

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.close()


    async def get(self, key: str) -> str | None:
        if not self._enabled or not self._redis:
            return None
        try:
            return await self._redis.get(key)
        except Exception as e:
            logger.warning(f"Redis get error (key={key}): {e}")
            return None

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        if not self._enabled or not self._redis:
            return False
        try:
            await self._redis.set(key, value, ex=ex)
            return True
        except Exception as e:
            logger.warning(f"Redis set error (key={key}): {e}")
            return False

    async def get_json(self, key: str) -> Any | None:
        """returns json decoded value."""
        val = await self.get(key)
        if val:
            try:
                return json.loads(val)
            except Exception:
                return None
        return None

    async def set_json(self, key: str, value: Any, ex: int | None = None) -> bool:
        """sets json encoded value."""
        try:
            val_str = json.dumps(value)
            return await self.set(key, val_str, ex=ex)
        except Exception as e:
            logger.warning(f"Redis set_json error (key={key}): {e}")
            return False

    async def delete(self, key: str) -> bool:
        """deletes key from redis"""
        if not self._enabled or not self._redis:
            return False
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis delete error (key={key}): {e}")
            return False

redis_client = RedisClient()
