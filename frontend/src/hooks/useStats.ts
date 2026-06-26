/**
 * useStats hook: game statistics.
 * Fetches user profile stats from the backend API.
 */

import { useState, useEffect, useCallback } from 'react';
import { statsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export interface Stats {
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    currentStreak: 0,
    bestStreak: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await statsApi.profile();
      setStats({
        currentStreak: data.current_streak,
        bestStreak: data.best_streak,
        gamesPlayed: data.total_games,
        gamesWon: data.won_games,
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const recordWin = useCallback((_today: string, _attempts: number) => {
    // The server inherently records the win when the game session is completed.
    // We just refetch the updated stats from the backend.
    setTimeout(fetchStats, 500);
  }, [fetchStats]);

  return { stats, recordWin };
}

