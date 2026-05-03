import { useState, useEffect } from 'react';

interface DayStat {
  date: string;
  attempts: number;
  won: boolean;
}

interface Stats {
  history: DayStat[];
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
}

const STATS_KEY = 'semantic-steps-stats';

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { history: [], currentStreak: 0, bestStreak: 0, gamesPlayed: 0, gamesWon: 0 };
    return JSON.parse(raw);
  } catch {
    return { history: [], currentStreak: 0, bestStreak: 0, gamesPlayed: 0, gamesWon: 0 };
  }
}

function saveStats(stats: Stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(loadStats);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  const recordWin = (today: string, attempts: number) => {
    setStats((prev) => {
      // avoiidning duplicate entries for the same day
      if (prev.history.some((h) => h.date === today)) return prev;

      const newEntry: DayStat = { date: today, attempts, won: true };
      const newHistory = [...prev.history, newEntry];

      // calc streak
      const newStreak = prev.currentStreak + 1;
      const newBest = Math.max(prev.bestStreak, newStreak);

      return {
        history: newHistory,
        currentStreak: newStreak,
        bestStreak: newBest,
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + 1,
      };
    });
  };

  return { stats, recordWin };
}
