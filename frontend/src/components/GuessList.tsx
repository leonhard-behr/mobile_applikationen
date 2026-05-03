import { motion, AnimatePresence } from 'framer-motion';
import type { GuessEntry } from '../hooks/useGame';

interface GuessListProps {
  guesses: GuessEntry[];
  anchorWord: string;
}

function getSimilarityColor(sim: number, rank: number | null): string {
  if (rank === 0) return '#4ade80';
  if (rank !== null && rank <= 10) return '#4ade80';
  if (rank !== null && rank <= 50) return '#a3e635';
  if (rank !== null && rank <= 200) return '#fbbf24';
  if (rank !== null && rank <= 1000) return '#fb923c';
  if (sim >= 50) return '#f87171';
  return 'var(--color-text-muted)';
}

function getSimilarityBg(rank: number | null): string {
  if (rank === 0) return 'rgba(74, 222, 128, 0.12)';
  if (rank !== null && rank <= 10) return 'rgba(74, 222, 128, 0.10)';
  if (rank !== null && rank <= 50) return 'rgba(163, 230, 53, 0.08)';
  if (rank !== null && rank <= 200) return 'rgba(251, 191, 36, 0.08)';
  if (rank !== null && rank <= 1000) return 'rgba(251, 146, 60, 0.06)';
  return 'rgba(123, 111, 173, 0.06)';
}

export function GuessList({ guesses, anchorWord }: GuessListProps) {
  const sorted = [...guesses].reverse();

  return (
    <div
      className="flex flex-col gap-2.5 w-full overflow-y-auto pr-1 pb-2"
      style={{ maxHeight: '52vh' }}
    >
      <AnimatePresence initial={false}>
        {sorted.map((entry, i) => {
          const isAnchor = entry.word === anchorWord && i === sorted.length - 1;
          const color = getSimilarityColor(entry.scaled_similarity, entry.rank);
          const bg = getSimilarityBg(entry.rank);

          return (
            <motion.div
              key={entry.word}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                border: '1.5px solid var(--color-border)',
                backgroundColor: bg,
                boxShadow: entry.is_correct
                  ? '0 0 16px rgba(74, 222, 128, 0.15)'
                  : '0 2px 0 rgba(0,0,0,0.12)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isAnchor && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-bg-soft)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    anchor
                  </span>
                )}
                {entry.is_correct && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: 'var(--color-success)',
                      background: 'rgba(74, 222, 128, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    correct
                  </span>
                )}
                <span
                  className="truncate"
                  style={{
                    fontWeight: 700,
                    color: entry.is_correct ? 'var(--color-success)' : 'var(--color-text-primary)',
                    fontSize: '15px',
                  }}
                >
                  {entry.word}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-3">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: 900,
                    color,
                    background: bg,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${color}33`,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {entry.rank}
                </motion.span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
