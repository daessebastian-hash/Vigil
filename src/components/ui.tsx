import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Bike,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Mountain,
  PersonStanding,
  Sailboat,
  Waves,
  Volleyball,
  type LucideIcon,
} from 'lucide-react';
import type { Activity, ActivityKind } from '../data/types';
import { ACTIVITY_META, PROFILE } from '../data/physiology';
import { clock, hm, strainText } from '../data/format';

export const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  running: Footprints,
  cycling: Bike,
  strength: Dumbbell,
  functional: Flame,
  yoga: PersonStanding,
  walking: Footprints,
  swimming: Waves,
  tennis: Volleyball,
  hiking: Mountain,
  rowing: Sailboat,
};

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="screen-header">
      <button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate(-1)}>
        <ChevronLeft size={22} />
      </button>
      <div className="screen-header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="screen-header-right">{right}</div>
    </header>
  );
}

export function Delta({ value, baseline, digits = 0, higherIsBetter = true }: { value: number; baseline: number; digits?: number; higherIsBetter?: boolean }) {
  const diff = value - baseline;
  const threshold = digits ? 0.05 : 0.5;
  if (Math.abs(diff) < threshold) return <span className="delta delta-flat">= avg</span>;
  const good = diff > 0 === higherIsBetter;
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`delta ${good ? 'delta-good' : 'delta-bad'}`}>
      <Icon size={11} strokeWidth={3} />
      {Math.abs(diff).toFixed(digits)}
    </span>
  );
}

export function Stat({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

/** Renders coach copy, turning **text** into emphasis. */
export function CoachText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

export function ActivityRow({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICON[activity.kind];
  return (
    <Link to={`/activity/${activity.id}`} className="act-row">
      <span className="act-badge act-badge-strain">
        <Icon size={14} strokeWidth={2.4} />
        <b>{strainText(activity.strain)}</b>
      </span>
      <span className="act-body">
        <span className="act-name">{ACTIVITY_META[activity.kind].label}</span>
        <span className="act-time">
          {clock(activity.start)} – {clock(activity.end)}
        </span>
      </span>
      <span className="act-meta">
        {hm((activity.end - activity.start) / 60_000)}
        <ChevronRight size={18} />
      </span>
    </Link>
  );
}

export function SleepRow({ start, end, performance, asleep }: { start: number; end: number; performance: number; asleep: number }) {
  return (
    <Link to="/sleep" className="act-row">
      <span className="act-badge act-badge-sleep">
        <b>{hm(asleep)}</b>
      </span>
      <span className="act-body">
        <span className="act-name">Sleep</span>
        <span className="act-time">
          {clock(start)} – {clock(end)}
        </span>
      </span>
      <span className="act-meta">
        {performance}%
        <ChevronRight size={18} />
      </span>
    </Link>
  );
}

export const ZONE_COLOR = ['var(--zone-0)', 'var(--zone-1)', 'var(--zone-2)', 'var(--zone-3)', 'var(--zone-4)', 'var(--zone-5)'];

export function ZoneBars({ zones }: { zones: number[] }) {
  const total = zones.reduce((s, m) => s + m, 0) || 1;
  const max = Math.max(...zones.slice(1), 1);
  const rows = [5, 4, 3, 2, 1];
  return (
    <div className="zones">
      {rows.map((z) => {
        const lo = Math.round(PROFILE.maxHr * (0.4 + z * 0.1));
        const hi = Math.round(PROFILE.maxHr * (0.5 + z * 0.1));
        return (
          <div className="zone-row" key={z}>
            <span className="zone-label">
              <b>ZONE {z}</b>
              <small>
                {lo}–{hi}
              </small>
            </span>
            <span className="zone-track">
              <span className="zone-fill" style={{ width: `${(zones[z] / max) * 100}%`, background: ZONE_COLOR[z] }} />
            </span>
            <span className="zone-value">
              <b>{hm(zones[z])}</b>
              <small>{Math.round((zones[z] / total) * 100)}%</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="empty-note">{children}</p>;
}
