import { useMemo } from 'react';
import { contours } from 'd3-contour';
import { geoPath, geoIdentity } from 'd3-geo';

// topo background for daily game page
// (see topobackground.tsx)


// THIS SECTION WAS PARTIALLY CREATED WITH GENERATIVE AI
function rankToTemperature(bestRank: number | null): number {
  if (bestRank === null || bestRank <= 0) return 0;
  if (bestRank >= 1000) return 0;
  if (bestRank <= 1) return 1;
  return Math.pow(1 - (bestRank - 1) / 999, 1.5);
}

// THIS SECTION WAS PARTIALLY CREATED WITH GENERATIVE AI
function gameHeight(
  ix: number, iy: number,
  gridW: number, gridH: number,
  freqMultiplier: number,
): number {
  const nx = ix / gridW;
  const aspect = gridH / gridW;
  const ny = (iy / gridH) * aspect;
  const f = freqMultiplier;

  // edge ramp
  const cx = (nx - 0.5) * 2;
  const edge = Math.pow(Math.abs(cx), 1.6) * 0.6;

  // ridgelines
  const ridge =
    Math.sin(ny * 14 * f + cx * 3) * 0.06 +
    Math.sin(ny * 8 * f - cx * 5) * 0.04 +
    Math.cos(ny * 22 * f + cx * 7) * 0.03;

  const fine =
    Math.sin(nx * 30 + ny * 20 * f) * 0.025 +
    Math.cos(nx * 18 - ny * 35 * f) * 0.02 +
    Math.sin(nx * 45 + ny * 12 * f) * 0.015;

  const breathe = Math.sin(ny * 6 * f) * 0.08;

  return Math.max(0, edge * (1 + breathe) + ridge + fine + 0.05);
}

// THIS SECTION WAS PARTIALLY CREATED WITH GENERATIVE AI
function getColors(count: number): { fills: string[]; strokes: string[] } {
  const fills: string[] = [];
  const strokes: string[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0-1 along elevation

    fills.push(`rgba(0, 0, 0, 0)`);

    const strokeAlpha = 0.02 + Math.pow(t, 1.8) * 0.93;
    strokes.push(`rgba(0, 0, 0, ${strokeAlpha.toFixed(3)})`);
  }

  return { fills, strokes };
}

interface GameTopoBackgroundProps {
  bestRank: number | null;
}

export function GameTopoBackground({ bestRank }: GameTopoBackgroundProps) {
  const temp = rankToTemperature(bestRank);

  const { svgContent, viewBox } = useMemo(() => {
    const W = 450;
    const H = 900;
    const gridW = 50;
    const gridH = Math.round((H / W) * gridW);
    const contourCount = 12;

    const freqMultiplier = 0.6 + temp * 1.0;

    const values = new Float64Array(gridW * gridH);
    for (let j = 0; j < gridH; j++) {
      for (let i = 0; i < gridW; i++) {
        values[j * gridW + i] = gameHeight(i, j, gridW, gridH, freqMultiplier);
      }
    }

    const contourGenerator = contours()
      .size([gridW, gridH])
      .thresholds(contourCount);

    const contourData = contourGenerator(values as unknown as number[]);

    const scaleX = W / gridW;
    const pathGenerator = geoPath().projection(
      geoIdentity().scale(scaleX).reflectY(false) as any
    );

    const { fills, strokes } = getColors(contourCount + 1);

    const pathData = contourData.map((d, i) => ({
      path: pathGenerator(d) || '',
      fill: fills[Math.min(i, fills.length - 1)],
      stroke: strokes[Math.min(i, strokes.length - 1)],
      isMajor: i % 3 === 0,
    }));

    return {
      svgContent: pathData,
      viewBox: `0 0 ${W} ${H}`,
    };
  }, [temp]);

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'opacity 0.6s ease',
        opacity: 0.7,
      }}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
    >
      {svgContent.map((p, i) => (
        <path key={`f-${i}`} d={p.path} fill={p.fill} stroke="none" />
      ))}
      {svgContent.map((p, i) => (
        <path
          key={`s-${i}`}
          d={p.path}
          fill="none"
          stroke={p.stroke}
          strokeWidth={p.isMajor ? 1.0 : 0.5}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
