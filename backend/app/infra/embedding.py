# embedding service with sqlite disk cache

import sqlite3
import threading
from pathlib import Path

import numpy as np
import httpx

from app.core.config import get_settings


_settings = get_settings()
EMBEDDING_MODEL: str = _settings.EMBEDDING_MODEL
EMBEDDING_DIM: int = 1536
CACHE_DB_PATH: Path = Path(_settings.EMBEDDING_CACHE_PATH)

_local = threading.local()
_api_key: str | None = None
_http_client: httpx.Client | None = None


def _get_db() -> sqlite3.Connection:
    # returns a thread-local sqlite connection
    if not hasattr(_local, "conn"):
        _local.conn = sqlite3.connect(str(CACHE_DB_PATH), check_same_thread=False)
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS embeddings (
                word TEXT PRIMARY KEY,
                vector BLOB NOT NULL
            )
            """
        )
        _local.conn.commit()
    return _local.conn



def _init_cache() -> None:
    # ensures the cache table exists at startup
    _get_db()




def _cache_get(word: str) -> np.ndarray | None:
    # retrieves a cached vector, or none
    db = _get_db()
    row = db.execute("SELECT vector FROM embeddings WHERE word = ?", (word,)).fetchone()
    if row is None:
        return None
    return np.frombuffer(row[0], dtype=np.float64)



def _cache_put(word: str, vec: np.ndarray) -> None:
    # stores a vector in the cache
    db = _get_db()
    db.execute(
        "INSERT OR REPLACE INTO embeddings (word, vector) VALUES (?, ?)",
        (word, vec.astype(np.float64).tobytes()),
    )
    db.commit()


def _cache_get_batch(words: list[str]) -> dict[str, np.ndarray]:
    # retrieves multiple cached vectors at once
    db = _get_db()
    placeholders = ",".join("?" for _ in words)
    rows = db.execute(
        f"SELECT word, vector FROM embeddings WHERE word IN ({placeholders})",
        words,
    ).fetchall()
    return {row[0]: np.frombuffer(row[1], dtype=np.float64) for row in rows}



def _cache_put_batch(items: dict[str, np.ndarray]) -> None:
    # stores multiple vectors in the cache
    db = _get_db()
    db.executemany(
        "INSERT OR REPLACE INTO embeddings (word, vector) VALUES (?, ?)",
        [(word, vec.astype(np.float64).tobytes()) for word, vec in items.items()],
    )
    db.commit()



def init(api_key: str) -> None:
    # inits the embedding service with an api key
    global _api_key, _http_client
    _api_key = api_key
    _http_client = httpx.Client(
        base_url="https://api.openai.com/v1",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        timeout=30.0,
    )

    _init_cache()
    count = sqlite3.connect(str(CACHE_DB_PATH)).execute(
        "SELECT COUNT(*) FROM embeddings"
    ).fetchone()[0]

    print(f"embedding cache: {count} words cached in {CACHE_DB_PATH.name}")


def _call_openai(texts: list[str]) -> list[np.ndarray]:
    # calls the openai embedding api for a batch of texts

    if _http_client is None or _api_key is None:
        raise RuntimeError("embedding service not initialized. call init() first.")

    response = _http_client.post(
        "/embeddings",
        json={
            "model": EMBEDDING_MODEL,
            "input": texts,
        },
    )
    response.raise_for_status()
    data = response.json()

    sorted_data = sorted(data["data"], key=lambda x: x["index"])
    return [np.array(item["embedding"], dtype=np.float64) for item in sorted_data]


def get_embedding(word: str) -> np.ndarray:
    # gets the embedding vector for a single word, returns from cache if available, otherwise fetches from openai and caches
    word = word.strip().lower()

    cached = _cache_get(word)
    if cached is not None:
        return cached

    vecs = _call_openai([word])
    vec = vecs[0]

    _cache_put(word, vec)
    return vec



def get_embeddings_batch(words: list[str]) -> dict[str, np.ndarray]:
    # get embedding vectors for a batch of words, only fetches uncached words from openai, returns dict[word -> vector]
    words = [w.strip().lower() for w in words]

    cached = _cache_get_batch(words)
    uncached = [w for w in words if w not in cached]

    if uncached:
        BATCH_SIZE = 2000
        new_vectors: dict[str, np.ndarray] = {}

        for i in range(0, len(uncached), BATCH_SIZE):
            batch = uncached[i : i + BATCH_SIZE]
            vecs = _call_openai(batch)
            for word, vec in zip(batch, vecs):
                new_vectors[word] = vec

        _cache_put_batch(new_vectors)
        cached.update(new_vectors)

    return cached


def cache_stats() -> dict:
    # returns cache statistics
    conn = sqlite3.connect(str(CACHE_DB_PATH))
    count = conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]
    conn.close()
    return {"cached_words": count, "cache_path": str(CACHE_DB_PATH)}

