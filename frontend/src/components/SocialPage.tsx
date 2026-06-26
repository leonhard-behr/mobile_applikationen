// THIS FILE WAS PARTIALLY CREATED WITH GENERATIVE AI
// CLAUDE OPUS 4.6 (Thinking)
// GEMINI 3.1 PRO (High)

import { useState, useEffect } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import {
  socialApi,
  statsApi as originalStatsApi,
  type DailyLeaderboardItem,
  type StreakLeaderboardItem,
  type FriendListItem,
  type PendingIncomingRequest,
  type PendingOutgoingRequest,
  type FeedItem,
  type PublicProfileResponse,
} from '../api';

import { LeaderboardTab } from './social/LeaderboardTab';
import { FriendsTab } from './social/FriendsTab';
import { FeedTab } from './social/FeedTab';
import { ProfileSheet } from './social/ProfileSheet';

type SocialTab = 'leaderboard' | 'friends' | 'feed';

export function SocialPage() {
  const [activeTab, setActiveTab] = useState<SocialTab>('leaderboard');
  const [leaderboardType, setLeaderboardType] = useState<'daily' | 'streak'>('daily');
  const [dailyLeaderboard, setDailyLeaderboard] = useState<DailyLeaderboardItem[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<StreakLeaderboardItem[]>([]);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [incoming, setIncoming] = useState<PendingIncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<PendingOutgoingRequest[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchStatus, setSearchStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; message: string }>({ type: null, message: '' });

  const [selectedProfile, setSelectedProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // bottom sheet state for profile view
  const dragControls = useDragControls();
  const sheetY = useMotionValue(0);

  // Initial load
  useEffect(() => {
    loadTabData();
  }, [activeTab, leaderboardType]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'leaderboard') {
        if (leaderboardType === 'daily') {
          await originalStatsApi.profile().catch(() => null);
          await originalStatsApi.journey(1).catch(() => ({ stations: [] }));
          const dateStr = new Date().toISOString().split('T')[0];
          const res = await socialApi.getDailyLeaderboard(dateStr);
          setDailyLeaderboard(res);
        } else {
          const res = await socialApi.getStreakLeaderboard();
          setStreakLeaderboard(res);
        }
      } else if (activeTab === 'friends') {
        const [friendsList, incomingList, outgoingList] = await Promise.all([
          socialApi.getFriends(),
          socialApi.getIncoming(),
          socialApi.getOutgoing(),
        ]);
        setFriends(friendsList);
        setIncoming(incomingList);
        setOutgoing(outgoingList);
      } else if (activeTab === 'feed') {
        const res = await socialApi.getFeed();
        setFeed(res);
      }
    } catch (err) {
      console.error('Failed to load social tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setSearchStatus({ type: 'loading', message: 'Sending request...' });
    try {
      const data = await socialApi.sendRequest(searchUsername.trim());

      setSearchStatus({ type: 'success', message: data.message || 'Friend request sent!' });
      setSearchUsername('');
      // Reload outgoing list
      const updatedOutgoing = await socialApi.getOutgoing();
      setOutgoing(updatedOutgoing);

      setTimeout(() => {
        setSearchStatus({ type: null, message: '' });
      }, 4000);
    } catch (err: any) {
      setSearchStatus({ type: 'error', message: err.message || 'Error occurred.' });
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await socialApi.acceptRequest(requestId);
      loadTabData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await socialApi.declineRequest(requestId);
      loadTabData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnfriend = async (friendUsername: string) => {
    if (!window.confirm(`Are you sure you want to remove ${friendUsername} as a friend?`)) return;
    try {
      await socialApi.unfriend(friendUsername);
      loadTabData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserClick = async (username: string) => {
    try {
      const data = await socialApi.getProfile(username);
      setSelectedProfile(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Could not fetch public profile.');
    }
  };

  return (
    <div className="w-full max-w-[450px] flex flex-col flex-1 relative px-4 py-6" style={{ paddingBottom: '110px' }}>
      {/* title */}
      <h1 style={{
        fontSize: '28px',
        fontWeight: 900,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em',
        textAlign: 'center',
        margin: '0 0 20px 0',
      }}>
        Social Hub
      </h1>

      {/* tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--color-surface-light)',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '20px',
        border: '1.5px solid rgba(0,0,0,0.05)',
      }}>
        {(['leaderboard', 'friends', 'feed'] as SocialTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: '9px',
              fontWeight: 800,
              fontSize: '13px',
              textTransform: 'capitalize',
              cursor: 'pointer',
              background: activeTab === tab ? 'var(--color-bg)' : 'transparent',
              color: activeTab === tab ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              boxShadow: activeTab === tab ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* content wrapper with loading overlay */}
      <div className="flex-1 flex flex-col relative" style={{ minHeight: '300px' }}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent">
            <div style={{
              width: 38,
              height: 38,
              border: '3px solid var(--color-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '12px',
            }} />
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Loading...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {activeTab === 'leaderboard' && (
              <LeaderboardTab
                leaderboardType={leaderboardType}
                setLeaderboardType={setLeaderboardType}
                dailyLeaderboard={dailyLeaderboard}
                streakLeaderboard={streakLeaderboard}
                handleUserClick={handleUserClick}
              />
            )}

            {activeTab === 'friends' && (
              <FriendsTab
                friends={friends}
                incoming={incoming}
                outgoing={outgoing}
                searchUsername={searchUsername}
                setSearchUsername={setSearchUsername}
                searchStatus={searchStatus}
                handleSendFriendRequest={handleSendFriendRequest}
                handleAcceptRequest={handleAcceptRequest}
                handleDeclineRequest={handleDeclineRequest}
                handleUnfriend={handleUnfriend}
                handleUserClick={handleUserClick}
              />
            )}

            {activeTab === 'feed' && (
              <FeedTab
                feed={feed}
                handleUserClick={handleUserClick}
              />
            )}
          </motion.div>
        )}
      </div>

      <ProfileSheet
        selectedProfile={selectedProfile}
        setSelectedProfile={setSelectedProfile}
        dragControls={dragControls}
        sheetY={sheetY}
      />
    </div>
  );
}
