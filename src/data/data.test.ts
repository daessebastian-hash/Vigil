import { describe, expect, it } from 'vitest';
import { generateHistory } from './generate';
import { cycleKey } from './dates';
import {
  buildActivity,
  finalizeDay,
  hrZone,
  loadFromStrain,
  optimalStrain,
  recoveryZone,
  startOfDayMs,
  strainFromLoad,
} from './physiology';
import { coachReply, healthMetrics, healthspan, sleepPlan } from './insights';
import { elapsedSeconds, liveStats, newSession, retick, sessionToActivity } from './live';

const NOW = new Date(2026, 8, 24, 15, 30);

describe('generateHistory', () => {
  const days = generateHistory(NOW, 90);

  it('is deterministic for the same clock', () => {
    const again = generateHistory(NOW, 90);
    expect(again.map((d) => [d.recovery, d.strain, d.sleep.performance])).toEqual(
      days.map((d) => [d.recovery, d.strain, d.sleep.performance]),
    );
  });

  it('ends on the current cycle day and marks only it as today', () => {
    expect(days).toHaveLength(90);
    expect(days[days.length - 1].key).toBe('2026-09-24');
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it('keeps every score inside its scale', () => {
    for (const d of days) {
      expect(d.recovery).toBeGreaterThanOrEqual(0);
      expect(d.recovery).toBeLessThanOrEqual(100);
      expect(d.strain).toBeGreaterThanOrEqual(0);
      expect(d.strain).toBeLessThanOrEqual(21);
      expect(d.sleep.performance).toBeLessThanOrEqual(100);
      expect(d.optimalStrain[0]).toBeLessThan(d.optimalStrain[1]);
    }
  });

  it('builds a contiguous hypnogram whose stages add up to time in bed', () => {
    for (const d of days) {
      const { hypnogram, stages, inBed } = d.sleep;
      expect(hypnogram[0].start).toBe(0);
      expect(hypnogram[hypnogram.length - 1].end).toBe(inBed);
      for (let i = 1; i < hypnogram.length; i++) expect(hypnogram[i].start).toBe(hypnogram[i - 1].end);
      expect(stages.awake + stages.light + stages.deep + stages.rem).toBe(inBed);
    }
  });

  it('records no heart rate after now and shows only finished activities today', () => {
    const today = days[days.length - 1];
    const midnight = startOfDayMs(today.key);
    today.hr.forEach((v, i) => {
      if (midnight + i * 5 * 60_000 > NOW.getTime()) expect(v).toBeNull();
    });
    for (const a of today.activities) expect(a.end).toBeLessThanOrEqual(NOW.getTime());
  });
});

describe('strain', () => {
  it('is logarithmic, bounded by 21 and invertible', () => {
    expect(strainFromLoad(0)).toBe(0);
    expect(strainFromLoad(100)).toBeLessThan(strainFromLoad(200));
    expect(strainFromLoad(100_000)).toBeLessThanOrEqual(21);
    expect(strainFromLoad(loadFromStrain(14))).toBeCloseTo(14, 1);
  });

  it('targets more strain when recovery is higher', () => {
    expect(optimalStrain(90)[0]).toBeGreaterThan(optimalStrain(20)[1]);
  });

  it('maps heart rate to zones by % of max', () => {
    expect(hrZone(80, 188)).toBe(0);
    expect(hrZone(100, 188)).toBe(1);
    expect(hrZone(170, 188)).toBe(5);
    expect(recoveryZone(67)).toBe('green');
    expect(recoveryZone(66)).toBe('yellow');
    expect(recoveryZone(33)).toBe('red');
  });

  it('adds an activity to the day strain, calories and zones', () => {
    const day = generateHistory(NOW, 5)[3];
    const activity = buildActivity({
      id: 'x',
      kind: 'running',
      start: startOfDayMs(day.key) + 18 * 3_600_000,
      hr: Array.from({ length: 45 }, () => 160),
      source: 'manual',
    });
    const updated = finalizeDay(day, [...day.activities, activity]);
    expect(updated.strain).toBeGreaterThan(day.strain);
    expect(updated.calories).toBe(day.calories + activity.calories);
    expect(updated.zones.reduce((s, m) => s + m, 0)).toBe(day.zones.reduce((s, m) => s + m, 0) + 45);
  });
});

describe('insights', () => {
  const days = generateHistory(NOW, 120);
  const today = days[days.length - 1];

  it('flags health metrics against a 30-day range', () => {
    const metrics = healthMetrics(days, today.key);
    expect(metrics.map((m) => m.id)).toEqual(['rhr', 'hrv', 'resp', 'spo2', 'temp']);
    for (const m of metrics) expect(m.within).toBe(m.value >= m.range[0] && m.value <= m.range[1]);
  });

  it('recommends earlier bedtimes for higher sleep targets', () => {
    const plan = sleepPlan(today, today.sleep.end + 86_400_000);
    expect(plan[0].bedtime).toBeLessThan(plan[1].bedtime);
    expect(plan[1].bedtime).toBeLessThan(plan[2].bedtime);
  });

  it('produces a plausible healthspan', () => {
    const span = healthspan(days, today.key);
    expect(span.age).toBeGreaterThan(20);
    expect(span.age).toBeLessThan(50);
    expect(span.pace).toBeGreaterThanOrEqual(-1);
    expect(span.pace).toBeLessThanOrEqual(3);
  });

  it('answers coach questions from the data', () => {
    expect(coachReply('How did I sleep?', today, days)).toContain(`${today.sleep.performance}%`);
    expect(coachReply('what strain should I aim for', today, days)).toContain(`${today.recovery}%`);
  });
});

describe('live sessions', () => {
  it('tracks simulated time through pauses and speed changes', () => {
    const t0 = 1_000_000;
    let s = newSession('running', t0);
    expect(elapsedSeconds(s, t0 + 10_000)).toBe(10);
    s = retick(s, t0 + 10_000, { paused: true });
    expect(elapsedSeconds(s, t0 + 60_000)).toBe(10);
    s = retick(s, t0 + 60_000, { paused: false, speed: 60 });
    expect(elapsedSeconds(s, t0 + 61_000)).toBe(70);
  });

  it('builds strain over time and saves a finished activity', () => {
    const t0 = 1_000_000;
    const s = { ...newSession('running', t0), speed: 60 };
    const early = liveStats(s, 120);
    const later = liveStats(s, 1800);
    expect(later.strain).toBeGreaterThan(early.strain);
    const activity = sessionToActivity(s, t0 + 30_000);
    expect(activity?.hr).toHaveLength(30);
    expect(activity?.end).toBe(t0 + 30_000);
    expect(sessionToActivity(newSession('yoga', t0), t0 + 30_000)).toBeNull();
  });
});

describe('cycleKey', () => {
  it('treats the small hours as the previous day', () => {
    expect(cycleKey(new Date(2026, 8, 24, 2, 0))).toBe('2026-09-23');
    expect(cycleKey(new Date(2026, 8, 24, 9, 0))).toBe('2026-09-24');
  });
});
