import type { Activity, ActivityKind, Day, Sleep, SleepSegment, SleepStage } from './types';
import { between, clamp, normal, pick, round1, seeded, type Rng } from './rng';
import { addDays, cycleKey, keyToDate } from './dates';
import {
  ACTIVITY_META,
  PROFILE,
  buildActivity,
  finalizeDay,
  optimalStrain,
  startOfDayMs,
} from './physiology';

interface CarryOver {
  prevStrain: number;
  debt: number;
  bedtimes: number[];
  wakes: number[];
}

interface WorkoutPlan {
  kinds: ActivityKind[];
  chance: number;
  minutes: [number, number];
}

/** Weekly training rhythm, indexed by day of week (0 = Sunday). */
const WEEK_PLAN: WorkoutPlan[] = [
  { kinds: ['walking', 'hiking'], chance: 0.75, minutes: [45, 110] },
  { kinds: ['strength'], chance: 0.8, minutes: [45, 70] },
  { kinds: ['running'], chance: 0.85, minutes: [35, 60] },
  { kinds: ['yoga', 'cycling'], chance: 0.55, minutes: [40, 60] },
  { kinds: ['functional', 'running'], chance: 0.75, minutes: [40, 55] },
  { kinds: ['strength', 'swimming'], chance: 0.7, minutes: [45, 65] },
  { kinds: ['cycling', 'running', 'tennis'], chance: 0.85, minutes: [60, 120] },
];

const DAY_SAMPLES = 288;
const STRESS_SAMPLES = 96;

export function generateHistory(now: Date = new Date(), days = 120): Day[] {
  const todayKey = cycleKey(now);
  const out: Day[] = [];
  let carry: CarryOver = { prevStrain: 11, debt: 25, bedtimes: [-80, -75, -90, -70], wakes: [400, 405, 395, 410] };
  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    const day = generateDay(key, carry, i === 0 ? now : null);
    out.push(day);
    const bedMin = (day.sleep.start - startOfDayMs(key)) / 60_000;
    const wakeMin = (day.sleep.end - startOfDayMs(key)) / 60_000;
    const asleep = day.sleep.inBed - day.sleep.stages.awake;
    carry = {
      prevStrain: day.strain,
      debt: clamp(carry.debt * 0.5 + (day.sleep.needTotal - asleep) * 0.5, 0, 120),
      bedtimes: [...carry.bedtimes.slice(-3), bedMin],
      wakes: [...carry.wakes.slice(-3), wakeMin],
    };
  }
  return out;
}

