import type { Activity, ActivityKind, ActivitySource, Day } from './types';
import { clamp, round1 } from './rng';

export const PROFILE = {
  name: 'Alex Rivera',
  firstName: 'Alex',
  initials: 'AR',
  age: 34,
  maxHr: 188,
  rhrBaseline: 52,
  hrvBaseline: 64,
  bmr: 1780,
  memberSince: 'March 2023',
  battery: 84,
};

export const STRAIN_MAX = 21;
/** Load (TRIMP-style points) at which strain reaches ~63% of the 21-point scale. */
const LOAD_SCALE = 190;

/** Strain is logarithmic: easy to build early, much harder to push toward 21. */
export function strainFromLoad(load: number): number {
  return round1(STRAIN_MAX * (1 - Math.exp(-Math.max(0, load) / LOAD_SCALE)));
}

export function loadFromStrain(strain: number): number {
  const s = clamp(strain, 0, STRAIN_MAX - 0.05);
  return -LOAD_SCALE * Math.log(1 - s / STRAIN_MAX);
}

/** HR zone 0–5 from percentage of max heart rate (zone 1 starts at 50%). */
export function hrZone(hr: number, maxHr = PROFILE.maxHr): number {
  const pct = hr / maxHr;
  if (pct < 0.5) return 0;
  return Math.min(5, Math.floor((pct - 0.5) / 0.1) + 1);
}

/** Load accrued per minute in each zone. */
const ZONE_LOAD = [0.15, 1, 2, 3, 4, 5];

/** Rough energy expenditure for one minute at a given heart rate. */
export function kcalPerMinute(hr: number): number {
  return Math.max(1.3, (hr - 58) * 0.088);
}

export type RecoveryZone = 'green' | 'yellow' | 'red';

export function recoveryZone(recovery: number): RecoveryZone {
  if (recovery >= 67) return 'green';
  if (recovery >= 34) return 'yellow';
  return 'red';
}

export const RECOVERY_COLOR: Record<RecoveryZone, string> = {
  green: 'var(--recovery-green)',
  yellow: 'var(--recovery-yellow)',
  red: 'var(--recovery-red)',
};

export function recoveryColor(recovery: number): string {
  return RECOVERY_COLOR[recoveryZone(recovery)];
}

export function strainLevel(strain: number): string {
  if (strain < 10) return 'Light';
  if (strain < 14) return 'Moderate';
  if (strain < 18) return 'Strenuous';
  return 'All Out';
}

export function sleepLevel(performance: number): string {
  if (performance >= 85) return 'Optimal';
  if (performance >= 70) return 'Sufficient';
  return 'Poor';
}

export function stressLevel(stress: number): 'Low' | 'Medium' | 'High' {
  if (stress < 1) return 'Low';
  if (stress < 2) return 'Medium';
  return 'High';
}

/** Target day strain for a given recovery: more in the green, less in the red. */
export function optimalStrain(recovery: number): [number, number] {
  const center = 7.2 + recovery * 0.098;
  return [round1(center - 1.3), round1(center + 1.3)];
}

export interface ActivityMeta {
  label: string;
  /** Typical fraction of max HR once warmed up. */
  intensity: number;
  /** Heart-rate pattern while active. */
  pattern: 'steady' | 'intervals' | 'sets' | 'calm';
  stepsPerMin: number;
  kmPerMin?: number;
}

export const ACTIVITY_META: Record<ActivityKind, ActivityMeta> = {
  running: { label: 'Running', intensity: 0.8, pattern: 'steady', stepsPerMin: 165, kmPerMin: 1 / 5.4 },
  cycling: { label: 'Cycling', intensity: 0.75, pattern: 'steady', stepsPerMin: 0, kmPerMin: 27 / 60 },
  strength: { label: 'Weightlifting', intensity: 0.64, pattern: 'sets', stepsPerMin: 15 },
  functional: { label: 'Functional Fitness', intensity: 0.8, pattern: 'intervals', stepsPerMin: 60 },
  yoga: { label: 'Yoga', intensity: 0.52, pattern: 'calm', stepsPerMin: 5 },
  walking: { label: 'Walking', intensity: 0.56, pattern: 'steady', stepsPerMin: 110, kmPerMin: 5.2 / 60 },
  swimming: { label: 'Swimming', intensity: 0.74, pattern: 'steady', stepsPerMin: 0, kmPerMin: 2.4 / 60 },
  tennis: { label: 'Tennis', intensity: 0.73, pattern: 'intervals', stepsPerMin: 70 },
  hiking: { label: 'Hiking', intensity: 0.64, pattern: 'steady', stepsPerMin: 105, kmPerMin: 4.1 / 60 },
  rowing: { label: 'Rowing', intensity: 0.78, pattern: 'steady', stepsPerMin: 0, kmPerMin: 12 / 60 },
};

