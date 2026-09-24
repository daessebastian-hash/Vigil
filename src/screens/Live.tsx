import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Heart, Pause, Play, Square, X } from 'lucide-react';
import { useStore } from '../state/store';
import { useNow } from '../components/hooks';
import { Ring } from '../components/Ring';
import { LineChart } from '../components/LineChart';
import { Segmented, Stat, ZONE_COLOR } from '../components/ui';
import { elapsedSeconds, liveStats, SAMPLE_SECONDS } from '../data/live';
import { ACTIVITY_META, PROFILE, STRAIN_MAX } from '../data/physiology';
import { num, strainText } from '../data/format';

function clockText(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${m}:${r}` : `${m}:${r}`;
}

const SPEEDS = [
  { value: '1', label: '1×' },
  { value: '10', label: '10×' },
  { value: '60', label: '60×' },
];

export function Live() {
  const { live, updateLive, finishLive } = useStore();
  const navigate = useNavigate();
  const now = useNow(250, !!live && !live.paused);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Set while ending so the "no session" redirect doesn't race our own navigation.
  const leaving = useRef(false);
  if (!live) return leaving.current ? null : <Navigate to="/" replace />;

  const sec = elapsedSeconds(live, now);
  const stats = liveStats(live, sec);
  const recent = stats.series.slice(-Math.round(600 / SAMPLE_SECONDS));
  const meta = ACTIVITY_META[live.kind];
  const pctMax = Math.round((stats.hr / PROFILE.maxHr) * 100);

  const end = () => {
    if (!confirmEnd) return setConfirmEnd(true);
    leaving.current = true;
    const activity = finishLive(true);
    navigate(activity ? `/activity/${activity.id}` : '/', { replace: true });
  };

  return (
    <div className="screen live">
      <header className="live-header">
        <button
          type="button"
          className="icon-btn"
          aria-label="Discard activity"
          onClick={() => {
            leaving.current = true;
            finishLive(false);
            navigate('/', { replace: true });
          }}
        >
          <X size={20} />
        </button>
        <span className="live-title">
          <span className={`live-dot${live.paused ? ' is-paused' : ''}`} />
          {live.paused ? 'Paused' : 'Live'} · {meta.label}
        </span>
        <span className="live-clock">{clockText(sec)}</span>
      </header>

      <section className="hero">
        <Ring size={236} stroke={16} value={stats.strain / STRAIN_MAX} color="var(--strain)" label={`Activity strain ${strainText(stats.strain)}`}>
          <span className="hero-value">{strainText(stats.strain)}</span>
          <span className="hero-caption">Activity Strain</span>
        </Ring>
      </section>

      <section className="live-hr">
        <Heart className={live.paused ? '' : 'beat'} size={26} fill="var(--heart)" color="var(--heart)" style={{ animationDuration: `${60 / stats.hr}s` }} />
        <span className="live-bpm">{stats.hr}</span>
        <span className="live-bpm-unit">bpm</span>
        <span className="zone-chip" style={{ background: ZONE_COLOR[stats.zone] }}>
          {stats.zone ? `Zone ${stats.zone}` : 'Below zones'} · {pctMax}%
        </span>
      </section>

      <div className="card">
        <LineChart label="Heart rate, last 10 minutes" values={recent} min={60} max={PROFILE.maxHr} color="var(--heart)" height={90} ticks={[100, 140, 180]} />
      </div>

      <section className="stats">
        <Stat label="Calories" value={num(stats.calories)} unit="kcal" />
        <Stat label="Avg HR" value={stats.avgHr} unit="bpm" />
      </section>

      <div className="live-controls">
        <button type="button" className="btn btn-round" aria-label={live.paused ? 'Resume' : 'Pause'} onClick={() => updateLive({ paused: !live.paused })}>
          {live.paused ? <Play size={22} fill="currentColor" /> : <Pause size={22} fill="currentColor" />}
        </button>
        <button type="button" className={`btn btn-end${confirmEnd ? ' is-confirming' : ''}`} onClick={end}>
          <Square size={14} fill="currentColor" /> {confirmEnd ? 'Tap to save' : 'End activity'}
        </button>
      </div>

      <div className="demo-speed">
        <span>Demo speed</span>
        <Segmented label="Demo speed" value={String(live.speed)} onChange={(v) => updateLive({ speed: Number(v) })} options={SPEEDS} />
      </div>
    </div>
  );
}
