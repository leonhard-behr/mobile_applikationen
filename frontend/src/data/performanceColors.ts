function performanceHue(attempts: number): number {
  const a = Math.max(1, Math.min(attempts, 20));
  if (a <= 3) return 140;
  if (a <= 8) {
    const t = (a - 3) / (8 - 3);
    return 140 - t * (140 - 55);
  }
  const t = Math.min((a - 8) / (15 - 8), 1);
  return 55 - t * 55;
}

export function getPerformanceColor(attempts: number): string {
  return `hsl(${Math.round(performanceHue(attempts))}, 80%, 60%)`;
}

export function getPerformanceShadow(attempts: number): string {
  return `hsl(${Math.round(performanceHue(attempts))}, 70%, 35%)`;
}

export function getPerformanceTint(attempts: number, alpha: number = 0.08): string {
  const h = Math.round(performanceHue(attempts));
  return `hsla(${h}, 80%, 55%, ${alpha})`;
}
