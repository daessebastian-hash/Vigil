import { Activity, Droplets, HeartPulse, Thermometer, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '../state/store';
import { Ring } from '../components/Ring';
import { TrendCard } from '../components/TrendCard';
import { CoachText, Delta, ScreenHeader, SectionTitle } from '../components/ui';
import { dayLabel, tempText } from '../data/format';
import { coachReply, mean, priorWindow } from '../data/insights';
import { recoveryColor, recoveryZone } from '../data/physiology';

const NOTE = {
  green: 'Your body is well recovered and ready to take on strain.',
  yellow: 'Your body is maintaining. A moderate day will keep you progressing.',
  red: 'Your body is under stress. Take it easy and prioritize rest.',
};

export function Recovery() {
  const { selectedDay: day, days, todayKey, units } = useStore();
  const zone = recoveryZone(day.recovery);
  const color = recoveryColor(day.recovery);
  const base = priorWindow(days, day.key, 30);
  const avg = (get: (d: typeof day) => number) => mean(base.map(get));
  const toUnit = (celsius: number) => (units === 'metric' ? celsius : celsius * 1.8 + 32);

  const rows: { icon: LucideIcon; label: string; value: string; unit: string; baseline: number; current: number; digits: number; higherIsBetter: boolean; baseText: string }[] = [
    { icon: Activity, label: 'Heart Rate Variability', value: String(day.hrv), unit: 'ms', current: day.hrv, baseline: avg((d) => d.hrv), digits: 0, higherIsBetter: true, baseText: `${Math.round(avg((d) => d.hrv))} ms` },
    { icon: HeartPulse, label: 'Resting Heart Rate', value: String(day.rhr), unit: 'bpm', current: day.rhr, baseline: avg((d) => d.rhr), digits: 0, higherIsBetter: false, baseText: `${Math.round(avg((d) => d.rhr))} bpm` },
    { icon: Wind, label: 'Respiratory Rate', value: day.respiratoryRate.toFixed(1), unit: 'rpm', current: day.respiratoryRate, baseline: avg((d) => d.respiratoryRate), digits: 1, higherIsBetter: false, baseText: `${avg((d) => d.respiratoryRate).toFixed(1)} rpm` },
    { icon: Droplets, label: 'Blood Oxygen', value: day.spo2.toFixed(1), unit: '%', current: day.spo2, baseline: avg((d) => d.spo2), digits: 1, higherIsBetter: true, baseText: `${avg((d) => d.spo2).toFixed(1)}%` },
    {
      icon: Thermometer,
      label: 'Skin Temperature',
      value: tempText(day.skinTemp, units).replace(/°[CF]/, ''),
      unit: units === 'metric' ? '°C' : '°F',
      current: toUnit(day.skinTemp),
      baseline: toUnit(avg((d) => d.skinTemp)),
      digits: 1,
      higherIsBetter: false,
      baseText: tempText(avg((d) => d.skinTemp), units),
    },
  ];

  return (
    <div className="screen">
      <ScreenHeader title="Recovery" subtitle={dayLabel(day.key, todayKey)} />

      <section className="hero">
        <Ring size={228} stroke={16} value={day.recovery / 100} color={color} label={`Recovery ${day.recovery}%`}>
          <span className="hero-value" style={{ color }}>
            {day.recovery}
            <small>%</small>
          </span>
          <span className="hero-caption">Recovery</span>
        </Ring>
        <p className="hero-note">{NOTE[zone]}</p>
      </section>

      <section className="section">
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="card rows">
          {rows.map((r) => (
            <div className="row" key={r.label}>
              <span className="row-icon">
                <r.icon size={17} />
              </span>
              <span className="row-body">
                <span className="row-label">{r.label}</span>
                <span className="row-sub">30-day avg {r.baseText}</span>
              </span>
              <span className="row-value">
                <b>{r.value}</b>
                <small>{r.unit}</small>
                <Delta value={r.current} baseline={r.baseline} digits={r.digits} higherIsBetter={r.higherIsBetter} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionTitle>Coach Insight</SectionTitle>
        <div className="card insight">
          <CoachText text={coachReply('why is my recovery', day, days)} />
        </div>
      </section>

      <TrendCard
        title="Recovery Trend"
        get={(d) => d.recovery}
        color={(d) => recoveryColor(d.recovery)}
        max={100}
        ticks={[33, 66, 100]}
        tickFormat={(v) => `${v}%`}
        format={(v) => `${Math.round(v)}%`}
      />
    </div>
  );
}