function generateDay(key: string, carry: CarryOver, now: Date | null): Day {
  const rng = seeded(`vigil:${key}`);
  const midnight = startOfDayMs(key);
  const dow = keyToDate(key).getDay();
  const weekendMorning = dow === 0 || dow === 6;
  const nowMin = now ? (now.getTime() - midnight) / 60_000 : Infinity;

  // Last night's behaviour shapes everything downstream.
  const drank = rng() < (weekendMorning ? 0.3 : 0.07);

  // --- Sleep -------------------------------------------------------------
  const bedtime = Math.round((weekendMorning ? -35 : -72) + normal(rng) * 20 + (drank ? 30 : 0));
  let wake = Math.round((weekendMorning ? 462 : 388) + normal(rng) * 16);
  if (wake > nowMin - 10) wake = Math.round(Math.max(bedtime + 180, nowMin - 10));
  const inBed = clamp(wake - bedtime, 240, 640);
  wake = bedtime + inBed;

  const efficiencyTarget = clamp(0.93 + normal(rng) * 0.02 - (drank ? 0.035 : 0), 0.8, 0.975);
  const hypnogram = buildHypnogram(rng, inBed, efficiencyTarget);
  const stages: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0, rem: 0 };
  for (const seg of hypnogram) stages[seg.stage] += seg.end - seg.start;
  const asleep = inBed - stages.awake;

  const need = {
    baseline: 462,
    strain: Math.max(0, Math.round((carry.prevStrain - 8) * 5)),
    debt: Math.round(Math.min(carry.debt * 0.4, 50)),
    naps: 0,
  };
  const needTotal = need.baseline + need.strain + need.debt - need.naps;
  const performance = clamp(Math.round((asleep / needTotal) * 100), 25, 100);
  const deviation = (target: number, history: number[]) =>
    history.reduce((s, v) => s + Math.abs(target - v), 0) / Math.max(1, history.length);
  const consistency = clamp(
    Math.round(100 - (deviation(bedtime, carry.bedtimes) + deviation(wake, carry.wakes)) * 0.32),
    38,
    99,
  );

  const sleep: Sleep = {
    start: midnight + bedtime * 60_000,
    end: midnight + wake * 60_000,
    inBed,
    stages,
    hypnogram,
    need,
    needTotal,
    performance,
    efficiency: Math.round((asleep / inBed) * 100),
    consistency,
    respiratoryRate: round1(14.6 + normal(rng) * 0.3 + (drank ? 0.5 : 0)),
    disturbances: hypnogram.filter((s, i) => s.stage === 'awake' && i > 0 && i < hypnogram.length - 1).length,
    latency: hypnogram[0]?.stage === 'awake' ? hypnogram[0].end : 0,
  };

  // --- Recovery ----------------------------------------------------------
  const perfFactor = (performance - 85) / 100;
  const strainFactor = (carry.prevStrain - 12) / 21;
  const hrv = Math.round(
    PROFILE.hrvBaseline * (1 + normal(rng) * 0.09 + perfFactor * 0.45 - strainFactor * 0.3 - (drank ? 0.2 : 0)),
  );
  const rhr = Math.round(PROFILE.rhrBaseline + normal(rng) * 1.6 - perfFactor * 5 + strainFactor * 4 + (drank ? 4 : 0));
  const hrvZ = (hrv - PROFILE.hrvBaseline) / (PROFILE.hrvBaseline * 0.12);
  const rhrZ = (rhr - PROFILE.rhrBaseline) / 2.5;
  const recovery = clamp(Math.round(63 + hrvZ * 16 - rhrZ * 7 + (performance - 85) * 0.4 + normal(rng) * 5), 3, 99);

  // --- Day activity --------------------------------------------------------
  const plan = WEEK_PLAN[dow];
  const activities: Activity[] = [];
  // Today always gets a morning session so the home screen shows a realistic day in progress.
  const trains = rng() < plan.chance || now !== null;
  if (trains) {
    const kind = pick(rng, plan.kinds);
    const minutes = Math.round(between(rng, plan.minutes[0], plan.minutes[1]));
    const morning = rng() < 0.6 || now !== null;
    const startMin = weekendMorning
      ? Math.round(between(rng, 540, 630))
      : morning
        ? wake + Math.round(between(rng, 20, 45))
        : Math.round(between(rng, 1050, 1110));
    const effort = 0.95 + (recovery - 50) / 650 + normal(rng) * 0.025;
    activities.push(
      buildActivity({
        id: `${key}-a0`,
        kind,
        start: midnight + startMin * 60_000,
        hr: simulateActivityHr(rng, kind, minutes, rhr, effort),
        source: 'auto',
      }),
    );
  }
  if (rng() < 0.22) {
    const startMin = Math.round(between(rng, 1140, 1230));
    const minutes = Math.round(between(rng, 20, 40));
    activities.push(
      buildActivity({
        id: `${key}-a1`,
        kind: 'walking',
        start: midnight + startMin * 60_000,
        hr: simulateActivityHr(rng, 'walking', minutes, rhr, 0.97),
        source: 'auto',
      }),
    );
  }
  const completed = activities.filter((a) => (a.end - midnight) / 60_000 <= nowMin);

  const bedtimeTonight = 22.5 * 60;
  const awakeFraction = clamp((nowMin - wake) / (bedtimeTonight - wake), 0, 1);
  const dayFraction = clamp(nowMin / 1440, 0, 1);
  const fullDaySteps = Math.max(1800, 5400 + normal(rng) * 1500 + (weekendMorning ? 900 : 0));
  const baseSteps = Math.round(fullDaySteps * awakeFraction);
  const baseLoad = (20 + (fullDaySteps / 10_000) * 58) * awakeFraction;
  const baseCalories = PROFILE.bmr * dayFraction + baseSteps * 0.045;

  // --- Heart rate & stress traces ----------------------------------------
  const baseHr: (number | null)[] = [];
  // Short bursts of movement (stairs, errands) scattered through the waking day.
  const bursts = Array.from({ length: 7 }, () => ({
    index: Math.round(between(rng, wake + 30, bedtimeTonight - 30) / 5),
    lift: between(rng, 18, 32),
  }));
  let noise = 0;
  for (let i = 0; i < DAY_SAMPLES; i++) {
    const t = i * 5;
    noise = noise * 0.75 + normal(rng) * 2;
    if (t > nowMin) {
      baseHr.push(null);
    } else if (t < wake) {
      baseHr.push(Math.round(rhr + 3 + noise * 0.6));
    } else if (t > bedtimeTonight) {
      baseHr.push(Math.round(rhr + 11 + noise));
    } else {
      const circadian = Math.sin((Math.PI * (t - wake)) / (bedtimeTonight - wake)) * 9;
      const burst = bursts.find((b) => i >= b.index && i < b.index + 2)?.lift ?? 0;
      baseHr.push(Math.round(rhr + 19 + circadian + burst + noise * 1.5));
    }
  }

  const stress: (number | null)[] = [];
  let drift = 0;
  for (let i = 0; i < STRESS_SAMPLES; i++) {
    const t = i * 15;
    drift = drift * 0.8 + normal(rng) * 0.22;
    if (t < wake + 15 || t > 22 * 60 || t > nowMin) {
      stress.push(null);
      continue;
    }
    const workday = !weekendMorning && t > 540 && t < 1050 ? 0.55 + Math.sin(((t - 540) / 510) * Math.PI) * 0.35 : 0.1;
    const lowRecovery = recovery < 34 ? 0.4 : recovery < 67 ? 0.15 : 0;
    stress.push(round1(clamp(0.45 + workday + lowRecovery + drift, 0, 3)));
  }

  const base: Day = {
    key,
    isToday: now !== null,
    sleep,
    recovery,
    hrv,
    rhr,
    respiratoryRate: sleep.respiratoryRate,
    spo2: round1(clamp(96.3 + normal(rng) * 0.6, 93.5, 99.4)),
    skinTemp: round1(33.8 + normal(rng) * 0.22 + (drank ? 0.25 : 0)),
    optimalStrain: optimalStrain(recovery),
    baseLoad,
    baseCalories,
    baseSteps,
    baseHr,
    strain: 0,
    calories: 0,
    steps: 0,
    avgHr: 0,
    maxHr: 0,
    activities: [],
    hr: baseHr,
    stress,
    zones: [0, 0, 0, 0, 0, 0],
  };
  return finalizeDay(base, completed);
}

