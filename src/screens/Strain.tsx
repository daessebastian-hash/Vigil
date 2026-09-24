import { useStore } from '../state/store';
import { Ring } from '../components/Ring';
import { LineChart } from '../components/LineChart';
import { TrendCard } from '../components/TrendCard';
import { ActivityRow, EmptyNote, ScreenHeader, SectionTitle, Stat, ZoneBars } from '../components/ui';
import { dayLabel, num, strainText } from '../data/format';
import { STRAIN_MAX, startOfDayMs, strainLevel } from '../data/physiology';

const DAY_SAMPLES = 288;
/** The HR chart covers 5 AM to midnight. */
const CHART_FROM = 60;

export function Strain() {
  const { selectedDay: day, todayKey } = useStore();
  const [lo, hi] = day.optimalStrain;
  const midnight = startOfDayMs(day.key);
  const span = (DAY_SAMPLES - CHART_FROM) * 5 * 60_000;
  const chartStart = midnight + CHART_FROM * 5 * 60_000;
  const frac = (t: number) => Math.max(0, Math.min(1, (t - chartStart) / span));
  const hourAt = (h: number) => (h * 60 - CHART_FROM * 5) / ((DAY_SAMPLES - CHART_FROM) * 5);
  const zoneTotal = day.zones.slice(1).reduce((s, m) => s + m, 0);
  const inRange = day.strain >= lo && day.strain <= hi;

  return (
    <div className="screen">
      <ScreenHeader title="Strain" subtitle={dayLabel(day.key, todayKey)} />

      <section className="hero">
        <Ring
          size={228}
          stroke={16}
          value={day.strain / STRAIN_MAX}
          color="var(--strain)"
          band={[lo / STRAIN_MAX, hi / STRAIN_MAX]}
          bandColor="var(--strain-band)"
          label={`Day strain ${strainText(day.strain)}`}
        >
          <span className="hero-value">{strainText(day.strain)}</span>
          <span className="hero-caption">Day Strain</span>
        </Ring>
        <div className="target-chip">
          <span>Optimal strain</span>
          <b>
            {strainText(lo)} – {strainText(hi)}
          </b>
        </div>
        <p className="hero-note">
          {strainLevel(day.strain)} day.{' '}
          {day.strain < lo
            ? `${strainText(lo - day.strain)} more strain reaches your target.`
            : inRange
              ? "You're in your optimal range."
              : 'You went past your target. Refuel and prioritize sleep.'}
        </p>
      </section>

      <section className="stats">
        <Stat label="Calories" value={num(day.calories)} unit="kcal" />
        <Stat label="Steps" value={num(day.steps)} />
        <Stat label="Avg HR" value={day.avgHr} unit="bpm" />
        <Stat label="Max HR" value={day.maxHr} unit="bpm" />
      </section>

      <section className="section">
        <SectionTitle>Heart Rate</SectionTitle>
        <div className="card">
          <LineChart
            label="Heart rate through the day"
            values={day.hr.slice(CHART_FROM)}
            min={40}
            max={200}
            color="var(--strain)"
            ticks={[80, 120, 160, 200]}
            spans={day.activities.map((a) => ({ from: frac(a.start), to: frac(a.end), color: 'var(--strain-span)' }))}
            xLabels={[
              { at: hourAt(6), text: '6a' },
              { at: hourAt(12), text: '12p' },
              { at: hourAt(18), text: '6p' },
            ]}
            height={150}
          />
        </div>
      </section>

      <section className="section">
        <SectionTitle>Heart Rate Zones</SectionTitle>
        <div className="card">{zoneTotal > 0 ? <ZoneBars zones={day.zones} /> : <EmptyNote>No time in heart rate zones yet.</EmptyNote>}</div>
      </section>

      <section className="section">
        <SectionTitle>Activities</SectionTitle>
        {day.activities.length ? (
          <div className="stack">
            {day.activities.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EmptyNote>No activities logged for this day.</EmptyNote>
          </div>
        )}
      </section>

      <TrendCard
        title="Strain Trend"
        get={(d) => d.strain}
        color={() => 'var(--strain)'}
        max={STRAIN_MAX}
        ticks={[7, 14, 21]}
        format={strainText}
        skipPartialToday
      />
    </div>
  );
}
