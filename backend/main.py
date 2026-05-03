import asyncio
import hashlib
import math
import os
import random
import logging
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from datetime import date
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy.spatial.distance import cosine
from sklearn.decomposition import PCA

import embedding
from words import get_daily_word, get_daily_seed, ANCHOR_CANDIDATES, WORD_POOL
from german_words import COMMON_GERMAN_WORDS

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
@dataclass
class GameSession:
    """Self-contained state for one game (daily or freeplay)."""
    target_word: str = ""
    target_vector: Optional[np.ndarray] = None
    anchor_word: str = ""
    anchor_similarity: float = 0.0
    anchor_rank: Optional[int] = None
    rankings: list[tuple[str, float]] = field(default_factory=list)
    rank_lookup: dict[str, int] = field(default_factory=dict)


daily_game = GameSession()
freeplay_games: dict[str, GameSession] = {}
TOP_K = 99999
HINT_RANKS = [1000, 500, 100]


def _get_letters(session: 'GameSession', attempts: int) -> list[str]:
    """Compute revealed letters for a game session given attempt count."""
    revealed_count = min(attempts // 3, len(session.target_word))
    return [
        char if i < revealed_count else ""
        for i, char in enumerate(session.target_word)
    ]


def _compute_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Cosine similarity between two vectors (0-100 scale)."""
    return round(float(1 - cosine(vec_a, vec_b)) * 100, 2)



def _scale_similarity(raw_sim: float, anchor_sim: float, max_sim: float) -> float:
    """
    Nonlinear scaling so the anchor forms the bottom of the 'warm' zone
    and the best rank maps near 99%.
    Below anchor  → 0-20%
    Above anchor  → 20-99%
    """
    if max_sim <= anchor_sim:
        return raw_sim  # edge case: no spread

    if raw_sim >= anchor_sim:
        t = (raw_sim - anchor_sim) / (max_sim - anchor_sim)
        t = math.sqrt(t)
        return round(20.0 + t * 79.0, 2)
    else:
        if anchor_sim <= 0:
            return 0.0
        t = raw_sim / anchor_sim
        return round(t * 20.0, 2)



def _select_anchor(target_vec: np.ndarray) -> tuple[str, float]:
    """Pick the anchor candidate closest to 35% similarity."""
    # fetching embeddings for all anchor candidates (cached after first call)
    anchor_vecs = embedding.get_embeddings_batch(ANCHOR_CANDIDATES)

    best_word = ANCHOR_CANDIDATES[0]
    best_diff = float("inf")
    best_sim = 0.0

    for word in ANCHOR_CANDIDATES:
        vec = anchor_vecs.get(word)
        if vec is None:
            continue
        sim = _compute_similarity(vec, target_vec)
        diff = abs(sim - 35.0)
        if diff < best_diff:
            best_diff = diff
            best_word = word
            best_sim = sim

    return best_word, best_sim


def _compute_rankings(target_vec: np.ndarray) -> tuple[list[tuple[str, float]], dict[str, int]]:
    """
    Sort all common words by similarity to the target and build rank lookup.

    Uses batch embedding — on first run this calls OpenAI for uncached words,
    but on subsequent runs everything comes from the local SQLite cache (free).

    Returns (rankings, rank_lookup) instead of mutating globals.
    """
    # fetching embeddings for all common words (on-demand with cache)
    word_vecs = embedding.get_embeddings_batch(COMMON_GERMAN_WORDS)

    sims = []
    for word in COMMON_GERMAN_WORDS:
        vec = word_vecs.get(word)
        if vec is None:
            continue
        sim = _compute_similarity(vec, target_vec)
        sims.append((word, sim))

    sims.sort(key=lambda x: x[1], reverse=True)
    rl = {word: i + 1 for i, (word, _) in enumerate(sims)}
    return sims, rl



def _refresh_daily_if_needed() -> None:
    """Check if the date has changed and update the daily_game target word if necessary."""
    global daily_game
    current_word = get_daily_word()
    if daily_game.target_word != current_word:
        logger.info(f"Updating daily word from '{daily_game.target_word}' to '{current_word}'.")
        daily_game.target_word = current_word
        daily_game.target_vector = embedding.get_embedding(current_word)
        daily_game.rankings, daily_game.rank_lookup = _compute_rankings(daily_game.target_vector)
        daily_game.anchor_word, daily_game.anchor_similarity = _select_anchor(daily_game.target_vector)
        daily_game.anchor_rank = daily_game.rank_lookup.get(daily_game.anchor_word)



def _resolve_game(game_id: Optional[str]) -> GameSession:
    """Return the correct GameSession for the given game_id (or daily if None)."""
    _refresh_daily_if_needed()
    if game_id is None or game_id == "":
        return daily_game
    session = freeplay_games.get(game_id)
    if session is None:
        # FALLBACK TO DAILY GAME IF GAME_ID NOT FOUND
        return daily_game
    return session



def _startup_sync() -> None:
    """Synchronous startup logic — runs in a thread to avoid blocking the event loop."""
    global daily_game

    api_key = os.environ.get("OPENAI_KEY", "")
    if not api_key:
        logger.error("OPENAI_KEY not found in environment.")
        raise RuntimeError(
            "OPENAI_KEY not found in environment. "
            "Make sure .env file exists with OPENAI_KEY set."
        )
    embedding.init(api_key)
    logger.info("Embedding service initialized (model: text-embedding-3-small).")

    daily_game.target_word = get_daily_word()
    daily_game.target_vector = embedding.get_embedding(daily_game.target_word)
    logger.info(f"Daily target ready (hash: {hashlib.sha256(daily_game.target_word.encode()).hexdigest()[:12]}...)")

    logger.info(f"Computing rankings for {len(COMMON_GERMAN_WORDS)} words (cached words are free)...")
    daily_game.rankings, daily_game.rank_lookup = _compute_rankings(daily_game.target_vector)
    logger.info(f"Rankings computed. Top 5: {[(w, s) for w, s in daily_game.rankings[:5]]}")

    daily_game.anchor_word, daily_game.anchor_similarity = _select_anchor(daily_game.target_vector)
    daily_game.anchor_rank = daily_game.rank_lookup.get(daily_game.anchor_word)
    logger.info(f"Anchor: '{daily_game.anchor_word}' ({daily_game.anchor_similarity}%, rank={daily_game.anchor_rank})")

    stats = embedding.cache_stats()
    logger.info(f"Cache: {stats['cached_words']} words stored in {stats['cache_path']}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(_startup_sync)
    yield


app = FastAPI(title="Semantic Steps API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GuessRequest(BaseModel):
    word: str


class GuessResponse(BaseModel):
    word: str
    similarity: float           # raw cosine similarity (0-100)
    scaled_similarity: float    # nonlinear scaled (0-99)
    rank: int | None            # rank in top-K, or null
    total_ranked: int           # total words in ranking list
    is_correct: bool
    letters: list[str]          # current revealed letters
    word_length: int            # target word length


class StartResponse(BaseModel):
    anchor_word: str
    anchor_similarity: float
    anchor_rank: int | None
    today: str
    total_ranked: int
    letters: list[str]
    word_length: int


class HintRequest(BaseModel):
    hint_number: int  # 1, 2, or 3
    current_best_rank: int | None = None


class HintResponse(BaseModel):
    hint_number: int
    rank: int
    word: str


class VictoryRequest(BaseModel):
    words: list[str]


class Coordinate(BaseModel):
    word: str
    x: float
    y: float


class VictoryResponse(BaseModel):
    coordinates: list[Coordinate]


class NewGameResponse(BaseModel):
    anchor_word: str
    anchor_similarity: float
    anchor_rank: int | None
    today: str
    game_id: str
    total_ranked: int
    letters: list[str]
    word_length: int


class LettersResponse(BaseModel):
    letters: list[str]
    length: int


# ENDPOINTS

@app.get("/api/game/start", response_model=StartResponse)
async def game_start():
    """Return the anchor word and ranking metadata for the daily game."""
    g = daily_game
    return StartResponse(
        anchor_word=g.anchor_word,
        anchor_similarity=g.anchor_similarity,
        anchor_rank=g.anchor_rank,
        today=date.today().isoformat(),
        total_ranked=len(g.rankings),
        letters=_get_letters(g, 0),
        word_length=len(g.target_word),
    )


@app.post("/api/game/guess", response_model=GuessResponse)
async def game_guess(req: GuessRequest, game_id: Optional[str] = Query(None), attempts: int = Query(0)):
    """Compute similarity + rank for the guessed word."""
    g = _resolve_game(game_id)
    word = req.word.strip().lower()
    if not word:
        raise HTTPException(status_code=400, detail="Word must not be empty.")

    # getting embedding on demand
    vec = await asyncio.to_thread(embedding.get_embedding, word)
    raw_sim = _compute_similarity(vec, g.target_vector)
    is_correct = word == g.target_word

    rank = g.rank_lookup.get(word)
    display_rank = rank

    if rank is None and not is_correct:
        for i, (_, s) in enumerate(g.rankings):
            if raw_sim >= s:
                rank = i + 1
                break
        if rank is None:
            rank = len(g.rankings) + 1
        display_rank = rank

    # Scale similarity
    max_sim = g.rankings[0][1] if g.rankings else 100.0
    scaled = _scale_similarity(raw_sim, g.anchor_similarity, max_sim)

    if is_correct:
        display_rank = 0

    logger.info(f"Guess received: '{word}' | Rank: {display_rank} | Sim: {scaled}% | Correct: {is_correct}")

    return GuessResponse(
        word=word,
        similarity=raw_sim,
        scaled_similarity=scaled,
        rank=display_rank,
        total_ranked=len(g.rankings),
        is_correct=is_correct,
        letters=_get_letters(g, attempts),
        word_length=len(g.target_word),
    )


@app.post("/api/game/hint", response_model=HintResponse)
async def game_hint(req: HintRequest, game_id: Optional[str] = Query(None)):
    """Reveal the word at a specific hint rank (adaptive based on best rank)."""
    g = _resolve_game(game_id)
    if req.hint_number < 1 or req.hint_number > len(HINT_RANKS):
        raise HTTPException(status_code=400, detail=f"hint_number must be 1-{len(HINT_RANKS)}")

    if req.current_best_rank is not None and req.current_best_rank > 2:
        target_rank = max(2, req.current_best_rank // 2)
    else:
        target_rank = HINT_RANKS[req.hint_number - 1]

    # clamp
    idx = min(target_rank - 1, len(g.rankings) - 1)
    hint_word, _ = g.rankings[idx]

    return HintResponse(
        hint_number=req.hint_number,
        rank=idx + 1,
        word=hint_word,
    )


@app.get("/api/game/letters", response_model=LettersResponse)
async def game_letters(attempts: int, game_id: Optional[str] = Query(None)):
    """Reveal one letter for every 3 attempts."""
    g = _resolve_game(game_id)
    revealed_count = attempts // 3
    revealed_count = min(revealed_count, len(g.target_word))
    
    masked = []
    for i, char in enumerate(g.target_word):
        if i < revealed_count:
            masked.append(char)
        else:
            masked.append("")
            
    return LettersResponse(letters=masked, length=len(g.target_word))


@app.post("/api/game/victory", response_model=VictoryResponse)
async def game_victory(req: VictoryRequest):
    """Run PCA on all guess vectors and return 2D coordinates."""
    if len(req.words) < 2:
        raise HTTPException(status_code=400, detail="At least 2 words are required for PCA.")

    words = [w.strip().lower() for w in req.words]

    # batch fetching embeddings (cached after first call)
    word_vecs = await asyncio.to_thread(embedding.get_embeddings_batch, words)
    vectors = np.array([word_vecs[w] for w in words])

    n_components = min(2, len(words), vectors.shape[1])
    pca = PCA(n_components=n_components)
    coords_2d = pca.fit_transform(vectors)

    coordinates = []
    for i, word in enumerate(words):
        coordinates.append(Coordinate(
            word=word,
            x=round(float(coords_2d[i][0]), 4),
            y=round(float(coords_2d[i][1]), 4) if n_components == 2 else 0.0,
        ))

    return VictoryResponse(coordinates=coordinates)


@app.post("/api/game/new", response_model=NewGameResponse)
async def game_new():
    """Start a fresh game."""
    new_word = random.choice(WORD_POOL)
    game_id = hashlib.sha256(f"{new_word}-{random.random()}".encode()).hexdigest()[:8]

    def _new_game_sync() -> GameSession:
        session = GameSession()
        session.target_word = new_word
        session.target_vector = embedding.get_embedding(new_word)
        session.anchor_word, session.anchor_similarity = _select_anchor(session.target_vector)
        session.rankings, session.rank_lookup = _compute_rankings(session.target_vector)
        session.anchor_rank = session.rank_lookup.get(session.anchor_word)
        return session

    session = await asyncio.to_thread(_new_game_sync)
    freeplay_games[game_id] = session

    logger.info(f"New game started (id={game_id}, anchor='{session.anchor_word}' {session.anchor_similarity:.1f}%, rank={session.anchor_rank})")

    return NewGameResponse(
        anchor_word=session.anchor_word,
        anchor_similarity=session.anchor_similarity,
        anchor_rank=session.anchor_rank,
        today=date.today().isoformat(),
        game_id=game_id,
        total_ranked=len(session.rankings),
        letters=_get_letters(session, 0),
        word_length=len(session.target_word),
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=6000, reload=True)