function buildHypnogram(rng: Rng, inBed: number, efficiency: number): SleepSegment[] {
  const segs: SleepSegment[] = [];
  const cursor = () => (segs.length ? segs[segs.length - 1].end : 0);
  const push = (stage: SleepStage, length: number) => {
    if (length <= 0) return;
    const last = segs[segs.length - 1];
    if (last && last.stage === stage) {
      last.end += length;
    } else {
      const start = cursor();
      segs.push({ stage, start, end: start + length });
    }
  };

  const latency = Math.round(between(rng, 6, 18));
  const finalAwake = Math.round(between(rng, 2, 7));
  push('awake', latency);
  const sleepEnd = inBed - finalAwake;
  let awakeBudget = Math.max(0, Math.round(inBed * (1 - efficiency)) - latency - finalAwake);

  while (cursor() < sleepEnd - 1) {
    const progress = (cursor() - latency) / (sleepEnd - latency);
    const cycle = between(rng, 84, 104);
    const deepShare = Math.max(0.04, 0.44 - progress * 0.52);
    const remShare = Math.min(0.42, 0.1 + progress * 0.36);
    const lightShare = 1 - deepShare - remShare;
    const parts: [SleepStage, number][] = [
      ['light', cycle * lightShare * 0.6],
      ['deep', cycle * deepShare],
      ['light', cycle * lightShare * 0.4],
      ['rem', cycle * remShare],
    ];
    for (const [stage, length] of parts) {
      const len = Math.min(Math.round(length), sleepEnd - cursor());
      if (len <= 0) break;
      push(stage, len);
    }
    if (awakeBudget > 0 && cursor() < sleepEnd - 30 && rng() < 0.7) {
      const blip = Math.min(awakeBudget, Math.round(between(rng, 2, 7)));
      push('awake', blip);
      awakeBudget -= blip;
    }
  }
  push('awake', inBed - cursor());
  return segs;
}

/** Minute-by-minute heart rate for a workout: warm-up, a pattern-specific body, cool-down. */
export function simulateActivityHr(
  rng: Rng,
  kind: ActivityKind,
  minutes: number,
  rhr: number,
  effort: number,
): number[] {
  const meta = ACTIVITY_META[kind];
  const target = PROFILE.maxHr * meta.intensity * effort;
  const floor = rhr + 32;
  const warm = Math.max(2, Math.min(8, Math.round(minutes * 0.15)));
  const cool = Math.max(2, Math.min(5, Math.round(minutes * 0.1)));
  const hr: number[] = [];
  let noise = 0;
  for (let m = 0; m < minutes; m++) {
    let bpm = target + (m / minutes) * 6;
    if (m < warm) bpm = floor + (target - floor) * ((m + 1) / warm);
    else if (m >= minutes - cool) bpm = target - (target - floor) * 0.55 * ((m - (minutes - cool) + 1) / cool);
    if (m >= warm && m < minutes - cool) {
      if (meta.pattern === 'intervals') bpm += (Math.floor(m / 3) % 2 === 0 ? 1 : -1) * target * 0.07;
      if (meta.pattern === 'sets') bpm += (m % 4 === 0 ? 1 : -0.35) * target * 0.1;
      if (meta.pattern === 'calm') bpm += Math.sin(m / 6) * 5;
    }
    noise = noise * 0.7 + normal(rng) * 2.2;
    hr.push(clamp(bpm + noise, rhr + 15, PROFILE.maxHr - 1));
  }
  return hr;
}
