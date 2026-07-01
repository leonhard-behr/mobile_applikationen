import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import { VictoryMap } from './VictoryMap';
import { TopoBackground } from './TopoBackground';
import { statsApi, api, type JourneyStation, type ProfileStats, type Coordinate } from '../api';
import {
  getPerformanceColor,
  getPerformanceShadow,
} from '../data/performanceColors';

import flameIcon from '../assets/flame.svg';
import lightningIcon from '../assets/lightning.svg';
import crownIcon from '../assets/crown.svg';
import medalIcon from '../assets/gold_medal.svg';

// sine wave offsets
function getPathOffset(index: number): number {
  const amplitude = 55;
  return Math.sin((index * Math.PI) / 2) * amplitude;
}

// icon
function StationIcon({ status }: { status: string }) {
  if (status === 'today') {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }

  if (status === 'locked' || status === 'missed') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  // completed
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// performance labels
function getPerformanceLabel(attempts: number): string {
  if (attempts <= 2) return 'Perfect!';
  if (attempts <= 4) return 'Amazing';
  if (attempts <= 7) return 'Great';
  if (attempts <= 10) return 'Good';
  if (attempts <= 13) return 'Okay';
  return 'Tough';
}

interface SelectedStation {
  station: JourneyStation;
  coordinates: Coordinate[];
}

export function AchievementsPage() {
  const [stations, setStations] = useState<JourneyStation[]>([]);
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedStation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const pathContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 360, h: 2400 });
  const dragControls = useDragControls();
  const sheetY = useMotionValue(0);

  // Fetch journey + profile from server
  useEffect(() => {
    (async () => {
      try {
        const [journeyData, profileData] = await Promise.all([
          statsApi.journey(30),
          statsApi.profile(),
        ]);
        setStations(journeyData.stations);
        setProfile(profileData);
      } catch (err) {
        console.error('Failed to load journey data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // scroll today's station into view
  useEffect(() => {
    if (stations.length === 0) return;
    const raf = requestAnimationFrame(() => {
      todayRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [stations]);

  // measuring container for topo background
  useEffect(() => {
    if (pathContainerRef.current) {
      const { offsetWidth, offsetHeight } = pathContainerRef.current;
      if (offsetWidth > 0 && offsetHeight > 0) {
        setContainerSize({ w: offsetWidth, h: offsetHeight });
      }
    }
  }, [stations]);

  // handles clicking a completed station: fetches pca coordinates
  const handleStationClick = async (station: JourneyStation) => {
    if (station.status !== 'completed' || !station.word) return;
    try {
      const res = await api.victoryByDay(station.date);
      setSelected({ station, coordinates: res.coordinates });
    } catch (err) {
      console.error('Failed to load station details:', err);
      // fallback to showing details without victory map if request fails
      setSelected({ station, coordinates: [] });
    }
  };

  const completed = stations.filter((s) => s.status === 'completed');
  const perfectCount = completed.filter((s) => s.attempts !== null && s.attempts <= 3).length;

  if (loading) {
    return (
      <div className="w-full max-w-[450px] flex items-center justify-center flex-1">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid var(--color-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            Loading journey…
          </p>
        </motion.div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[450px] flex flex-col flex-1 relative">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '32px 20px 16px', textAlign: 'center' }}
      >
        <h1 style={{
          fontSize: '28px',
          fontWeight: 900,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
          paddingBottom: '10px'
        }}>
          Your Journey
        </h1>
      </motion.div>

      {/* stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          padding: '0 20px',
          marginBottom: '100px',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <StatCard icon={flameIcon} value={profile?.current_streak ?? 0} label="Day streak" />
        <StatCard icon={lightningIcon} value={profile?.xp ?? 0} label="Total XP" />
        <StatCard icon={crownIcon} value={profile?.avg_attempts ?? 0} label="Avg. tries" />
        <StatCard icon={medalIcon} value={profile?.perfect_games ?? perfectCount} label="Perfect days" />
      </motion.div>

      {/* station path */}
      <div
        ref={scrollRef}
        className="w-full"
        style={{ paddingBottom: '20px' }}
      >
        <div
          ref={pathContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '360px',
            margin: '0 auto',
            padding: '0px 0 80px',
          }}
        >
          {/* topo map background */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <TopoBackground width={containerSize.w} height={containerSize.h} />
            {/* gradient from topo to background at the top */}
            <div style={{
              position: 'absolute',
              top: -80,
              left: -300,
              right: -300,
              height: '300px',
              background: 'linear-gradient(180deg, #fdfdfd 0%, #fdfdfd00 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }} />
          </div>
          {stations.map((station, i) => {
            const offset = getPathOffset(i);
            const nextOffset = i < stations.length - 1 ? getPathOffset(i + 1) : offset;
            const color = station.status === 'completed' && station.attempts !== null
              ? getPerformanceColor(station.attempts)
              : station.status === 'today'
                ? 'var(--color-accent-light)'
                : 'var(--color-station-locked)';
            const shadowColor = station.status === 'completed' && station.attempts !== null
              ? getPerformanceShadow(station.attempts)
              : station.status === 'today'
                ? 'var(--color-accent-dim)'
                : 'rgba(0,0,0,0.25)';



            return (
              <motion.div
                key={station.id}
                ref={station.status === 'today' ? todayRef : undefined}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.03 * i, duration: 0.4, ease: 'easeOut' }}
                style={{ position: 'relative' }}
              >
                {/* svg curved connector */}
                {i < stations.length - 1 && (() => {
                  const delta = nextOffset - offset;
                  return (
                    <svg
                      style={{
                        position: 'absolute',
                        top: '0',
                        left: '50%',
                        transform: `translateX(calc(-50% + ${offset}px))`,
                        width: '240px',
                        height: '120px',
                        overflow: 'visible',
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                      viewBox="-120 0 240 120"
                    >
                      <path
                        d={`M 0 36 C 0 70, ${delta} 50, ${delta} 120`}
                        fill="none"
                        stroke={
                          station.status === 'completed'
                            ? color
                            : 'var(--color-station-locked)'
                        }
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={station.status === 'completed' ? 'none' : '6 8'}
                        opacity={station.status === 'completed' ? 0.35 : 0.15}
                      />
                    </svg>
                  );
                })()}



                {/* station node */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 2,
                  transform: `translateX(${offset}px)`,
                  transition: 'transform 0.4s ease',
                  height: '120px',
                  justifyContent: 'flex-start',
                  paddingTop: '0',
                }}>
                  {/* circle */}
                  <motion.div
                    onClick={() => handleStationClick(station)}
                    whileHover={station.status !== 'locked' && station.status !== 'missed' ? { scale: 1.12, y: -2 } : undefined}
                    whileTap={station.status !== 'locked' && station.status !== 'missed' ? { scale: 0.95, y: 2 } : undefined}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: station.status === 'completed' ? 'pointer' : 'default',
                      position: 'relative',
                      background: station.status === 'today'
                        ? 'var(--color-bg)'
                        : color,
                      border: station.status === 'today'
                        ? `3.5px solid ${color}`
                        : 'none',
                      color: station.status === 'locked' || station.status === 'missed'
                        ? 'var(--color-text-muted)'
                        : 'white',
                      boxShadow: station.status === 'today'
                        ? `0 4px 0 rgba(139, 92, 246, 0.35), 0 0 24px var(--color-accent-glow)`
                        : station.status === 'completed'
                          ? `0 5px 0 ${shadowColor}`
                          : '0 4px 0 rgba(0,0,0,0.2)',
                      opacity: station.status === 'locked' || station.status === 'missed' ? 0.45 : 1,
                      transition: 'box-shadow 0.3s ease',
                    }}
                  >
                    {/* pulse ring for current day */}
                    {station.status === 'today' && (
                      <motion.div
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          inset: '-6px',
                          borderRadius: '50%',
                          border: '2px solid var(--color-accent-light)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    <StationIcon status={station.status} />
                  </motion.div>

                  {/* label */}
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: station.status === 'today'
                        ? 'var(--color-accent-light)'
                        : 'var(--color-text-primary)',
                    }}>
                      {station.date_label}
                    </div>

                    {station.status === 'completed' && station.word && station.attempts !== null && (
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color,
                        marginTop: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}>
                        <span style={{ opacity: 0.7 }}>
                          {getPerformanceLabel(station.attempts)}
                        </span>
                        <span style={{ opacity: 0.5 }}>·</span>
                        <span style={{ opacity: 0.6 }}>
                          {station.attempts} {station.attempts === 1 ? 'try' : 'tries'}
                        </span>
                      </div>
                    )}

                    {station.status === 'today' && (
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-accent-light)',
                        marginTop: '1px',
                      }}>
                        Today's challenge
                      </div>
                    )}

                    {station.status === 'missed' && (
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-muted)',
                        marginTop: '1px',
                      }}>
                        Missed
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>



      {/* detail sheet */}
      {
        createPortal(
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelected(null)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 100,
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  drag="y"
                  dragControls={dragControls}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  style={{
                    width: '100%',
                    maxWidth: '450px',
                    background: 'var(--color-bg)',
                    borderTopLeftRadius: 'var(--radius-xl)',
                    borderTopRightRadius: 'var(--radius-xl)',
                    padding: '24px 20px 40px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    y: sheetY,
                  }}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 500) {
                      setSelected(null);
                    }
                  }}
                >
                  {/* drag handle */}
                  <div
                    onPointerDown={(e) => dragControls.start(e)}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '8px 0 16px',
                      margin: '-8px 0 0',
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '4px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-surface-light)',
                    }} />
                  </div>

                  {/* header */}
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      color: 'var(--color-text-primary)',
                      margin: 0,
                    }}>
                      {selected.station.date_label} — {selected.station.word}
                    </h2>
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: selected.station.attempts !== null
                        ? getPerformanceColor(selected.station.attempts)
                        : 'var(--color-text-secondary)',
                      marginTop: '4px',
                    }}>
                      {selected.station.attempts !== null
                        ? `${getPerformanceLabel(selected.station.attempts)} · ${selected.station.attempts} ${selected.station.attempts === 1 ? 'try' : 'tries'}`
                        : ''}
                    </p>
                  </div>

                  {selected.coordinates.length > 0 && (
                    <VictoryMap
                      coordinates={selected.coordinates}
                      totalAttempts={selected.station.attempts ?? 0}
                      compact
                    />
                  )}

                  {selected.coordinates.length === 0 && (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}>
                      <p style={{ marginBottom: '8px' }}>
                        Solved in {selected.station.attempts} {selected.station.attempts === 1 ? 'guess' : 'guesses'}
                      </p>
                      {selected.station.hints_used > 0 && (
                        <p style={{ opacity: 0.7 }}>
                          Used {selected.station.hints_used} hint{selected.station.hints_used !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* close button */}
                  <motion.button
                    onClick={() => setSelected(null)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="duo-btn duo-btn-ghost w-full"
                    style={{ marginTop: '16px', fontSize: '14px' }}
                  >
                    Close
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.getElementById('root')!
        )
      }
    </div >
  );
}

function StatCard({ icon, value, label }: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div style={{
      background: '#fdfdfd',
      border: '2px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      {/* icon */}
      <img
        src={icon}
        alt=""
        style={{ width: '32px', height: '32px', flexShrink: 0 }}

      />
      {/* text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
        <div style={{
          fontSize: '22px',
          fontWeight: 900,
          color: '#1c1c24',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>
          {value.toLocaleString()}
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#5a5a6a',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}
