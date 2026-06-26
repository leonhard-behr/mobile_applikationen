import type { FeedItem } from '../../api';
import { EmptyState } from './EmptyState';

interface FeedTabProps {
  feed: FeedItem[];
  handleUserClick: (username: string) => void;
}

export function FeedTab({ feed, handleUserClick }: FeedTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {feed.length === 0 ? (
        <EmptyState message="No recent activity from your friends. Try playing and encouraging them!" />
      ) : (
        feed.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px',
              background: '#fff',
              border: '2px solid rgba(0,0,0,0.06)',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                onClick={() => handleUserClick(item.username)}
                style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-accent-light)', cursor: 'pointer' }}
              >
                {item.display_name || item.username}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {item.completed_at ? new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Completed the Daily Challenge in <span style={{ fontWeight: 800, color: 'var(--color-success)' }}>{item.total_attempts}</span> guesses!
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', gap: '8px' }}>
              <span>Word: {item.target_word}</span>
              <span>•</span>
              <span>{item.hints_used} hints used</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
