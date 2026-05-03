import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contours } from 'd3-contour';
import { geoPath, geoIdentity } from 'd3-geo';

// STARTUP SCREEN

function splashHeight(ix: number, iy: number, gridW: number, gridH: number): number {
  const nx = ix / gridW;
  const aspect = gridH / gridW;
  const ny = (iy / gridH) * aspect;

  const cx = (nx - 0.5) * 2;
  const edge = Math.pow(Math.abs(cx), 1.3) * 0.7;

  const ridge =
    Math.sin(ny * 10 + cx * 4) * 0.09 +
    Math.sin(ny * 16 - cx * 6) * 0.06 +
    Math.cos(ny * 7 + cx * 2) * 0.07 +
    Math.sin(ny * 24 + cx * 8) * 0.035;

  const fine =
    Math.sin(nx * 25 + ny * 18) * 0.02 +
    Math.cos(nx * 40 - ny * 30) * 0.015;

  const breathe = Math.sin(ny * 4) * 0.1;

  return Math.max(0, edge * (1 + breathe) + ridge + fine + 0.04);
}

const NUM_LEVELS = 14;
const SPLASH_FILLS = Array(NUM_LEVELS).fill('rgba(0,0,0,0)');
const SPLASH_STROKES = Array.from({ length: NUM_LEVELS }, (_, i) => {
  const t = i / (NUM_LEVELS - 1);
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const alpha = Math.max(0.02, ease);
  return `rgba(0, 0, 0, ${Math.round(alpha * 100) / 100})`;
});

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [dismissed, setDismissed] = useState(false);

  const W = 450;
  const H = 900;

  const paths = useMemo(() => {
    const gridW = 60;
    const gridH = Math.round((H / W) * gridW);

    const values = new Float64Array(gridW * gridH);
    for (let j = 0; j < gridH; j++) {
      for (let i = 0; i < gridW; i++) {
        values[j * gridW + i] = splashHeight(i, j, gridW, gridH);
      }
    }

    const contourGenerator = contours()
      .size([gridW, gridH])
      .thresholds(SPLASH_FILLS.length);

    const contourData = contourGenerator(values as unknown as number[]);

    const scaleX = W / gridW;
    const pathGenerator = geoPath().projection(
      geoIdentity().scale(scaleX).reflectY(false) as any
    );

    return contourData.map((d, i) => ({
      path: pathGenerator(d) || '',
      fill: SPLASH_FILLS[Math.min(i, SPLASH_FILLS.length - 1)],
      stroke: SPLASH_STROKES[Math.min(i, SPLASH_STROKES.length - 1)],
      isMajor: i % 3 === 0,
    }));
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(onDismiss, 600);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          animate={dismissed ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1000,
            cursor: 'pointer',
            background: '#fdfdfd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '20px',
          }}
        >
          {/* topo backgrojnd */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0.85,
            }}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid slice"
          >
            {paths.map((p, i) => (
              <path key={`f-${i}`} d={p.path} fill={p.fill} stroke="none" />
            ))}
            {paths.map((p, i) => (
              <path
                key={`s-${i}`}
                d={p.path}
                fill="none"
                stroke={p.stroke}
                strokeWidth={p.isMajor ? 1.5 : 0.8}
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {/* gradient for text contrast */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(253, 253, 253, 0.4) 0%, rgba(253, 253, 253, 0.85) 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            style={{
              position: 'relative',
              zIndex: 2,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0px',
            }}
          >
            <h1
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: '90px',
                lineHeight: 0.85,
                letterSpacing: '-0.03em',
                color: '#1c1c24',
                textTransform: 'uppercase',
                margin: 0,
                textShadow: '0 4px 30px rgba(139, 92, 246, 0.15)',
                transform: 'scaleY(1.15)',
              }}
            >
              Vector
              <br />
              Valley
            </h1>

            {/* subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#5a5a6a',
                marginTop: '25px',
              }}
            >
              Find the word by meaning
            </motion.p>
          </motion.div>

          {/* "tap to start" hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.3] }}
            transition={{ delay: 0.5, duration: 1, repeat: Infinity, repeatType: 'loop' }}
            style={{
              position: 'absolute',
              bottom: '60px',
              fontFamily: "'Nunito', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#8b8b9a',
            }}
          >
            Tap to start
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
