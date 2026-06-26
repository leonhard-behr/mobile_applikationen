import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, MotionValue } from 'framer-motion';
import type { PublicProfileResponse } from '../../api';
import flameIcon from '../../assets/flame.svg';
import lightningIcon from '../../assets/lightning.svg';
import crownIcon from '../../assets/crown.svg';
import medalIcon from '../../assets/gold_medal.svg';

interface ProfileSheetProps {
  selectedProfile: PublicProfileResponse | null;
  setSelectedProfile: (p: PublicProfileResponse | null) => void;
  dragControls: ReturnType<typeof useDragControls>;
  sheetY: MotionValue<number>;
}

function ProfileStatCard({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <div style={{
      background: '#fdfdfd',
      border: '2px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '12px',
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    }}>
      <img src={icon} alt="" style={{ width: '26px', height: '26px', flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ fontSize: '18px', fontWeight: 900, color: '#1c1c24', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#5a5a6a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export function ProfileSheet({
  selectedProfile,
  setSelectedProfile,
  dragControls,
  sheetY
}: ProfileSheetProps) {
  return createPortal(
    <AnimatePresence>
      {selectedProfile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedProfile(null)}
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
                setSelectedProfile(null);
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

            {/* profile header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 900,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}>
                {selectedProfile.display_name || selectedProfile.username}
              </h2>
              <p style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginTop: '2px',
              }}>
                @{selectedProfile.username}
              </p>
            </div>

            {/* stat grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '20px',
            }}>
              <ProfileStatCard icon={flameIcon} value={selectedProfile.current_streak} label="Current Streak" />
              <ProfileStatCard icon={medalIcon} value={selectedProfile.best_streak} label="Best Streak" />
              <ProfileStatCard icon={lightningIcon} value={selectedProfile.xp} label={`Level ${selectedProfile.level}`} />
              <ProfileStatCard icon={crownIcon} value={selectedProfile.total_games} label="Games Played" />
            </div>

            {/* achievements list */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                Unlocked Achievements ({selectedProfile.achievements.length})
              </h3>
              {selectedProfile.achievements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600 }}>
                  No achievements unlocked yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedProfile.achievements.map((ach: any) => (
                    <div
                      key={ach.key}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--color-surface-light)',
                        borderRadius: '10px',
                        border: '1.5px solid rgba(0,0,0,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>⭐</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                          {ach.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          {ach.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* close button */}
            <motion.button
              onClick={() => setSelectedProfile(null)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="duo-btn duo-btn-ghost w-full"
              style={{ fontSize: '14px' }}
            >
              Close Profile
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById('root')!
  );
}
