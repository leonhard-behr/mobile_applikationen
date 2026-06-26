"""Ranking service: in-memory cache of word similarity rankings per target word"""

import asyncio
import logging
import math
from dataclasses import dataclass, field

import numpy as np
from scipy.spatial.distance import cosine

import app.infra.embedding as embedding
from data.words import ANCHOR_CANDIDATES
from data.german_words import COMMON_GERMAN_WORDS

logger = logging.getLogger(__name__)


@dataclass
class CachedRankings:
    """Pre-computed data for one target word"""
    word: str
    rankings: list[tuple[str, float]] = field(default_factory=list)
    rank_lookup: dict[str, int] = field(default_factory=dict)
    target_vector: np.ndarray | None = None
    max_similarity: float = 0.0
    anchor_word: str = ""
    anchor_similarity: float = 0.0
    anchor_rank: int | None = None


def _compute_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """cosine similarity between two vectors (0-100 scale)"""
    return round(float(1 - cosine(vec_a, vec_b)) * 100, 2)


def scale_similarity(raw_sim: float, anchor_sim: float, max_sim: float) -> float:
    """nonlinear scaling"""
    if max_sim <= anchor_sim:
        return raw_sim

    if raw_sim >= anchor_sim:
        t = (raw_sim - anchor_sim) / (max_sim - anchor_sim)
        t = math.sqrt(t)
        return round(20.0 + t * 79.0, 2)
    else:
        if anchor_sim <= 0:
            return 0.0
        t = raw_sim / anchor_sim
        return round(t * 20.0, 2)


class RankingService:
    """Singleton service managing pre-computed similarity rankings

    Rankings are cached in memory keyed by the target word, so multiple
    users playing the same daily word share the same rankings."""

    def __init__(self):
        self._cache: dict[str, CachedRankings] = {}


    def get_cached(self, word: str) -> CachedRankings | None:
        """gets cached rankings if available"""
        return self._cache.get(word)


    async def ensure_rankings(self, target_word: str) -> CachedRankings:
        """gets or computes rankings for a target word."""
        if target_word in self._cache:
            return self._cache[target_word]

        cr = await asyncio.to_thread(self._compute_sync, target_word)
        self._cache[target_word] = cr
        return cr


    def _compute_sync(self, target_word: str) -> CachedRankings:
        """heavy computation, runs in a thread. 
            1. gets target vector
            2. computes similarity for all common words
            3. selects anchor candidate closest to 35%
        """
        cr = CachedRankings(word=target_word)

        cr.target_vector = embedding.get_embedding(target_word)


        word_vecs = embedding.get_embeddings_batch(COMMON_GERMAN_WORDS)
        sims: list[tuple[str, float]] = []
        for w in COMMON_GERMAN_WORDS:
            vec = word_vecs.get(w)
            if vec is None:
                continue
            sim = _compute_similarity(vec, cr.target_vector)
            sims.append((w, sim))


        sims.sort(key=lambda x: x[1], reverse=True)
        cr.rankings = sims
        cr.rank_lookup = {w: i + 1 for i, (w, _) in enumerate(sims)}
        cr.max_similarity = sims[0][1] if sims else 100.0

        # ANCHOR AT 35% SIMILARITY
        anchor_vecs = embedding.get_embeddings_batch(ANCHOR_CANDIDATES)
        best_word, best_sim, best_diff = ANCHOR_CANDIDATES[0], 0.0, float("inf")
        for cand in ANCHOR_CANDIDATES:
            vec = anchor_vecs.get(cand)
            if vec is None:
                continue
            sim = _compute_similarity(vec, cr.target_vector)
            diff = abs(sim - 35.0)
            if diff < best_diff:
                best_word, best_sim, best_diff = cand, sim, diff

        cr.anchor_word = best_word
        cr.anchor_similarity = best_sim
        cr.anchor_rank = cr.rank_lookup.get(best_word)


        logger.info(f"Rankings computed for '{target_word}': {len(cr.rankings)} words, anchor='{cr.anchor_word}' ({cr.anchor_similarity:.1f}%, rank={cr.anchor_rank})")
        return cr


    def compute_rank_for_guess(self, cr: CachedRankings, word: str, raw_sim: float) -> int | None:
        """get the rank for a guessed word. if the word is in the pre-computed list, returns its rank. otherwise, interpolates where it would fall."""
        rank = cr.rank_lookup.get(word)
        if rank is not None:
            return rank

        for i, (_, s) in enumerate(cr.rankings):
            if raw_sim >= s:
                return i + 1

        return len(cr.rankings) + 1


ranking_service = RankingService()
