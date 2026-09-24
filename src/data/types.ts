export type SleepStage = 'awake' | 'light' | 'deep' | 'rem';

export interface SleepSegment {
  stage: SleepStage;
  /** Minutes from the moment the member got into bed. */
  start: number;
  end: number;
}

export interface SleepNeed {
  baseline: number;
  strain: number;
  debt: number;
  naps: number;
}

export interface Sleep {
  /** Epoch ms. */
  start: number;
  end: number;
  inBed: number;
  stages: Record<SleepStage, number>;
  hypnogram: SleepSegment[];
  need: SleepNeed;
  needTotal: number;
  performance: number;
  efficiency: number;
  consistency: number;
  respiratoryRate: number;
  disturbances: number;
  latency: number;
}

export type ActivityKind =
  | 'running'
  | 'cycling'
  | 'strength'
  | 'functional'
  | 'yoga'
  | 'walking'
  | 'swimming'
  | 'tennis'
  | 'hiking'
  | 'rowing';

export type ActivitySource = 'auto' | 'manual' | 'live';

export interface Activity {
  id: string;
  kind: ActivityKind;
  /** Epoch ms. */
  start: number;
  end: number;
  strain: number;
  load: number;
  avgHr: number;
  maxHr: number;
  calories: number;
  steps: number;
  /** Minutes spent in HR zones 0–5. */
  zones: number[];
  /** Heart rate, one sample per minute. */
  hr: number[];
  distanceKm?: number;
  source: ActivitySource;
}

export interface Day {
  /** Local date, YYYY-MM-DD. The sleep that ended this morning belongs to this day. */
  key: string;
  isToday: boolean;
  sleep: Sleep;
  recovery: number;
  hrv: number;
  rhr: number;
  respiratoryRate: number;
  spo2: number;
  skinTemp: number;
  optimalStrain: [number, number];
  /** Cardiovascular load from general movement outside of tracked activities. */
  baseLoad: number;
  baseCalories: number;
  baseSteps: number;
  /** Heart rate every 5 minutes from local midnight; null = not yet recorded. */
  baseHr: (number | null)[];
  strain: number;
  calories: number;
  steps: number;
  avgHr: number;
  maxHr: number;
  activities: Activity[];
  hr: (number | null)[];
  /** Stress (0–3) every 15 minutes from local midnight; null = asleep, active or not yet recorded. */
  stress: (number | null)[];
  zones: number[];
}

export interface JournalQuestion {
  id: string;
  label: string;
  category: 'sleep' | 'nutrition' | 'lifestyle' | 'recovery';
}
