import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useStore } from '../state/store';
import { Ring } from '../components/Ring';
import { Hypnogram, STAGE_COLOR } from '../components/Hypnogram';
import { TrendCard } from '../components/TrendCard';
import { ScreenHeader, SectionTitle, Stat } from '../components/ui';
import { clock, dayLabel, hm, hmLong } from '../data/format';
import { asleepMinutes, mean, sleepPlan } from '../data/insights';
import { sleepLevel } from '../data/physiology';
import type { SleepStage } from '../data/types';

const STAGES: { stage: SleepStage; label: string }[] = [
  { stage: 'awake', label: 'Awake' },
  { stage: 'light', label: 'Light' },
  { stage: 'deep', label: 'SWS (Deep)' },
  { stage: 'rem', label: 'REM' },
];

export function Sleep() {
  const { selectedDay: day, days, todayKey } = useStore();
  const { sleep } = day;
  const asleep = asleepMinutes(day);
  const restorative = sleep.stages.deep + sleep.stages.rem;

  // Default wake time for tonight's plan: tomorrow at this morning's wake time, rounded to 15 min.
  const [wakeOffset, setWakeOffset] = useState(0);
  const baseWake = new Date(sleep.end);
  baseWake.setDate(baseWake.getDate() + 1);
  baseWake.setMinutes(Math.round(baseWake.getMinutes() / 15) * 15, 0, 0);
  const wakeAt = baseWake.getTime() + wakeOffset * 60_000;
  const plan = sleepPlan(day, wakeAt);
  const avgNeed = mean(days.slice(-30).map((d) => d.sleep.needTotal)) / 60;

  return (
    <div className="screen">
      <ScreenHeader title="Sleep" subtitle={dayLabel(day.key, todayKey)} />

      <section className="hero">
        <Ring size={228} stroke={16} value={sleep.performance / 100} color="var(--sleep)" label={`Sleep performance ${sleep.performance}%`}>
          <span className="hero-value">
            {sleep.performance}
            <small>%</small>
          </span>
          <span className="hero-caption">Sleep Performance</span>
        </Ring>
        <div className="vs">
          <div>
            <span>Hours of sleep</span>
            <b>{hm(asleep)}</b>
          </div>
          <div>
            <span>Sleep needed</span>
            <b>{hm(sleep.needTotal)}</b>
          </div>
        </div>
        <p className="hero-note">
          {sleepLevel(sleep.performance)}. You got {Math.round((asleep / sleep.needTotal) * 100)}% of the sleep your body needed.
        </p>
      </section>

      <section className="section">
        <SectionTitle action={<span className="section-meta">{hmLong(sleep.inBed)} in bed</span>}>Sleep Stages</SectionTitle>
        <div className="card">
          <Hypnogram sleep={sleep} />
          <div className="stage-list">
            {STAGES.map((s) => {
              const minutes = sleep.stages[s.stage];
              const pct = Math.round((minutes / sleep.inBed) * 100);
              return (
                <div className="stage-row" key={s.stage}>
                  <span className="stage-name">
                    <i style={{ background: STAGE_COLOR[s.stage] }} />
                    {s.label}
                  </span>
                  <span className="stage-track">
                    <span style={{ width: `${pct}%`, background: STAGE_COLOR[s.stage] }} />
                  </span>
                  <span className="stage-value">
                    <b>{hm(minutes)}</b>
                    <small>{pct}%</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="stats">
        <Stat label="Efficiency" value={sleep.efficiency} unit="%" />
        <Stat label="Consistency" value={sleep.consistency} unit="%" />
        <Stat label="Restorative" value={hm(restorative)} sub={`${Math.round((restorative / asleep) * 100)}% of sleep`} />
        <Stat label="Resp. Rate" value={sleep.respiratoryRate.toFixed(1)} unit="rpm" />
        <Stat label="Disturbances" value={sleep.disturbances} />
        <Stat label="Latency" value={sleep.latency} unit="min" />
      </section>

      <section className="section">
        <SectionTitle>Sleep Need</SectionTitle>
        <div className="card rows need">
          <div className="row">
            <span className="row-label">Baseline</span>
            <span className="row-value">
              <b>{hm(sleep.need.baseline)}</b>
            </span>
          </div>
          <div className="row">
            <span className="row-label">From recent strain</span>
            <span className="row-value">
              <b>+{hm(sleep.need.strain)}</b>
            </span>
          </div>
          <div className="row">
            <span className="row-label">From sleep debt</span>
            <span className="row-value">
              <b>+{hm(sleep.need.debt)}</b>
            </span>
          </div>
          <div className="row">
            <span className="row-label">Recent naps</span>
            <span className="row-value">
              <b>−{hm(sleep.need.naps)}</b>
            </span>
          </div>
          <div className="row row-total">
            <span className="row-label">Total sleep need</span>
            <span className="row-value">
              <b>{hm(sleep.needTotal)}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle>Sleep Planner</SectionTitle>
        <div className="card planner">
          <div className="planner-wake">
            <span>
              <small>Wake up</small>
              <b>{clock(wakeAt)}</b>
            </span>
            <span className="planner-adjust">
              <button type="button" className="icon-btn" aria-label="Wake 15 minutes earlier" onClick={() => setWakeOffset((o) => o - 15)}>
                <Minus size={16} />
              </button>
              <button type="button" className="icon-btn" aria-label="Wake 15 minutes later" onClick={() => setWakeOffset((o) => o + 15)}>
                <Plus size={16} />
              </button>
            </span>
          </div>
          {plan.map((p) => (
            <div className="planner-row" key={p.label}>
              <span>
                <b>{p.label}</b>
                <small>
                  {p.pct}% of need · {hm(p.sleepMinutes)} sleep
                </small>
              </span>
              <span className="planner-time">
                <small>In bed by</small>
                {clock(p.bedtime)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <TrendCard
        title="Hours of Sleep"
        get={(d) => asleepMinutes(d) / 60}
        color={() => 'var(--sleep)'}
        max={10}
        ticks={[2, 4, 6]}
        tickFormat={(v) => `${v}h`}
        format={(v) => hm(v * 60)}
        reference={{ value: avgNeed, label: 'Need' }}
      />
    </div>
  );
}
