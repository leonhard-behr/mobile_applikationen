import { motion } from 'framer-motion';
import lightningIcon from '../assets/lightning.svg';

interface StatsDisplayProps {
  attempts: number;
}

export function StatsDisplay({ attempts }: StatsDisplayProps) {
  const calculateXP = (tries: number) => {
    if (tries < 5) return 1000;
    let xp = 1000;
    for (let i = 5; i <= tries; i++) {
      xp = xp * 0.9;
    }
    return Math.round(xp);
  };

  const xp = calculateXP(attempts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="duo-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '24px 16px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
        className="flex items-center gap-4"
      >
        <img src={lightningIcon} alt="XP" style={{ width: '48px', height: '48px' }} />
        <div className="flex flex-col">
          <span
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1
            }}
          >
            +{xp}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#a78bfa',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: '2px'
            }}
          >
            XP Earned
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
