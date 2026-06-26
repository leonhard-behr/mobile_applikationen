/**
 * useGame hook: game state management
 * 
 * server is the single source of truth. no localStorage
 * 
 * on mount, calls /api/game/start which either creates a new session or returns the existing one with all guesses/hints restored
 */

import { useState, useEffect, useCallback } from 'react';
import { api, type GuessData, type Coordinate } from '../api';

export interface GuessEntry {
  word: string;
  similarity: number;
  scaled_similarity: number;
  rank: number | null;
  is_correct: boolean;
}

export interface HintEntry {
  hint_number: number;
  rank: number;
  word: string;
}

interface GameState {
  guesses: GuessEntry[];
  won: boolean;
  loading: boolean;
  error: string | null;
  anchorWord: string;
  anchorRank: number | null;
  hints: HintEntry[];
  hintsUsed: number;
  penaltyAttempts: number;
  today: string;
  coordinates: Coordinate[] | null;
  latestSimilarity: number;
  totalRanked: number;
  letters: string[];
  gameId: string | undefined;
}

const MAX_HINTS = 3;

export function useGame() {
  const [state, setState] = useState<GameState>({
    guesses: [],
    won: false,
    loading: true,
    error: null,
    anchorWord: '',
    anchorRank: null,
    hints: [],
    hintsUsed: 0,
    penaltyAttempts: 0,
    today: '',
    coordinates: null,
    latestSimilarity: 0,
    totalRanked: 0,
    letters: [],
    gameId: undefined,
  });








  // init game: server handles resume
  useEffect(() => {
    (async () => {
      try {
        const start = await api.start();

        // server returned existing guesses (resume)
        if (start.guesses && start.guesses.length > 0) {
          const restoredGuesses: GuessEntry[] = start.guesses.map((g) => ({
            word: g.word,
            similarity: g.similarity,
            scaled_similarity: g.scaled_similarity,
            rank: g.rank,
            is_correct: g.is_correct,
          }));

          const restoredHints: HintEntry[] = (start.hints || []).map((h) => ({
            hint_number: h.hint_number,
            rank: h.rank,
            word: h.word,
          }));

          setState((s) => ({
            ...s,
            guesses: restoredGuesses,
            won: start.won,
            hints: restoredHints,
            hintsUsed: start.hints_used || 0,
            penaltyAttempts: start.penalty_attempts || 0,
            anchorWord: start.anchor_word,
            anchorRank: start.anchor_rank,
            today: start.today,
            loading: false,
            totalRanked: start.total_ranked,
            letters: start.letters || [],
            gameId: start.session_id || undefined,
            latestSimilarity: restoredGuesses.length > 0
              ? restoredGuesses[restoredGuesses.length - 1].scaled_similarity
              : start.anchor_similarity,
          }));

          // if already won, fetches victory coordinates
          if (start.won) {
            const allWords = restoredGuesses.map((g) => g.word);
            const victoryData = await api.victory(allWords, start.session_id || undefined);
            setState((s) => ({ ...s, coordinates: victoryData.coordinates }));
          }
        } else {

          // new game: seed with anchor as first guess
          const anchorEntry: GuessEntry = {
            word: start.anchor_word,
            similarity: start.anchor_similarity,
            scaled_similarity: start.anchor_similarity,
            rank: start.anchor_rank,
            is_correct: false,
          };
          setState((s) => ({
            ...s,
            guesses: [anchorEntry],
            anchorWord: start.anchor_word,
            anchorRank: start.anchor_rank,
            today: start.today,
            loading: false,
            totalRanked: start.total_ranked,
            latestSimilarity: start.anchor_similarity,
            letters: start.letters || [],
            gameId: start.session_id || undefined,
          }));
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to connect to server',
        }));
      }
    })();
  }, []);






  const submitGuess = useCallback(async (word: string) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;

    if (state.guesses.some((g) => g.word === trimmed)) {
      setState((s) => ({ ...s, error: 'Already guessed!' }));
      setTimeout(() => setState((s) => ({ ...s, error: null })), 2000);
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const result: GuessData = await api.guess(trimmed, state.gameId, state.guesses.length);
      const newEntry: GuessEntry = {
        word: result.word,
        similarity: result.similarity,
        scaled_similarity: result.scaled_similarity,
        rank: result.rank,
        is_correct: result.is_correct,
      };
      const newGuesses = [...state.guesses, newEntry];

      setState((s) => ({
        ...s,
        guesses: newGuesses,
        won: result.is_correct,
        loading: false,
        latestSimilarity: result.scaled_similarity,
        letters: result.letters || s.letters,
      }));

      if (result.is_correct) {
        const allWords = newGuesses.map((g) => g.word);
        const victoryData = await api.victory(allWords, state.gameId);
        setState((s) => ({ ...s, coordinates: victoryData.coordinates }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Guess failed',
      }));
    }
  }, [state.guesses, state.gameId]);





  const requestHint = useCallback(async () => {
    const nextHint = state.hintsUsed + 1;
    if (nextHint > MAX_HINTS) return;

    setState((s) => ({ ...s, loading: true }));
    try {
      let currentBestRank: number | null = null;
      const allRanks = [
        ...state.guesses.map(g => g.rank).filter(r => r !== null && r > 0),
        ...state.hints.map(h => h.rank)
      ];
      if (allRanks.length > 0) {
        currentBestRank = Math.min(...(allRanks as number[]));
      }

      const data = await api.hint(nextHint, currentBestRank, state.gameId);
      const newHints = [...state.hints, { hint_number: data.hint_number, rank: data.rank, word: data.word }];
      const newPenalty = state.penaltyAttempts + 1;

      setState((s) => ({
        ...s,
        hints: newHints,
        hintsUsed: nextHint,
        penaltyAttempts: newPenalty,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Hint failed',
      }));
    }
  }, [state.hintsUsed, state.hints, state.penaltyAttempts, state.guesses, state.gameId]);






  const startNewGame = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.newGame();
      const anchorEntry: GuessEntry = {
        word: data.anchor_word,
        similarity: data.anchor_similarity,
        scaled_similarity: data.anchor_similarity,
        rank: data.anchor_rank,
        is_correct: false,
      };
      setState({
        guesses: [anchorEntry],
        won: false,
        loading: false,
        error: null,
        anchorWord: data.anchor_word,
        anchorRank: data.anchor_rank,
        hints: [],
        hintsUsed: 0,
        penaltyAttempts: 0,
        today: data.today,
        coordinates: null,
        latestSimilarity: data.anchor_similarity,
        totalRanked: data.total_ranked,
        letters: data.letters || [],
        gameId: data.game_id,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Could not start new game',
      }));
    }
  }, []);



  const totalAttempts = state.guesses.length - 1 + state.penaltyAttempts; // -1 for anchor

  return {
    ...state,
    totalAttempts,
    maxHints: MAX_HINTS,
    submitGuess,
    requestHint,
    startNewGame,
  };
}
