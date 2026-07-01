// THIS FILE WAS PARTIALLY GENERATED WITH GENERATIVE AI
// CLAUDE OPUS 4.6
// GEMINI 3.5 FLASH (High)


export interface StartData {
  anchor_word: string;
  anchor_similarity: number;
  anchor_rank: number | null;
  today: string;
  total_ranked: number;
  letters: string[];
  word_length: number;

  session_id: string | null;
  guesses: { word: string; similarity: number; scaled_similarity: number; rank: number | null; is_correct: boolean }[] | null;
  won: boolean;
  hints: { hint_number: number; rank: number; word: string }[] | null;
  hints_used: number;
  penalty_attempts: number;
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





export interface TokenData {
  access_token: string;
  token_type: string;
}

export interface UserData {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  is_public: boolean;
  created_at: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}





let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}





const BASE_GAME = import.meta.env.DEV
  ? '/api/game'
  : 'https://api.leonhard-behr.de/api/game';

const BASE_AUTH = import.meta.env.DEV
  ? '/api/auth'
  : 'https://api.leonhard-behr.de/api/auth';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // inject auth header if token exists
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(url, {
    headers,
    credentials: 'include',  // send cookies (refresh token)
    ...options,
  });

  // 401, try refreshing token once
  if (res.status === 401 && _accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // retry original request with new token
      headers['Authorization'] = `Bearer ${_accessToken}`;
      const retry = await fetch(url, {
        headers,
        credentials: 'include',
        ...options,
      });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail || `HTTP ${retry.status}`);
      }
      return retry.json();
    } else {

      // refresh failed -> force logout
      _accessToken = null;
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_AUTH}/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data: TokenData = await res.json();
    _accessToken = data.access_token;
    return true;
  } catch {
    return false;
  }
}






export const authApi = {
  register: async (payload: RegisterPayload): Promise<TokenData> => {
    const res = await fetch(`${BASE_AUTH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  login: async (payload: LoginPayload): Promise<TokenData> => {
    const res = await fetch(`${BASE_AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  refresh: tryRefresh,

  logout: async (): Promise<void> => {
    await fetch(`${BASE_AUTH}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    _accessToken = null;
  },

  me: () => request<UserData>(`${BASE_AUTH}/me`),
};






export const api = {
  start: () => request<StartData>(`${BASE_GAME}/start`),

  guess: (word: string, gameId?: string, attempts?: number) => {
    const params = new URLSearchParams();
    if (gameId) params.set('game_id', gameId);
    if (attempts !== undefined) params.set('attempts', String(attempts));
    const qs = params.toString();
    return request<GuessData>(`${BASE_GAME}/guess${qs ? `?${qs}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ word }),
    });
  },

  hint: (hintNumber: number, bestRank: number | null, gameId?: string) =>
    request<HintData>(`${BASE_GAME}/hint${gameId ? `?game_id=${gameId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ hint_number: hintNumber, current_best_rank: bestRank }),
    }),

  letters: (attempts: number, gameId?: string) =>
    request<LettersData>(`${BASE_GAME}/letters?attempts=${attempts}${gameId ? `&game_id=${gameId}` : ''}`),

  victory: (words: string[], gameId?: string) =>
    request<VictoryData>(`${BASE_GAME}/victory${gameId ? `?game_id=${gameId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    }),

  victoryByDay: (day: string) =>
    request<VictoryData>(`${BASE_GAME}/victory/${day}`),

  newGame: () =>
    request<NewGameData>(`${BASE_GAME}/new`, { method: 'POST' }),
};






export interface ProfileStats {
  username: string;
  display_name: string | null;
  xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  total_games: number;
  won_games: number;
  perfect_games: number;
  avg_attempts: number;
}

export interface JourneyStation {
  id: number;
  date: string;
  date_label: string;
  status: 'completed' | 'today' | 'missed' | 'locked';
  attempts: number | null;
  word: string | null;
  hints_used: number;
}

export interface JourneyData {
  stations: JourneyStation[];
}

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  xp_reward: number;
  earned: boolean;
}

export interface AchievementEarned {
  key: string;
  name: string;
  description: string;
  xp_reward: number;
  earned_at: string | null;
}

export interface AchievementsData {
  definitions: AchievementDef[];
  earned: AchievementEarned[];
  total_earned: number;
  total_available: number;
}






const BASE_STATS = import.meta.env.DEV
  ? '/api/stats'
  : 'https://api.leonhard-behr.de/api/stats';

export const statsApi = {
  profile: () => request<ProfileStats>(`${BASE_STATS}/profile`),
  journey: (limit = 30) => request<JourneyData>(`${BASE_STATS}/journey?limit=${limit}`),
  achievements: () => request<AchievementsData>(`${BASE_STATS}/achievements`),
};






export interface FriendListItem {
  id: number;
  username: string;
  display_name: string | null;
  level: number;
  xp: number;
  current_streak: number;
  best_streak: number;
}

export interface PendingIncomingRequest {
  request_id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export interface PendingOutgoingRequest {
  request_id: string;
  username: string;
  display_name: string | null;
  created_at: string;
}

export interface DailyLeaderboardItem {
  username: string;
  display_name: string | null;
  total_attempts: number;
  hints_used: number;
  completed_at: string | null;
}

export interface StreakLeaderboardItem {
  username: string;
  display_name: string | null;
  current_streak: number;
  level: number;
  xp: number;
}

export interface FeedItem {
  username: string;
  display_name: string | null;
  total_attempts: number;
  hints_used: number;
  target_word: string;
  completed_at: string;
}

export interface PublicProfileResponse {
  username: string;
  display_name: string | null;
  xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  total_games: number;
  achievements: AchievementEarned[];
}






const BASE_SOCIAL = import.meta.env.DEV
  ? '/api/social'
  : 'https://api.leonhard-behr.de/api/social';

export const socialApi = {
  getFriends: () => request<FriendListItem[]>(`${BASE_SOCIAL}/friends`),
  getIncoming: () => request<PendingIncomingRequest[]>(`${BASE_SOCIAL}/friends/incoming`),
  getOutgoing: () => request<PendingOutgoingRequest[]>(`${BASE_SOCIAL}/friends/outgoing`),
  sendRequest: (username: string) => request<{ message: string }>(`${BASE_SOCIAL}/friends/request`, { method: 'POST', body: JSON.stringify({ username }) }),
  acceptRequest: (requestId: string) => request<{ message: string }>(`${BASE_SOCIAL}/friends/accept/${requestId}`, { method: 'POST' }),
  declineRequest: (requestId: string) => request<{ message: string }>(`${BASE_SOCIAL}/friends/decline/${requestId}`, { method: 'POST' }),
  unfriend: (username: string) => request<{ message: string }>(`${BASE_SOCIAL}/friends/${username}`, { method: 'DELETE' }),
  getFeed: () => request<FeedItem[]>(`${BASE_SOCIAL}/friends/feed`),
  getDailyLeaderboard: (day: string) => request<DailyLeaderboardItem[]>(`${BASE_SOCIAL}/leaderboard/daily?day=${day}`),
  getStreakLeaderboard: () => request<StreakLeaderboardItem[]>(`${BASE_SOCIAL}/leaderboard/streak`),
  getProfile: (username: string) => request<PublicProfileResponse>(`${BASE_SOCIAL}/profile/${username}`),
};
