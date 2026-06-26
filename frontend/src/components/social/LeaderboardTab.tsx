import type { DailyLeaderboardItem, StreakLeaderboardItem } from '../../api';
import { EmptyState } from './EmptyState';
import flameIcon from '../../assets/flame.svg';

interface LeaderboardTabProps {
  leaderboardType: 'daily' | 'streak';
  setLeaderboardType: (type: 'daily' | 'streak') => void;
  dailyLeaderboard: DailyLeaderboardItem[];
  streakLeaderboard: StreakLeaderboardItem[];
  handleUserClick: (username: string) => void;
}

const getRankStyle = (index: number) => {
  if (index === 0) return { bg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: 'white', size: '28px', icon: '👑' };
  if (index === 1) return { bg: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)', color: 'white', size: '26px', icon: '🥈' };
  if (index === 2) return { bg: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', color: 'white', size: '24px', icon: '🥉' };
  return { bg: 'var(--color-surface-light)', color: 'var(--color-text-secondary)', size: '22px', icon: null };
};

export function LeaderboardTab({
  leaderboardType,
  setLeaderboardType,
  dailyLeaderboard,
  streakLeaderboard,
  handleUserClick
}: LeaderboardTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* daily vs streak toggle */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setLeaderboardType('daily')}
          className={`duo-btn ${leaderboardType === 'daily' ? 'duo-btn-primary' : 'duo-btn-ghost'}`}
          style={{ flex: 1, fontSize: '12px', padding: '8px' }}
        >
          Daily Challenge
        </button>
        <button
          onClick={() => setLeaderboardType('streak')}
          className={`duo-btn ${leaderboardType === 'streak' ? 'duo-btn-primary' : 'duo-btn-ghost'}`}
          style={{ flex: 1, fontSize: '12px', padding: '8px' }}
        >
          Streak League
        </button>
      </div>

      {/* leaderboard lists */}
      {leaderboardType === 'daily' ? (
        dailyLeaderboard.length === 0 ? (
          <EmptyState message="No one has completed today's challenge yet. Be the first!" />
        ) : (
          <div className="flex flex-col gap-2">
            {dailyLeaderboard.map((item, idx) => {
              const style = getRankStyle(idx);
              return (
                <div
                  key={item.username}
                  onClick={() => handleUserClick(item.username)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: '#fff',
                    border: '2px solid rgba(0,0,0,0.06)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    gap: '12px',
                  }}
                >
                  <span style={{
                    width: style.size,
                    height: style.size,
                    background: style.bg,
                    color: style.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontWeight: 900,
                    fontSize: '12px',
                  }}>
                    {style.icon || (idx + 1)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>
                      {item.display_name || item.username}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      @{item.username}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 900, fontSize: '13px', color: 'var(--color-accent-light)' }}>
                    {item.total_attempts} tries
                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      {item.hints_used > 0 ? `${item.hints_used} hints` : 'No hints'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        streakLeaderboard.length === 0 ? (
          <EmptyState message="No active streaks yet!" />
        ) : (
          <div className="flex flex-col gap-2">
            {streakLeaderboard.map((item, idx) => {
              const style = getRankStyle(idx);
              return (
                <div
                  key={item.username}
                  onClick={() => handleUserClick(item.username)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: '#fff',
                    border: '2px solid rgba(0,0,0,0.06)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    gap: '12px',
                  }}
                >
                  <span style={{
                    width: style.size,
                    height: style.size,
                    background: style.bg,
                    color: style.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontWeight: 900,
                    fontSize: '12px',
                  }}>
                    {style.icon || (idx + 1)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>
                      {item.display_name || item.username}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Lvl {item.level} · {item.xp} XP
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 900, fontSize: '15px', color: 'var(--color-flame)' }}>
                    <img src={flameIcon} alt="" style={{ width: 18, height: 18 }} />
                    {item.current_streak}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
