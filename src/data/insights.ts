import type { Day } from './types';
import { PROFILE, optimalStrain, recoveryZone, sleepLevel, strainLevel } from './physiology';
import { hm, hmLong, strainText } from './format';
import { round1 } from './rng';

export function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function sd(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Up to `n` days ending with (and including) `key`. */
export function window(days: Day[], key: string, n: number): Day[] {
  const idx = days.findIndex((d) => d.key === key);
  if (idx < 0) return [];
  return days.slice(Math.max(0, idx - n + 1), idx + 1);
}

/** The `n` days before `key`, used as the member's personal baseline. */
export function priorWindow(days: Day[], key: string, n = 30): Day[] {
  const idx = days.findIndex((d) => d.key === key);
  if (idx <= 0) return [];
  return days.slice(Math.max(0, idx - n), idx);
}

export const asleepMinutes = (d: Day) => d.sleep.inBed - d.sleep.stages.awake;

export interface HealthMetric {
  id: 'rhr' | 'hrv' | 'resp' | 'spo2' | 'temp';
  label: string;
  short: string;
  unit: string;
  value: number;
  baseline: number;
  range: [number, number];
  within: boolean;
  digits: number;
}

export function healthMetrics(days: Day[], key: string): HealthMetric[] {
  const day = days.find((d) => d.key === key);
  const prior = priorWindow(days, key, 30);
  if (!day || !prior.length) return [];
  const defs: { id: HealthMetric['id']; label: string; short: string; unit: string; digits: number; get: (d: Day) => number; minHalf: number }[] = [
    { id: 'rhr', label: 'Resting Heart Rate', short: 'RHR', unit: 'bpm', digits: 0, get: (d) => d.rhr, minHalf: 3 },
    { id: 'hrv', label: 'Heart Rate Variability', short: 'HRV', unit: 'ms', digits: 0, get: (d) => d.hrv, minHalf: 10 },
    { id: 'resp', label: 'Respiratory Rate', short: 'RESP', unit: 'rpm', digits: 1, get: (d) => d.respiratoryRate, minHalf: 0.6 },
    { id: 'spo2', label: 'Blood Oxygen', short: 'SPO2', unit: '%', digits: 1, get: (d) => d.spo2, minHalf: 1.2 },
    { id: 'temp', label: 'Skin Temperature', short: 'SKIN TEMP', unit: '°C', digits: 1, get: (d) => d.skinTemp, minHalf: 0.5 },
  ];
  return defs.map((def) => {
    const history = prior.map(def.get);
    const baseline = mean(history);
    const half = Math.max(def.minHalf, sd(history) * 2);
    const value = def.get(day);
    const range: [number, number] = [baseline - half, baseline + half];
    return {
      id: def.id,
      label: def.label,
      short: def.short,
      unit: def.unit,
      digits: def.digits,
      value,
      baseline,
      range,
      within: value >= range[0] && value <= range[1],
    };
  });
}

export interface SleepPlanOption {
  label: string;
  pct: number;
  bedtime: number;
  sleepMinutes: number;
}

/** Recommended bedtimes for tonight given a desired wake time (epoch ms). */
export function sleepPlan(day: Day, wakeAt: number): SleepPlanOption[] {
  const debtCarry = Math.max(0, day.sleep.needTotal - asleepMinutes(day)) * 0.5 + day.sleep.need.debt * 0.4;
  const need = 462 + Math.max(0, Math.round((day.strain - 8) * 5)) + Math.min(50, Math.round(debtCarry));
  const efficiency = day.sleep.efficiency / 100 || 0.93;
  return [
    { label: 'Peak', pct: 100 },
    { label: 'Perform', pct: 85 },
    { label: 'Get By', pct: 70 },
  ].map(({ label, pct }) => {
    const sleepMinutes = (need * pct) / 100;
    const inBed = sleepMinutes / efficiency + 12;
    return { label, pct, sleepMinutes, bedtime: wakeAt - inBed * 60_000 };
  });
}

export interface HealthspanFactor {
  label: string;
  value: string;
  target: string;
  /** Years added (+) or removed (−) from biological age. */
  years: number;
}

export interface Healthspan {
  age: number;
  pace: number;
  factors: HealthspanFactor[];
}

function healthspanFactors(sample: Day[]): HealthspanFactor[] {
  const weeks = Math.max(1, sample.length / 7);
  const sleepHours = mean(sample.map(asleepMinutes)) / 60;
  const consistency = mean(sample.map((d) => d.sleep.consistency));
  const hrv = mean(sample.map((d) => d.hrv));
  const rhr = mean(sample.map((d) => d.rhr));
  const steps = mean(sample.filter((d) => !d.isToday).map((d) => d.steps));
  const zone13 = sample.reduce((s, d) => s + d.zones[1] + d.zones[2] + d.zones[3], 0) / weeks;
  const zone45 = sample.reduce((s, d) => s + d.zones[4] + d.zones[5], 0) / weeks;
  const strength =
    sample.reduce(
      (s, d) => s + d.activities.filter((a) => a.kind === 'strength' || a.kind === 'functional').reduce((m, a) => m + (a.end - a.start) / 60_000, 0),
      0,
    ) / weeks;
  // Neutral at the midpoint of good/bad (the target); saturates at ±span years.
  const score = (value: number, good: number, bad: number, span: number) => {
    const t = Math.max(-1, Math.min(1, (value - (good + bad) / 2) / (Math.abs(good - bad) / 2)));
    return round1(-t * span * Math.sign(good - bad)) || 0;
  };
  return [
    { label: 'Sleep Consistency', value: `${Math.round(consistency)}%`, target: '80%+', years: score(consistency, 95, 65, 1.2) },
    { label: 'Hours of Sleep', value: hm(sleepHours * 60), target: '7:00–9:00', years: score(sleepHours, 8.5, 5.5, 1.1) },
    { label: 'HRV', value: `${Math.round(hrv)} ms`, target: '55+ ms', years: score(hrv, 75, 35, 1.4) },
    { label: 'Resting Heart Rate', value: `${Math.round(rhr)} bpm`, target: '< 60 bpm', years: score(rhr, 45, 75, 1.3) },
    { label: 'Zone 1–3 Time', value: `${hmLong(zone13)}/wk`, target: '2h 30m+/wk', years: score(zone13, 300, 0, 1.2) },
    { label: 'Zone 4–5 Time', value: `${hmLong(zone45)}/wk`, target: '20m+/wk', years: score(zone45, 40, 0, 0.8) },
    { label: 'Strength Training', value: `${hmLong(strength)}/wk`, target: '1h+/wk', years: score(strength, 120, 0, 0.9) },
    { label: 'Daily Steps', value: Math.round(steps).toLocaleString('en-US'), target: '7,500+', years: score(steps, 12500, 2500, 0.9) },
  ];
}

export function healthspan(days: Day[], key: string): Healthspan {
  const sample = window(days, key, 180);
  const recent = window(days, key, 30);
  const factors = healthspanFactors(sample);
  const recentDelta = healthspanFactors(recent).reduce((s, f) => s + f.years, 0);
  const delta = factors.reduce((s, f) => s + f.years, 0);
  return {
    age: round1(PROFILE.age + delta),
    pace: round1(Math.max(-1, Math.min(3, 1 + recentDelta / 12))),
    factors,
  };
}

export function outlook(day: Day, days: Day[]): { title: string; body: string } {
  const base = priorWindow(days, day.key, 30);
  const hrvBase = Math.round(mean(base.map((d) => d.hrv)));
  const [lo, hi] = optimalStrain(day.recovery);
  const zone = recoveryZone(day.recovery);
  const hrvLine =
    day.hrv >= hrvBase
      ? `HRV is ${day.hrv} ms, above your 30-day average of ${hrvBase}.`
      : `HRV is ${day.hrv} ms, below your 30-day average of ${hrvBase}.`;
  if (zone === 'green') {
    return {
      title: 'Primed to perform',
      body: `${hrvLine} Your body is ready for a harder day. Target ${strainText(lo)}–${strainText(hi)} strain to build fitness.`,
    };
  }
  if (zone === 'yellow') {
    return {
      title: 'Maintain today',
      body: `${hrvLine} You're adapting well. Keep strain between ${strainText(lo)} and ${strainText(hi)} to make progress without overreaching.`,
    };
  }
  return {
    title: 'Prioritize recovery',
    body: `${hrvLine} Your body is under stress. Keep strain to ${strainText(lo)}–${strainText(hi)}, hydrate and aim for an early bedtime.`,
  };
}

export function coachPrompts(day: Day): string[] {
  const zone = recoveryZone(day.recovery);
  return [
    zone === 'green' ? 'How hard should I train today?' : `Why is my recovery ${zone}?`,
    'How did I sleep last night?',
    'When should I go to bed tonight?',
    'Summarize my week',
  ];
}

/** Rule-based coach that answers from the member's own data. */
export function coachReply(question: string, day: Day, days: Day[]): string {
  const q = question.toLowerCase();
  const base = priorWindow(days, day.key, 30);
  const hrvBase = Math.round(mean(base.map((d) => d.hrv)));
  const rhrBase = Math.round(mean(base.map((d) => d.rhr)));
  const [lo, hi] = optimalStrain(day.recovery);
  const asleep = asleepMinutes(day);

  if (/bed|tonight|planner/.test(q)) {
    const wake = new Date(day.sleep.end);
    wake.setDate(wake.getDate() + 1);
    const plan = sleepPlan(day, wake.getTime());
    const fmt = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `To wake at **${fmt(wake.getTime())}** fully recovered, get into bed by **${fmt(plan[0].bedtime)}**. That covers ${hm(plan[0].sleepMinutes)} of sleep, which includes extra need from today's ${strainText(day.strain)} strain. If that's not realistic, ${fmt(plan[1].bedtime)} still gets you to 85%.`;
  }
  if (/sleep|slept|rest(ed)?\b/.test(q)) {
    const { stages } = day.sleep;
    const restorative = Math.round(((stages.deep + stages.rem) / asleep) * 100);
    return `You slept **${hm(asleep)}** against a need of ${hm(day.sleep.needTotal)}, a sleep performance of **${day.sleep.performance}%** (${sleepLevel(day.sleep.performance).toLowerCase()}). ${restorative}% of it was restorative (deep + REM), and efficiency was ${day.sleep.efficiency}%. ${
      day.sleep.consistency < 70
        ? `Your consistency was ${day.sleep.consistency}%. Going to bed and waking within the same 30-minute window each day will lift it.`
        : `Consistency was solid at ${day.sleep.consistency}%. Keep the same schedule.`
    }`;
  }
  if (/week|summary|summar|trend/.test(q)) {
    const week = window(days, day.key, 7);
    const avgRec = Math.round(mean(week.map((d) => d.recovery)));
    const avgStrain = round1(mean(week.filter((d) => !d.isToday).map((d) => d.strain)));
    const avgSleep = mean(week.map(asleepMinutes));
    const greens = week.filter((d) => d.recovery >= 67).length;
    const workouts = week.reduce((s, d) => s + d.activities.length, 0);
    return `Over the last 7 days: average recovery **${avgRec}%** with ${greens} green day${greens === 1 ? '' : 's'}, average day strain **${strainText(avgStrain)}**, and **${hm(avgSleep)}** of sleep per night across ${workouts} activities. ${
      avgStrain > 14 && avgRec < 50
        ? 'Strain is outpacing recovery. Plan a lighter day soon.'
        : avgRec >= 67
          ? "You're recovering well. There's room to add intensity."
          : 'Load and recovery are balanced. Keep it steady.'
    }`;
  }
  if (/hrv|variability|rhr|resting|recover|why|green|yellow|red/.test(q)) {
    const drivers: string[] = [];
    drivers.push(day.hrv >= hrvBase ? `HRV ${day.hrv} ms (above your ${hrvBase} ms baseline)` : `HRV ${day.hrv} ms (below your ${hrvBase} ms baseline)`);
    drivers.push(day.rhr <= rhrBase ? `resting HR ${day.rhr} bpm (at or below your ${rhrBase} bpm baseline)` : `resting HR ${day.rhr} bpm (elevated vs ${rhrBase} bpm)`);
    drivers.push(`sleep performance ${day.sleep.performance}%`);
    const prev = days[days.findIndex((d) => d.key === day.key) - 1];
    const strainNote = prev && prev.strain >= 14 ? ` Yesterday's ${strainText(prev.strain)} strain is still weighing on your system.` : '';
    return `Your recovery is **${day.recovery}%**. The main inputs: ${drivers.join(', ')}.${strainNote} ${
      day.recovery >= 67 ? 'Your body can handle a demanding day.' : day.recovery >= 34 ? 'A moderate day will keep you progressing.' : 'Favor active recovery and an early night.'
    }`;
  }
  if (/strain|train|workout|hard|exercise|run|lift/.test(q)) {
    const remaining = Math.max(0, lo - day.strain);
    return `With **${day.recovery}%** recovery, your optimal strain today is **${strainText(lo)}–${strainText(hi)}**. You're at ${strainText(day.strain)} so far (${strainLevel(day.strain).toLowerCase()}). ${
      remaining > 0
        ? `About ${strainText(remaining)} more gets you into range. A 40–50 minute session with time in zones 2–3 would do it.`
        : day.strain > hi
          ? "You've gone past your target. Prioritize fuel, fluids and sleep tonight."
          : "You're in your optimal range. Anything more should be easy movement."
    }`;
  }
  if (/stress/.test(q)) {
    const readings = day.stress.filter((v): v is number => v !== null);
    const avg = round1(mean(readings));
    return `Your average stress today is **${avg.toFixed(1)}** on the 0–3 scale. ${
      avg >= 1.5 ? 'That is elevated. A 5-minute breathing session or a short walk can bring it down.' : 'That is in a healthy range.'
    }`;
  }
  return `Here's today at a glance: recovery **${day.recovery}%**, strain **${strainText(day.strain)}** of a ${strainText(lo)}–${strainText(hi)} target, and **${hm(asleep)}** of sleep. Ask me about your sleep, recovery, training or bedtime.`;
}
