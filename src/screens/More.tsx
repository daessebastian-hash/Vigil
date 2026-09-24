import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, BookOpen, ChevronRight, CircleHelp, RotateCcw, Ruler, Watch } from 'lucide-react';
import { useStore } from '../state/store';
import { Segmented } from '../components/ui';
import { PROFILE } from '../data/physiology';

export function More() {
  const { units, setUnits, resetDemo, journal, todayKey } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const answered = Object.keys(journal[todayKey] ?? {}).length;

  return (
    <div className="screen">
      <header className="page-header">
        <h1>More</h1>
      </header>

      <div className="card profile">
        <span className="avatar avatar-lg">{PROFILE.initials}</span>
        <span>
          <b>{PROFILE.name}</b>
          <small>Member since {PROFILE.memberSince}</small>
        </span>
      </div>

      <div className="card device">
        <span className="device-icon">
          <Watch size={22} />
        </span>
        <span className="device-body">
          <b>Vigil Band</b>
          <small>Connected · synced 2 min ago</small>
          <span className="battery-bar" aria-label={`Battery ${PROFILE.battery}%`}>
            <span style={{ width: `${PROFILE.battery}%` }} />
          </span>
        </span>
        <span className="device-pct">{PROFILE.battery}%</span>
      </div>

      <nav className="card menu" aria-label="More">
        <Link to="/journal" className="menu-item">
          <BookOpen size={18} />
          <span>Journal</span>
          <small>{answered ? `${answered} logged today` : 'Not logged today'}</small>
          <ChevronRight size={18} />
        </Link>
        <Link to="/sleep" className="menu-item">
          <BedDouble size={18} />
          <span>Sleep Planner</span>
          <ChevronRight size={18} />
        </Link>
        <div className="menu-item">
          <Ruler size={18} />
          <span>Units</span>
          <Segmented
            label="Units"
            value={units}
            onChange={setUnits}
            options={[
              { value: 'metric', label: 'Metric' },
              { value: 'imperial', label: 'Imperial' },
            ]}
          />
        </div>
        <button
          type="button"
          className="menu-item"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              setResetDone(false);
              return;
            }
            resetDemo();
            setConfirmReset(false);
            setResetDone(true);
          }}
        >
          <RotateCcw size={18} />
          <span>{confirmReset ? 'Tap again to reset' : 'Reset demo data'}</span>
          <small>{resetDone ? 'Reset' : 'Clears your added activities and journal'}</small>
        </button>
        <div className="menu-item">
          <CircleHelp size={18} />
          <span>About</span>
          <small>Vigil 0.1 · simulated data</small>
        </div>
      </nav>
    </div>
  );
}
