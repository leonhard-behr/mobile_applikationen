import { motion } from 'framer-motion';
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import type { Coordinate } from '../api';

interface VictoryMapProps {
  coordinates: Coordinate[];
  totalAttempts: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          {data.word}
        </p>
      </div>
    );
  }
  return null;
}

function CustomDot(props: any) {
  const { cx, cy, payload, index, totalPoints } = props;
  const isLast = index === totalPoints - 1;
  const isFirst = index === 0;

  if (isLast) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill="#4ade80" stroke="#fff" strokeWidth={2.5} opacity={0.9} />
        <text x={cx} y={cy - 16} textAnchor="middle" fill="#4ade80" fontSize={12} fontWeight={800} fontFamily="Nunito, sans-serif">
          {payload.word}
        </text>
      </g>
    );
  }

  if (isFirst) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="#8b5cf6" stroke="#fff" strokeWidth={2} opacity={0.85} />
        <text x={cx} y={cy - 13} textAnchor="middle" fill="#a78bfa" fontSize={11} fontWeight={700} fontFamily="Nunito, sans-serif">
          {payload.word}
        </text>
      </g>
    );
  }

  const progress = index / (totalPoints - 1);
  const r = 3.5 + progress * 2.5;
  const opacity = 0.4 + progress * 0.5;

  return (
    <circle cx={cx} cy={cy} r={r} fill="#8b5cf6" opacity={opacity} />
  );
}

export function VictoryMap({ coordinates, totalAttempts, title, subtitle, compact }: VictoryMapProps) {
  const data = coordinates.map((c, i) => ({
    ...c,
    index: i,
  }));

  const displayTitle = title ?? 'You found it!';
  const displaySubtitle = subtitle ?? `Solved in ${totalAttempts} attempts`;

  return (
    <motion.div
      initial={{ opacity: 0, y: compact ? 10 : 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: compact ? 0.4 : 0.8, ease: 'easeOut' }}
      className="w-full flex flex-col items-center gap-5"
    >
      {/* title */}
      {!compact && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
          className="text-center"
        >
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: 'var(--color-success)',
              marginBottom: '4px',
            }}
          >
            {displayTitle}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            {displaySubtitle}
          </p>
        </motion.div>
      )}

      {/* scatter plot */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="duo-card w-full"
        style={{ height: 320, padding: '16px' }}
      >
        <p
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Your semantic journey
        </p>
        <ResponsiveContainer width="100%" height="88%">
          <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
            <XAxis dataKey="x" type="number" hide />
            <YAxis dataKey="y" type="number" hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            {/* path line */}
            <Line
              type="monotone"
              dataKey="y"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              opacity={0.35}
            />
            {/* scatter dots */}
            <Scatter
              dataKey="y"
              fill="#8b5cf6"
              shape={(props: any) => (
                <CustomDot {...props} totalPoints={data.length} />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      {/* legend */}
      <div className="flex items-center gap-6" style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 700 }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-accent)' }} />
          <span>Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-success)' }} />
          <span>Target</span>
        </div>
      </div>
    </motion.div>
  );
}
