import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useStore } from '../state/store';
import { ACTIVITY_ICON, ScreenHeader } from '../components/ui';
import { ACTIVITY_KINDS, ACTIVITY_META } from '../data/physiology';
import type { ActivityKind } from '../data/types';

export function ActivityPicker({ value, onChange }: { value: ActivityKind; onChange: (kind: ActivityKind) => void }) {
  return (
    <div className="picker" role="radiogroup" aria-label="Activity type">
      {ACTIVITY_KINDS.map((kind) => {
        const Icon = ACTIVITY_ICON[kind];
        return (
          <button key={kind} type="button" role="radio" aria-checked={kind === value} className="picker-item" onClick={() => onChange(kind)}>
            <Icon size={22} />
            <span>{ACTIVITY_META[kind].label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StartActivity() {
  const { live, startLive } = useStore();
  const navigate = useNavigate();
  const [kind, setKind] = useState<ActivityKind>('running');
  if (live) return <Navigate to="/live" replace />;

  return (
    <div className="screen">
      <ScreenHeader title="Start Activity" />
      <p className="lede">Choose an activity. Your band tracks heart rate and builds strain in real time.</p>
      <ActivityPicker value={kind} onChange={setKind} />
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => {
          startLive(kind);
          navigate('/live', { replace: true });
        }}
      >
        <Play size={16} fill="currentColor" /> Start {ACTIVITY_META[kind].label}
      </button>
    </div>
  );
}
