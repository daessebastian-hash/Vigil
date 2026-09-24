import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import { Ring } from '../components/Ring';
import { LineChart } from '../components/LineChart';
import { ACTIVITY_ICON, ScreenHeader, SectionTitle, Stat, ZONE_COLOR, ZoneBars } from '../components/ui';
import { clock, dayLabel, distanceText, hm, num, strainText } from '../data/format';
import { ACTIVITY_META, PROFILE, STRAIN_MAX, strainLevel } from '../data/physiology';

const SOURCE_LABEL = { auto: 'Auto-detected', manual: 'Added manually', live: 'Tracked live' };

export function ActivityDetail() {
  const { id = '' } = useParams();
  const { activityById, todayKey, removeActivity, units } = useStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const found = activityById(id);
  if (!found) return <Navigate to="/" replace />;
  const { day, activity: a } = found;
  const meta = ACTIVITY_META[a.kind];
  const Icon = ACTIVITY_ICON[a.kind];
  const minutes = (a.end - a.start) / 60_000;
  const zoneStops = [0, 1, 2, 3, 4, 5].map((z) => ({ value: PROFILE.maxHr * (0.4 + z * 0.1), color: ZONE_COLOR[z] }));

  return (
    <div className="screen">
      <ScreenHeader title={meta.label} subtitle={`${dayLabel(day.key, todayKey)} · ${clock(a.start)} – ${clock(a.end)}`} />

      <section className="hero">
        <Ring size={200} stroke={14} value={a.strain / STRAIN_MAX} color="var(--strain)" label={`Activity strain ${strainText(a.strain)}`}>
          <Icon size={20} className="hero-icon" />
          <span className="hero-value">{strainText(a.strain)}</span>
          <span className="hero-caption">Activity Strain</span>
        </Ring>
        <p className="hero-note">
          {strainLevel(a.strain)} effort · {SOURCE_LABEL[a.source]}
        </p>
      </section>

      <section className="stats">
        <Stat label="Duration" value={hm(minutes)} />
        <Stat label="Calories" value={num(a.calories)} unit="kcal" />
        <Stat label="Avg HR" value={a.avgHr} unit="bpm" />
        <Stat label="Max HR" value={a.maxHr} unit="bpm" />
        {a.distanceKm !== undefined && <Stat label="Distance" value={distanceText(a.distanceKm, units).split(' ')[0]} unit={units === 'metric' ? 'km' : 'mi'} />}
        {a.distanceKm !== undefined && a.steps > 0 && <Stat label="Steps" value={num(a.steps)} />}
      </section>

      <section className="section">
        <SectionTitle>Heart Rate</SectionTitle>
        <div className="card">
          <LineChart
            label="Heart rate during the activity"
            values={a.hr}
            min={60}
            max={PROFILE.maxHr}
            color="var(--strain)"
            valueStops={zoneStops}
            ticks={[100, 140, 180]}
            xLabels={[
              { at: 0, text: '0:00' },
              { at: 0.5, text: hm(minutes / 2) },
              { at: 1, text: hm(minutes) },
            ]}
            height={150}
          />
        </div>
      </section>

      <section className="section">
        <SectionTitle>Heart Rate Zones</SectionTitle>
        <div className="card">
          <ZoneBars zones={a.zones} />
        </div>
      </section>

      {a.source !== 'auto' && (
        <button
          type="button"
          className={`btn btn-danger${confirming ? ' is-confirming' : ''}`}
          onClick={() => {
            if (!confirming) return setConfirming(true);
            removeActivity(a.id);
            navigate(-1);
          }}
        >
          <Trash2 size={16} /> {confirming ? 'Tap again to delete' : 'Delete activity'}
        </button>
      )}
    </div>
  );
}
