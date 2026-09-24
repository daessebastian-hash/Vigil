import type { Activity, ActivityKind } from './types';
import { ACTIVITY_META, PROFILE, buildActivity, hrZone, kcalPerMinute, strainFromLoad } from './physiology';
import { mulberry32 } from './rng';

export interface LiveSession {
  id: string;
  kind: ActivityKind;
  /** Wall-clock ms when the session started. */
  startedAt: number;
  /** Simulated seconds elapsed as of `tickAt`. */
  elapsedAtTick: number;
  tickAt: number;
  /** Demo multiplier so a session can be shown without waiting in real time. */
  speed: number;
  paused: boolean;
  seed: number;
}

export const SAMPLE_SECONDS = 5;
const ZONE_LOAD = [0.15, 1, 2, 3, 4, 5];

export function newSession(kind: ActivityKind, now: number): LiveSession {
  return {
    id: `live-${now}`,
    kind,
    startedAt: now,
    elapsedAtTick: 0,
    tickAt: now,
    speed: 1,
    paused: false,
    seed: now % 100_000,
  };
}

export function elapsedSeconds(s: LiveSession, now: number): number {
  return s.paused ? s.elapsedAtTick : s.elapsedAtTick + ((now - s.tickAt) / 1000) * s.speed;
}

/** Re-anchor the session clock, e.g. before pausing or changing speed. */
export function retick(s: LiveSession, now: number, patch: Partial<Pick<LiveSession, 'speed' | 'paused'>>): LiveSession {
  return { ...s, elapsedAtTick: elapsedSeconds(s, now), tickAt: now, ...patch };
}

/** Deterministic simulated heart rate at a point in the session. */
export function hrAt(s: LiveSession, sec: number): number {
  const meta = ACTIVITY_META[s.kind];
  const rand = mulberry32(s.seed);
  const p1 = rand() * 6.28;
  const p2 = rand() * 6.28;
  const p3 = rand() * 6.28;
  const target = PROFILE.maxHr * meta.intensity;
  const start = PROFILE.rhrBaseline + 28;
  let bpm = start + (target - start) * (1 - Math.exp(-sec / 140)) + Math.min(sec / 3600, 1) * 6;
  if (meta.pattern === 'intervals') bpm += target * 0.07 * Math.tanh(3 * Math.sin((2 * Math.PI * sec) / 360));
  if (meta.pattern === 'sets') bpm += target * 0.1 * (Math.max(0, Math.sin((2 * Math.PI * sec) / 240)) ** 3 * 2 - 0.4);
  if (meta.pattern === 'calm') bpm += 5 * Math.sin(sec / 360);
  bpm += 2.5 * Math.sin(sec / 7 + p1) + 1.8 * Math.sin(sec / 13 + p2) + 1.2 * Math.sin(sec / 29 + p3);
  return Math.round(Math.min(PROFILE.maxHr - 1, Math.max(start - 10, bpm)));
}

export interface LiveStats {
  hr: number;
  zone: number;
  strain: number;
  calories: number;
  avgHr: number;
  maxHr: number;
  /** One sample every SAMPLE_SECONDS. */
  series: number[];
}

export function liveStats(s: LiveSession, sec: number): LiveStats {
  const series: number[] = [];
  let load = 0;
  let calories = 0;
  let sum = 0;
  let max = 0;
  const fraction = SAMPLE_SECONDS / 60;
  for (let t = 0; t <= sec; t += SAMPLE_SECONDS) {
    const bpm = hrAt(s, t);
    series.push(bpm);
    load += ZONE_LOAD[hrZone(bpm)] * fraction;
    calories += kcalPerMinute(bpm) * fraction;
    sum += bpm;
    max = Math.max(max, bpm);
  }
  const hr = hrAt(s, sec);
  return {
    hr,
    zone: hrZone(hr),
    strain: strainFromLoad(load),
    calories: Math.round(calories),
    avgHr: series.length ? Math.round(sum / series.length) : hr,
    maxHr: max,
    series,
  };
}

/** Convert a finished session into a saved activity that ends now. */
export function sessionToActivity(s: LiveSession, now: number): Activity | null {
  const sec = elapsedSeconds(s, now);
  const minutes = Math.floor(sec / 60);
  if (minutes < 1) return null;
  const hr = Array.from({ length: minutes }, (_, m) => {
    let sum = 0;
    for (let t = m * 60; t < (m + 1) * 60; t += SAMPLE_SECONDS) sum += hrAt(s, t);
    return sum / (60 / SAMPLE_SECONDS);
  });
  return buildActivity({ id: s.id, kind: s.kind, start: now - minutes * 60_000, hr, source: 'live' });
}
