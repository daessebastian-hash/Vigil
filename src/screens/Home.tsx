import { Link } from 'react-router-dom';
import { BatteryMedium, BookOpen, ChevronLeft, ChevronRight, Flame, Footprints, Play, Plus, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { useStore } from '../state/store';
import { Ring } from '../components/Ring';
import { LineChart } from '../components/LineChart';
import { ActivityRow, CoachText, SectionTitle, SleepRow } from '../components/ui';
import { useNow } from '../components/hooks';
import { addDays } from '../data/dates';
import { dayLabel, num, strainText } from '../data/format';
import { asleepMinutes, healthMetrics, mean, outlook } from '../data/insights';
import { ACTIVITY_META, PROFILE, STRAIN_MAX, recoveryColor, stressLevel } from '../data/physiology';
import { elapsedSeconds, liveStats } from '../data/live';

export const STRESS_STOPS = [
  { value: 0, color: 'var(--stress-low)' },
  { value: 1, color: 'var(--stress-low)' },
  { value: 1.6, color: 'var(--stress-med)' },
  { value: 2.4, color: 'var(--stress-high)' },
  { value: 3, color: 'var(--stress-high)' },
];

function Dial({ to, pct, color, value, label }: { to: string; pct: number; color: string; value: string; label: string }) {
  return (
    <Link to={to} className="dial">
      <Ring size={104} stroke={8} value={pct} color={color} label={`${label} ${value}`}>
        <span className="dial-value">{value}</span>
      </Ring>
      <span className="dial-label">
        {label}
        <ChevronRight size={13} strokeWidth={3} />
      </span>
    </Link>
  );
}

function LiveBanner() {
  const { live } = useStore();
  const now = useNow(1000, !!live);
  if (!live) return null;
  const sec = elapsedSeconds(live, now);
  const stats = liveStats(live, sec);
  const mm = Math.floor(sec / 60);
  const ss = String(Math.floor(sec % 60)).padStart(2, '0');
  return (
    <Link to="/live" className="live-banner">
      <span className="live-dot" />
      <span className="live-banner-name">{ACTIVITY_META[live.kind].label}</span>
      <span>
        {mm}:{ss}
      </span>
      <span>{stats.hr} bpm</span>
      <span className="live-banner-strain">{strainText(stats.strain)}</span>
    </Link>
  );
}

export function Home() {
  const { selectedDay: day, days, todayKey, selectedKey, setSelectedKey, dayByKey } = useStore();
  const prevKey = addDays(selectedKey, -1);
  const nextKey = addDays(selectedKey, 1);
  const canPrev = !!dayByKey(prevKey);
  const canNext = selectedKey !== todayKey;
  const o = outlook(day, days);
  const metrics = healthMetrics(days, day.key);
  const within = metrics.filter((m) => m.within).length;
  const stressReadings = day.stress.filter((v): v is number => v !== null);
  const lastStress = stressReadings[stressReadings.length - 1] ?? 0;
  const avgStress = mean(stressReadings);
  const shownStress = day.isToday ? lastStress : avgStress;
  const isToday = day.key === todayKey;

  return (
    <div className="screen home">
      <header className="home-top">
        <Link to="/more" className="avatar" aria-label="Profile">
          {PROFILE.initials}
        </Link>
        <div className="date-pill">
          <button type="button" aria-label="Previous day" disabled={!canPrev} onClick={() => setSelectedKey(prevKey)}>
            <ChevronLeft size={18} />
          </button>
          <span>{dayLabel(selectedKey, todayKey)}</span>
          <button type="button" aria-label="Next day" disabled={!canNext} onClick={() => setSelectedKey(nextKey)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <Link to="/more" className="battery" aria-label={`Band battery ${PROFILE.battery}%`}>
          <BatteryMedium size={18} />
          {PROFILE.battery}%
        </Link>
      </header>

      <LiveBanner />

      <section className="dials" aria-label="Daily scores">
        <Dial to="/sleep" pct={day.sleep.performance / 100} color="var(--sleep)" value={`${day.sleep.performance}%`} label="Sleep" />
        <Dial to="/recovery" pct={day.recovery / 100} color={recoveryColor(day.recovery)} value={`${day.recovery}%`} label="Recovery" />
        <Dial to="/strain" pct={day.strain / STRAIN_MAX} color="var(--strain)" value={strainText(day.strain)} label="Strain" />
      </section>

      <Link to="/coach" className="card outlook">
        <span className="eyebrow">
          <Sparkles size={13} /> Daily Outlook
        </span>
        <strong className="outlook-title">{o.title}</strong>
        <p>
          <CoachText text={o.body} />
        </p>
        <span className="ask-coach">
          Ask Coach anything
          <ChevronRight size={16} />
        </span>
      </Link>

      <section className="section">
        <SectionTitle>{isToday ? "Today's Activities" : 'Activities'}</SectionTitle>
        <div className="stack">
          <SleepRow start={day.sleep.start} end={day.sleep.end} performance={day.sleep.performance} asleep={asleepMinutes(day)} />
          {day.activities.map((a) => (
            <ActivityRow key={a.id} activity={a} />
          ))}
        </div>
        <div className="btn-row">
          <Link to="/add" className="btn">
            <Plus size={16} strokeWidth={2.6} /> Add Activity
          </Link>
          <Link to="/start" className="btn btn-primary">
            <Play size={14} strokeWidth={2.6} fill="currentColor" /> Start Activity
          </Link>
        </div>
      </section>

      <section className="section">
        <SectionTitle
          action={
            <span className={`pill ${within === metrics.length ? 'pill-good' : 'pill-warn'}`}>
              {within === metrics.length ? <ShieldCheck size={13} /> : <TriangleAlert size={13} />}
              {within}/{metrics.length} within range
            </span>
          }
        >
          Health Monitor
        </SectionTitle>
        <Link to="/health" className="card monitor">
          {metrics.map((m) => (
            <span key={m.id} className="monitor-cell">
              <span className={`monitor-dot ${m.within ? 'ok' : 'off'}`} />
              <b>{m.value.toFixed(m.digits)}</b>
              <small>{m.short}</small>
            </span>
          ))}
        </Link>
      </section>

      <section className="section">
        <SectionTitle>Stress Monitor</SectionTitle>
        <div className="card">
          <div className="stress-head">
            <span className="stress-value">{shownStress.toFixed(1)}</span>
            <span className="stress-meta">
              <b className={`stress-${stressLevel(shownStress).toLowerCase()}`}>{stressLevel(shownStress)}</b>
              <small>{day.isToday ? 'Current stress · 0–3 scale' : 'Average stress · 0–3 scale'}</small>
            </span>
          </div>
          <LineChart
            label="Stress through the day"
            values={day.stress.slice(24, 92)}
            min={0}
            max={3}
            color="var(--stress-med)"
            valueStops={STRESS_STOPS}
            height={96}
            area={false}
            ticks={[1, 2, 3]}
            xLabels={[
              { at: 0, text: '6a' },
              { at: 24 / 67, text: '12p' },
              { at: 48 / 67, text: '6p' },
            ]}
          />
        </div>
      </section>

      <section className="stats stats-2">
        <div className="stat">
          <span className="stat-label">
            <Footprints size={13} /> Steps
          </span>
          <span className="stat-value">{num(day.steps)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">
            <Flame size={13} /> Calories
          </span>
          <span className="stat-value">{num(day.calories)}</span>
        </div>
      </section>

      <Link to="/journal" className="card journal-cta">
        <span className="journal-icon">
          <BookOpen size={18} />
        </span>
        <span>
          <strong>Complete your Journal</strong>
          <small>Log yesterday's behaviors to see how they affect your recovery · 2 min</small>
        </span>
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
