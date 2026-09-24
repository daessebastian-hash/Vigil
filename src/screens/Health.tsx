import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { useStore } from '../state/store';
import { LineChart } from '../components/LineChart';
import { SectionTitle } from '../components/ui';
import { dayLabel, shortDate, tempText } from '../data/format';
import { healthMetrics, healthspan, window as dayWindow, mean, type HealthMetric } from '../data/insights';
import { PROFILE } from '../data/physiology';

function MetricRange({ m, units }: { m: HealthMetric; units: 'metric' | 'imperial' }) {
  const pad = (m.range[1] - m.range[0]) * 0.6;
  const lo = m.range[0] - pad;
  const hi = m.range[1] + pad;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const show = (v: number) => (m.id === 'temp' ? tempText(v, units) : `${v.toFixed(m.digits)}${m.unit === '%' ? '%' : ''}`);
  return (
    <div className="hm-row">
      <div className="hm-head">
        <span>
          <b>{m.label}</b>
          <small>
            Normal range {show(m.range[0])} – {show(m.range[1])}
            {m.id !== 'temp' && m.unit !== '%' ? ` ${m.unit}` : ''}
          </small>
        </span>
        <span className={`hm-value ${m.within ? '' : 'is-off'}`}>
          {m.id === 'temp' ? tempText(m.value, units) : m.value.toFixed(m.digits)}
          {m.id !== 'temp' && <small>{m.unit}</small>}
        </span>
      </div>
      <div className="hm-track">
        <span className="hm-range" style={{ left: pos(m.range[0]), right: `calc(100% - ${pos(m.range[1])})` }} />
        <span className={`hm-dot ${m.within ? '' : 'is-off'}`} style={{ left: pos(m.value) }} />
      </div>
    </div>
  );
}

export function Health() {
  const { days, selectedDay: day, todayKey, units } = useStore();
  const metrics = healthMetrics(days, day.key);
  const outside = metrics.filter((m) => !m.within);
  const span = healthspan(days, day.key);
  const younger = PROFILE.age - span.age;
  const last30 = dayWindow(days, day.key, 30);
  const hrvAvg = mean(last30.map((d) => d.hrv));
  const rhrAvg = mean(last30.map((d) => d.rhr));
  const xLabels = [
    { at: 0, text: shortDate(last30[0].key) },
    { at: 1, text: shortDate(last30[last30.length - 1].key) },
  ];
  const pacePos = ((span.pace + 1) / 4) * 100;

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Health</h1>
        <p>{dayLabel(day.key, todayKey)}</p>
      </header>

      <section className="section">
        <SectionTitle>Health Monitor</SectionTitle>
        <div className="card">
          <div className={`hm-status ${outside.length ? 'is-warn' : ''}`}>
            {outside.length ? <TriangleAlert size={20} /> : <ShieldCheck size={20} />}
            <span>
              <b>{outside.length ? `${outside.length} metric${outside.length > 1 ? 's' : ''} outside your normal range` : 'All metrics within range'}</b>
              <small>Compared with your last 30 days</small>
            </span>
          </div>
          {metrics.map((m) => (
            <MetricRange key={m.id} m={m} units={units} />
          ))}
        </div>
      </section>

      <section className="section">
        <SectionTitle>Healthspan</SectionTitle>
        <div className="card healthspan">
          <div className="hs-top">
            <div>
              <span className="eyebrow">Vigil Age</span>
              <span className="hs-age">{span.age.toFixed(1)}</span>
              <small>
                {younger >= 0 ? `${younger.toFixed(1)} years younger` : `${Math.abs(younger).toFixed(1)} years older`} than your age of {PROFILE.age}
              </small>
            </div>
            <div className="hs-pace">
              <span className="eyebrow">Pace of Aging</span>
              <b>{span.pace.toFixed(1)}x</b>
            </div>
          </div>
          <div className="pace-scale" aria-label={`Pace of aging ${span.pace.toFixed(1)}x on a scale from -1x to 3x`}>
            <span className="pace-marker" style={{ left: `${pacePos}%` }} />
            <div className="pace-labels">
              <span>-1x</span>
              <span>0x</span>
              <span>1x</span>
              <span>2x</span>
              <span>3x</span>
            </div>
          </div>
          <div className="factors">
            {span.factors.map((f) => (
              <div className="factor" key={f.label}>
                <span>
                  <b>{f.label}</b>
                  <small>
                    {f.value} · target {f.target}
                  </small>
                </span>
                <span className={`factor-impact ${f.years <= 0 ? 'good' : 'bad'}`}>
                  {f.years > 0 ? '+' : f.years < 0 ? '−' : ''}
                  {Math.abs(f.years).toFixed(1)} yrs
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <SectionTitle action={<span className="section-meta">avg {Math.round(hrvAvg)} ms</span>}>HRV · 30 Days</SectionTitle>
        <div className="card">
          <LineChart label="Heart rate variability over 30 days" values={last30.map((d) => d.hrv)} min={20} max={100} color="var(--recovery-green)" ticks={[40, 60, 80, 100]} xLabels={xLabels} height={120} />
        </div>
      </section>

      <section className="section">
        <SectionTitle action={<span className="section-meta">avg {Math.round(rhrAvg)} bpm</span>}>Resting HR · 30 Days</SectionTitle>
        <div className="card">
          <LineChart label="Resting heart rate over 30 days" values={last30.map((d) => d.rhr)} min={40} max={70} color="var(--heart)" ticks={[45, 55, 65]} xLabels={xLabels} height={120} />
        </div>
      </section>
    </div>
  );
}
