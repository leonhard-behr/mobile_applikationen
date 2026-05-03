// MOCK DATA FOR ACHIEVEMENTS
// WILL BE REPLACED WITH ACTUAL BACKEND CALLED DATA

export interface DayStation {
  id: number;
  date: string;
  dateLabel: string;
  status: 'completed' | 'today' | 'locked';
  attempts?: number;
  word?: string;
  streak: number;
  coordinates?: { word: string; x: number; y: number }[];
}

function formatDateLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

const MOCK_WORDS = [
  'Apfel', 'Brücke', 'Delfin', 'Gitarre', 'Insel',
  'Küche', 'Berg', 'Ozean', 'Klavier', 'Turm',
  'Dorf', 'Garten', 'Kerze', 'Adler', 'Gletscher',
  'Palast', 'Drache', 'Spiegel', 'Rakete', 'Diamant',
];

const MOCK_ATTEMPTS = [
  8, 12, 19, 5, 14, 22, 9, 11, 16, 3,
  10, 21, 7, 13, 17, 6, 15, 11, 18, 9,
];

function generateMockCoordinates(word: string, attempts: number, seed: number): { word: string; x: number; y: number }[] {
  const rng = (s: number) => {
    s = Math.sin(s * 9301 + 49297) * 233280;
    return s - Math.floor(s);
  };
  const guessWords = [
    'stein', 'wasser', 'licht', 'berg', 'wald', 'fluss', 'erde', 'feuer',
    'wind', 'sonne', 'mond', 'stern', 'nacht', 'himmel', 'wolke', 'regen',
    'schnee', 'blume', 'baum', 'meer',
  ];
  const coords: { word: string; x: number; y: number }[] = [];
  const count = Math.min(attempts, guessWords.length);
  for (let i = 0; i < count; i++) {
    const progress = i / Math.max(count - 1, 1);

    const angle = progress * Math.PI * 1.5 + rng(seed + i) * 0.8;
    const radius = (1 - progress) * 3 + rng(seed + i + 100) * 0.5;
    coords.push({
      word: guessWords[(seed + i) % guessWords.length],
      x: Math.round((Math.cos(angle) * radius) * 1000) / 1000,
      y: Math.round((Math.sin(angle) * radius) * 1000) / 1000,
    });
  }

  coords.push({ word, x: 0.05 + rng(seed) * 0.1, y: 0.05 + rng(seed + 50) * 0.1 });
  return coords;
}

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

export function generateMockStations(count: number = 20): DayStation[] {
  const today = new Date();
  const stations: DayStation[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - i));

    const isToday = i === count - 1;
    const isCompleted = !isToday;

    stations.push({
      id: i + 1,
      date: getDateISO(d),
      dateLabel: formatDateLabel(d),
      status: isToday ? 'today' : (isCompleted ? 'completed' : 'locked'),
      attempts: isCompleted ? MOCK_ATTEMPTS[i % MOCK_ATTEMPTS.length] : undefined,
      word: isCompleted ? MOCK_WORDS[i % MOCK_WORDS.length] : undefined,
      streak: isCompleted ? Math.min(i + 1, 20) : 0,
      coordinates: isCompleted
        ? generateMockCoordinates(
          MOCK_WORDS[i % MOCK_WORDS.length],
          MOCK_ATTEMPTS[i % MOCK_ATTEMPTS.length],
          i * 17 + 42,
        )
        : undefined,
    });
  }

  return stations;
}