export const ACTIVITY_KINDS = Object.keys(ACTIVITY_META) as ActivityKind[];

/** Derive every activity metric from its per-minute heart rate so all numbers agree. */
export function buildActivity(params: {
  id: string;
  kind: ActivityKind;
  start: number;
  hr: number[];
  source: ActivitySource;
}): Activity {
  const { id, kind, start, hr, source } = params;
  const zones = [0, 0, 0, 0, 0, 0];
  let load = 0;
  let calories = 0;
  let sum = 0;
  let max = 0;
  for (const bpm of hr) {
    const z = hrZone(bpm);
    zones[z] += 1;
    load += ZONE_LOAD[z];
    calories += kcalPerMinute(bpm);
    sum += bpm;
    max = Math.max(max, bpm);
  }
  const minutes = hr.length;
  const meta = ACTIVITY_META[kind];
  return {
    id,
    kind,
    start,
    end: start + minutes * 60_000,
    strain: strainFromLoad(load),
    load,
    avgHr: minutes ? Math.round(sum / minutes) : 0,
    maxHr: Math.round(max),
    calories: Math.round(calories),
    steps: Math.round(meta.stepsPerMin * minutes),
    zones,
    hr: hr.map((v) => Math.round(v)),
    distanceKm: meta.kmPerMin ? round1(meta.kmPerMin * minutes) : undefined,
    source,
  };
}

const DAY_SAMPLES = 288;
const MINUTES_PER_SAMPLE = 5;

/**
 * Combine the base day (sleep, recovery, all-day movement) with its activities to get
 * the day's strain, calories, steps, zones and heart-rate trace.
 */
export function finalizeDay(day: Day, activities: Activity[]): Day {
  const sorted = [...activities].sort((a, b) => a.start - b.start);
  const midnight = startOfDayMs(day.key);
  const hr = [...day.baseHr];
  for (const act of sorted) {
    const offset = (act.start - midnight) / 60_000;
    for (let i = 0; i < DAY_SAMPLES; i++) {
      const from = i * MINUTES_PER_SAMPLE - offset;
      const to = from + MINUTES_PER_SAMPLE;
      if (to <= 0 || from >= act.hr.length) continue;
      const slice = act.hr.slice(Math.max(0, Math.floor(from)), Math.min(act.hr.length, Math.ceil(to)));
      if (slice.length) hr[i] = Math.round(slice.reduce((s, v) => s + v, 0) / slice.length);
    }
  }
  const zones = [0, 0, 0, 0, 0, 0];
  for (const act of sorted) act.zones.forEach((m, z) => (zones[z] += m));
  const load = day.baseLoad + sorted.reduce((s, a) => s + a.load, 0);
  const recorded = hr.filter((v): v is number => v !== null);
  const wakeIdx = Math.floor((day.sleep.end - midnight) / 60_000 / MINUTES_PER_SAMPLE);
  const awake = hr.slice(Math.max(0, wakeIdx)).filter((v): v is number => v !== null);
  const stress = day.stress.map((v, i) => {
    if (v === null) return null;
    const t = midnight + i * 15 * 60_000;
    return sorted.some((a) => t >= a.start - 5 * 60_000 && t <= a.end + 10 * 60_000) ? null : v;
  });
  return {
    ...day,
    activities: sorted,
    hr,
    stress,
    zones,
    strain: strainFromLoad(load),
    calories: Math.round(day.baseCalories + sorted.reduce((s, a) => s + a.calories, 0)),
    steps: Math.round(day.baseSteps + sorted.reduce((s, a) => s + a.steps, 0)),
    avgHr: awake.length ? Math.round(awake.reduce((s, v) => s + v, 0) / awake.length) : day.rhr,
    maxHr: recorded.length ? Math.max(...recorded) : day.rhr,
  };
}

export function startOfDayMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}
