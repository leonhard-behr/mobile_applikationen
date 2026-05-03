import { motion } from 'framer-motion';
import clueIcon from '../assets/clue.svg';
import type { HintEntry } from '../hooks/useGame';

interface HintButtonProps {
  onRequestHint: () => void;
  hints: HintEntry[];
  hintsUsed: number;
  maxHints: number;
  disabled: boolean;
}

const HINT_LABELS = ['Far clue', 'Closer clue', 'Near clue'];
const HINT_COLORS = ['#f59e0b', '#fb923c', '#ef4444'];

export function HintButton({ onRequestHint, hints, hintsUsed, maxHints, disabled }: HintButtonProps) {
  const allUsed = hintsUsed >= maxHints;

  return (
    <div className="flex flex-col gap-3 w-full items-center">
      {/* already revealed hints */}
      {hints.map((hint, i) => (
        <motion.div
          key={hint.hint_number}
          initial={{ opacity: 0, scale: 0.9, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            background: `${HINT_COLORS[i]}0D`,
            border: `1.5px solid ${HINT_COLORS[i]}33`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
          }}
        >
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0,
            minWidth: 70,
          }}>
            {HINT_LABELS[i]}
          </span>
          <span style={{
            fontWeight: 800,
            fontSize: '15px',
            color: HINT_COLORS[i],
            letterSpacing: '0.02em',
          }}>
            {hint.word}
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            opacity: 0.6,
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            #{hint.rank}
          </span>
        </motion.div>
      ))}

      {/* hint request button if more hints available */}
      {!allUsed && (
        <motion.button
          id="hint-button"
          onClick={onRequestHint}
          disabled={disabled}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            background: 'transparent',
            border: '2px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.3 : 1,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <img src={clueIcon} alt="clue" style={{ width: '18px', height: '18px' }} />
            <span>Show clue {hintsUsed + 1}/{maxHints}</span>
            <span style={{ opacity: 0.5 }}>(+1 attempt)</span>
          </span>
        </motion.button>
      )}
    </div>
  );
}
