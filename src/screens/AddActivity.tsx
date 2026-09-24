import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { ScreenHeader, Segmented } from '../components/ui';
import { ActivityPicker } from './StartActivity';
import { buildActivity, startOfDayMs, strainLevel } from '../data/physiology';
import { simulateActivityHr } from '../data/generate';
import { seeded } from '../data/rng';
import { clock, dayLabel, hm, num, strainText } from '../data/format';
import type { ActivityKind } from '../data/types';

type Effort = 'light' | 'moderate' | 'hard' | 'max';
const EFFORT: Record<Effort, number> = { light: 0.84, moderate: 0.95, hard: 1.05, max: 1.14 };

function defaultStart(): string {
  const d = new Date(Date.now() - 75 * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0')}`;
}

export function AddActivity() {
  const { selectedDay: day, todayKey, addActivity } = useStore();
  const navigate = useNavigate();
  const [kind, setKind] = useState<ActivityKind>('strength');
  const [time, setTime] = useState(defaultStart);
  const [minutes, setMinutes] = useState(45);
  const [effort, setEffort] = useState<Effort>('moderate');
  const [error, setError] = useState('');

  const [h, m] = time.split(':').map(Number);
  const start = startOfDayMs(day.key) + ((h || 0) * 60 + (m || 0)) * 60_000;

  const preview = useMemo(
    () =>
      buildActivity({
        id: `manual-${day.key}-${kind}-${time}-${minutes}-${effort}`,
        kind,
        start,
        hr: simulateActivityHr(seeded(`manual:${kind}:${minutes}:${effort}`), kind, minutes, day.rhr, EFFORT[effort]),
        source: 'manual',
      }),
    [day.key, day.rhr, kind, time, minutes, effort, start],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (preview.end > Date.now()) {
      setError('That activity would end in the future. Pick an earlier start time or a shorter duration.');
      return;
    }
    if (preview.start < day.sleep.end) {
      setError(`That time overlaps your sleep, which ended at ${clock(day.sleep.end)}. Pick a later start time.`);
      return;
    }
    const overlaps = day.activities.some((a) => preview.start < a.end && preview.end > a.start);
    if (overlaps) {
      setError('That time overlaps an activity you already have. Adjust the start time.');
      return;
    }
    const saved = { ...preview, id: `manual-${Date.now()}` };
    addActivity(saved);
    navigate(`/activity/${saved.id}`, { replace: true });
  };

  return (
    <form className="screen" onSubmit={onSubmit}>
      <ScreenHeader title="Add Activity" subtitle={dayLabel(day.key, todayKey)} />
      <ActivityPicker value={kind} onChange={setKind} />

      <div className="card form">
        <label className="field" htmlFor="start-time">
          <span>Start time</span>
          <input
            id="start-time"
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setError('');
            }}
            required
          />
        </label>
        <label className="field" htmlFor="duration">
          <span>
            Duration <b>{hm(minutes)}</b>
          </span>
          <input
            id="duration"
            type="range"
            min={10}
            max={180}
            step={5}
            value={minutes}
            onChange={(e) => {
              setMinutes(Number(e.target.value));
              setError('');
            }}
          />
        </label>
        <div className="field">
          <span>Effort</span>
          <Segmented
            label="Effort"
            value={effort}
            onChange={setEffort}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'hard', label: 'Hard' },
              { value: 'max', label: 'All Out' },
            ]}
          />
        </div>
      </div>

      <div className="card estimate">
        <span className="eyebrow">Estimated</span>
        <div className="estimate-grid">
          <span>
            <b className="strain-text">{strainText(preview.strain)}</b>
            <small>{strainLevel(preview.strain)} strain</small>
          </span>
          <span>
            <b>{preview.avgHr}</b>
            <small>Avg HR</small>
          </span>
          <span>
            <b>{num(preview.calories)}</b>
            <small>Calories</small>
          </span>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg">
        Save Activity
      </button>
    </form>
  );
}
