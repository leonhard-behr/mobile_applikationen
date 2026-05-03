export interface StartData {
  anchor_word: string;
  anchor_similarity: number;
  anchor_rank: number | null;
  today: string;
  total_ranked: number;
  letters: string[];
  word_length: number;
}

export interface GuessData {
  word: string;
  similarity: number;
  scaled_similarity: number;
  rank: number | null;
  total_ranked: number;
  is_correct: boolean;
  letters: string[];
  word_length: number;
}

export interface Coordinate {
  word: string;
  x: number;
  y: number;
}

export interface VictoryData {
  coordinates: Coordinate[];
}

export interface HintData {
  hint_number: number;
  rank: number;
  word: string;
}

export interface LettersData {
  letters: string[];
  length: number;
}

export interface NewGameData {
  anchor_word: string;
  anchor_similarity: number;
  anchor_rank: number | null;
  today: string;
  game_id: string;
  total_ranked: number;
  letters: string[];
  word_length: number;
}

const BASE = import.meta.env.DEV
  ? '/api/game'
  : 'https://api.leonhard-behr.de/api/game';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  start: () => request<StartData>(`${BASE}/start`),

  guess: (word: string, gameId?: string, attempts?: number) => {
    const params = new URLSearchParams();
    if (gameId) params.set('game_id', gameId);
    if (attempts !== undefined) params.set('attempts', String(attempts));
    const qs = params.toString();
    return request<GuessData>(`${BASE}/guess${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ word }),
    });
  },

  hint: (hintNumber: number, bestRank: number | null, gameId?: string) =>
    request<HintData>(`${BASE}/hint${gameId ? `?game_id=${gameId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ hint_number: hintNumber, current_best_rank: bestRank }),
    }),

  letters: (attempts: number, gameId?: string) =>
    request<LettersData>(`${BASE}/letters?attempts=${attempts}${gameId ? `&game_id=${gameId}` : ''}`),

  victory: (words: string[], gameId?: string) =>
    request<VictoryData>(`${BASE}/victory${gameId ? `?game_id=${gameId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    }),

  newGame: () =>
    request<NewGameData>(`${BASE}/new`, { method: 'POST' }),
};
