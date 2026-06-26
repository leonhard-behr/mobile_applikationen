"""
FastAPI entry point

initializes the embedding service and mounts the auth + game routers. 
main logic in

app/services/game.py
app/services/ranking.py.
"""

import asyncio
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.infra.embedding as embedding
from app.services.ranking import ranking_service
from data.words import get_daily_word

from app.core.middleware import CorrelationIdMiddleware, RateLimitMiddleware
import os

from app.routers.auth import router as auth_router  # noqa: E402
from app.routers.game import router as game_router  # noqa: E402
from app.routers.stats import router as stats_router  # noqa: E402
from app.routers.social import router as social_router  # noqa: E402

from fastapi import Response
from sqlalchemy import text
from app.infra.database import async_session_factory
from app.infra.redis import redis_client



load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

log_file_path = Path(__file__).parent.parent / "log.txt"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(log_file_path), encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def _startup_sync() -> None:
    api_key = os.environ.get("OPENAI_KEY", "")
    if not api_key:
        logger.error("OPENAI_KEY not found in env.")
        raise RuntimeError("OPENAI_KEY not found in env.")

    embedding.init(api_key)
    logger.info("Embedding service initialized.")

    # precomputing the rankings for the daily word
    daily_word = get_daily_word()
    cr = ranking_service._compute_sync(daily_word)
    ranking_service._cache[daily_word] = cr
    logger.info(f"Daily word rankings ready: {len(cr.rankings)} words.")
    logger.info(f"anchor='{cr.anchor_word}' ({cr.anchor_similarity:.1f}%, rank={cr.anchor_rank})")

    stats = embedding.cache_stats()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.infra.redis import redis_client
    redis_client.connect()
    await asyncio.to_thread(_startup_sync)
    yield
    await redis_client.disconnect()


app = FastAPI(title="API", lifespan=lifespan)

app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RateLimitMiddleware)

frontend_url = os.environ.get("FRONTEND_URL", "https://leonhard-behr.de")
origins = [
    "https://leonhard-behr.de",
    "https://www.leonhard-behr.de",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(game_router)
app.include_router(stats_router)
app.include_router(social_router)

@app.get("/api/health")
async def health_check(response: Response):
    health = {"status": "healthy", "postgres": "ok", "redis": "ok"}
    status_code = 200

    # checking db
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        health["postgres"] = f"unhealthy: {str(e)}"
        health["status"] = "unhealthy"
        status_code = 500

    # checking redis
    if redis_client._enabled and redis_client._redis:
        try:
            await redis_client._redis.ping()
        except Exception as e:
            health["redis"] = f"unhealthy: {str(e)}"
            health["status"] = "unhealthy"
            status_code = 500
    else:
        health["redis"] = "disabled"

    response.status_code = status_code
    return health


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=6000, reload=True)
