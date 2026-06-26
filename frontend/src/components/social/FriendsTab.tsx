import type { FriendListItem, PendingIncomingRequest, PendingOutgoingRequest } from '../../api';
import { EmptyState } from './EmptyState';
import flameIcon from '../../assets/flame.svg';

interface FriendsTabProps {
  friends: FriendListItem[];
  incoming: PendingIncomingRequest[];
  outgoing: PendingOutgoingRequest[];
  searchUsername: string;
  setSearchUsername: (v: string) => void;
  searchStatus: { type: 'success' | 'error' | 'loading' | null; message: string };
  handleSendFriendRequest: (e: React.FormEvent) => void;
  handleAcceptRequest: (requestId: string) => void;
  handleDeclineRequest: (requestId: string) => void;
  handleUnfriend: (username: string) => void;
  handleUserClick: (username: string) => void;
}

export function FriendsTab({
  friends,
  incoming,
  searchUsername,
  setSearchUsername,
  searchStatus,
  handleSendFriendRequest,
  handleAcceptRequest,
  handleDeclineRequest,
  handleUnfriend,
  handleUserClick
}: FriendsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* add friend form */}
      <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Add friend by username..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            className="duo-input"
            style={{ flex: 1, margin: 0 }}
          />
          <button type="submit" className="duo-btn duo-btn-primary" style={{ padding: '0 18px' }}>
            Add
          </button>
        </div>
        {searchStatus.type && (
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 10px',
            borderRadius: '8px',
            background: searchStatus.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : searchStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
            color: searchStatus.type === 'error' ? '#ef4444' : searchStatus.type === 'success' ? '#10b981' : 'var(--color-text-secondary)',
          }}>
            {searchStatus.message}
          </div>
        )}
      </form>

      {/* pending incoming requests */}
      {incoming.length > 0 && (
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Friend Requests ({incoming.length})
          </h3>
          <div className="flex flex-col gap-2">
            {incoming.map((req) => (
              <div
                key={req.request_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1.5px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '12px',
                  gap: '10px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '13px' }}>{req.display_name || req.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>@{req.username}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleAcceptRequest(req.request_id)}
                    className="duo-btn duo-btn-primary"
                    style={{ padding: '4px 10px', fontSize: '11px', minHeight: '30px' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.request_id)}
                    className="duo-btn duo-btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '11px', minHeight: '30px' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* friends list */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
          Your Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <EmptyState message="You haven't added any friends yet. Invite them by typing their username above!" />
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: '#fff',
                  border: '2px solid rgba(0,0,0,0.06)',
                  borderRadius: '14px',
                  gap: '12px',
                }}
              >
                <div
                  onClick={() => handleUserClick(friend.username)}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '14px' }}>
                    {friend.display_name || friend.username}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Lvl {friend.level} · {friend.xp} XP
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, fontSize: '13px', color: 'var(--color-flame)' }}>
                    <img src={flameIcon} alt="" style={{ width: 16, height: 16 }} />
                    {friend.current_streak}
                  </div>
                  <button
                    onClick={() => handleUnfriend(friend.username)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'rgba(239, 68, 68, 0.7)',
                    }}
                    title="Unfriend"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
