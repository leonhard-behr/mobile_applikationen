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
  gameId: string | undefined;  // undefined = daily game, string = freeplay (freeplay is currently deactivated)
}

const STORAGE_KEY = 'semantic-steps-game';
const MAX_HINTS = 3;

interface SavedGame {
  today: string;
  guesses: GuessEntry[];
  won: boolean;
  hints: HintEntry[];
  hintsUsed: number;
  penaltyAttempts: number;
}

function loadSavedGame(today: string): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: SavedGame = JSON.parse(raw);
    if (saved.today !== today) return null;
    return saved;
  } catch {
    return null;
  }
}

function saveGame(state: SavedGame) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

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

  // innit game
  useEffect(() => {
    (async () => {
      try {
        const start = await api.start();
        const saved = loadSavedGame(start.today);

        if (saved) {
          setState((s) => ({
            ...s,
            guesses: saved.guesses,
            won: saved.won,
            hints: saved.hints || [],
            hintsUsed: saved.hintsUsed || 0,
            penaltyAttempts: saved.penaltyAttempts,
            anchorWord: start.anchor_word,
            anchorRank: start.anchor_rank,
            today: start.today,
            loading: false,
            totalRanked: start.total_ranked,
            letters: start.letters || [],
            latestSimilarity: saved.guesses.length > 0
              ? saved.guesses[saved.guesses.length - 1].scaled_similarity ?? saved.guesses[saved.guesses.length - 1].similarity
              : start.anchor_similarity,
          }));

          if (saved.won) {
            const allWords = saved.guesses.map((g) => g.word);
            const victoryData = await api.victory(allWords);
            setState((s) => ({ ...s, coordinates: victoryData.coordinates }));
          }
        } else {
          const anchorEntry: GuessEntry = {
            word: start.anchor_word,
            similarity: start.anchor_similarity,
            scaled_similarity: start.anchor_similarity,
            rank: start.anchor_rank,
            is_correct: false,
          };
          const initialGuesses = [anchorEntry];
          setState((s) => ({
            ...s,
            guesses: initialGuesses,
            anchorWord: start.anchor_word,
            anchorRank: start.anchor_rank,
            today: start.today,
            loading: false,
            totalRanked: start.total_ranked,
            latestSimilarity: start.anchor_similarity,
            letters: start.letters || [],
          }));

          saveGame({
            today: start.today,
            guesses: initialGuesses,
            won: false,
            hints: [],
            hintsUsed: 0,
            penaltyAttempts: 0,
          });
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

      saveGame({
        today: state.today,
        guesses: newGuesses,
        won: result.is_correct,
        hints: state.hints,
        hintsUsed: state.hintsUsed,
        penaltyAttempts: state.penaltyAttempts,
      });

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
  }, [state.guesses, state.today, state.hints, state.hintsUsed, state.penaltyAttempts, state.gameId]);

  const requestHint = useCallback(async () => {
    const nextHint = state.hintsUsed + 1;
    if (nextHint > MAX_HINTS) return;

    setState((s) => ({ ...s, loading: true }));
    try {
      // calculating current best rank from guesses and hints
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
      const newHintsUsed = nextHint;

      setState((s) => ({
        ...s,
        hints: newHints,
        hintsUsed: newHintsUsed,
        penaltyAttempts: newPenalty,
        loading: false,
      }));
      saveGame({
        today: state.today,
        guesses: state.guesses,
        won: state.won,
        hints: newHints,
        hintsUsed: newHintsUsed,
        penaltyAttempts: newPenalty,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Hint failed',
      }));
    }
  }, [state.hintsUsed, state.hints, state.penaltyAttempts, state.today, state.guesses, state.won]);

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
      const initialGuesses = [anchorEntry];
      const newToday = `freeplay-${data.game_id}`;
      localStorage.removeItem(STORAGE_KEY);
      setState({
        guesses: initialGuesses,
        won: false,
        loading: false,
        error: null,
        anchorWord: data.anchor_word,
        anchorRank: data.anchor_rank,
        hints: [],
        hintsUsed: 0,
        penaltyAttempts: 0,
        today: newToday,
        coordinates: null,
        latestSimilarity: data.anchor_similarity,
        totalRanked: data.total_ranked,
        letters: data.letters || [],
        gameId: data.game_id,
      });

      saveGame({
        today: newToday,
        guesses: initialGuesses,
        won: false,
        hints: [],
        hintsUsed: 0,
        penaltyAttempts: 0,
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
