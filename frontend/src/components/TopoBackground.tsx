import { useMemo } from 'react';
import { contours } from 'd3-contour';
import { geoPath, geoIdentity } from 'd3-geo';

// 
// TOPO BACKGROUND FOR ACHIEVEMENTS AND TUTORIAL
// (see GameTopoBackground.tsx)
// 


function heightAt(ix: number, iy: number, gridW: number, gridH: number): number {
  const nx = ix / gridW;
  const aspect = gridH / gridW;
  const ny = (iy / gridH) * aspect;  // compressed: same spatial frequency as X

  const cx = (nx - 0.5) * 2;
  const edgeHeight = Math.pow(Math.abs(cx), 1.6) * 0.6;

  const ridge =
    Math.sin(ny * 14 + cx * 3) * 0.06 +
    Math.sin(ny * 8 - cx * 5) * 0.04 +
    Math.cos(ny * 22 + cx * 7) * 0.03;

  const fine =
    Math.sin(nx * 30 + ny * 20) * 0.025 +
    Math.cos(nx * 18 - ny * 35) * 0.02 +
    Math.sin(nx * 45 + ny * 12) * 0.015 +
    Math.cos(nx * 12 + ny * 50) * 0.012;

  const breathe = Math.sin(ny * 6) * 0.08;
  const narrowing = edgeHeight * (1 + breathe);

  return Math.max(0, narrowing + ridge + fine + 0.05);
}

const NUM_LEVELS = 12;

const CONTOUR_COLORS = Array(NUM_LEVELS).fill('rgba(0,0,0,0)');

const STROKE_COLORS = Array.from({ length: NUM_LEVELS }, (_, i) => {
  const alpha = i < 3 ? [0.02, 0.04, 0.08][i] : 0.15 + (i - 3) * 0.1;
  return `rgba(0, 0, 0, ${Math.round(alpha * 100) / 100})`;
});

interface TopoBackgroundProps {
  width: number;
  height: number;
}

export function TopoBackground({ width, height }: TopoBackgroundProps) {
  const paths = useMemo(() => {
    if (width <= 0 || height <= 0) return [];

    const gridW = 60;
    const gridH = Math.max(20, Math.round((height / width) * gridW));

    const values = new Float64Array(gridW * gridH);
    for (let j = 0; j < gridH; j++) {
      for (let i = 0; i < gridW; i++) {
        values[j * gridW + i] = heightAt(i, j, gridW, gridH);
      }
    }

    const thresholdCount = CONTOUR_COLORS.length;
    const contourGenerator = contours()
      .size([gridW, gridH])
      .thresholds(thresholdCount);

    const contourData = contourGenerator(values as unknown as number[]);

    const scaleX = width / gridW;
    const pathGenerator = geoPath()
      .projection(
        geoIdentity()
          .scale(scaleX)
          .reflectY(false) as any
      );

    return contourData.map((d, i) => ({
      path: pathGenerator(d) || '',
      fill: CONTOUR_COLORS[Math.min(i, CONTOUR_COLORS.length - 1)],
      stroke: STROKE_COLORS[Math.min(i, STROKE_COLORS.length - 1)],
      value: d.value,
      isMajor: i % 3 === 0,
    }));
  }, [width, height]);

  if (paths.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 1,
        transform: 'scale(1.05)',
        borderRadius: '40px',
      }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {/* contour bands */}
      {paths.map((p, i) => (
        <path
          key={`fill-${i}`}
          d={p.path}
          fill={p.fill}
          stroke="none"
        />
      ))}
      {/* contour lines */}
      {paths.map((p, i) => (
        <path
          key={`line-${i}`}
          d={p.path}
          fill="none"
          stroke={p.stroke}
          strokeWidth={p.isMajor ? 1.2 : 0.6}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
