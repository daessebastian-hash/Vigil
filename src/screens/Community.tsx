import { useMemo, useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import { useStore } from '../state/store';
import { SectionTitle, Segmented } from '../components/ui';
import { hm, strainText } from '../data/format';
import { asleepMinutes } from '../data/insights';
import { PROFILE, recoveryColor } from '../data/physiology';
import { between, clamp, normal, seeded } from '../data/rng';

type Metric = 'recovery' | 'strain' | 'sleep';

const MEMBERS = [
  { name: 'Maya Chen', hue: 12 },
  { name: 'Jordan Okafor', hue: 200 },
  { name: 'Sam Patel', hue: 150 },
  { name: 'Lena Fischer', hue: 280 },
  { name: 'Diego Morales', hue: 40 },
  { name: 'Priya Nair', hue: 320 },
  { name: 'Tom Walsh', hue: 180 },
  { name: 'Aisha Bello', hue: 95 },
  { name: 'Chris Young', hue: 230 },
];

interface Row {
  name: string;
  initials: string;
  hue: number;
  me: boolean;
  recovery: number;
  strain: number;
  sleep: number;
}

export function Community() {
  const { selectedDay: day } = useStore();
  const [metric, setMetric] = useState<Metric>('recovery');

  const rows = useMemo<Row[]>(() => {
    const others = MEMBERS.map((m) => {
      const rng = seeded(`team:${day.key}:${m.name}`);
      return {
        name: m.name,
        initials: m.name
          .split(' ')
          .map((p) => p[0])
          .join(''),
        hue: m.hue,
        me: false,
        recovery: Math.round(clamp(62 + normal(rng) * 20, 5, 99)),
        strain: Math.round(clamp(11 + normal(rng) * 3.2, 3, 20.5) * 10) / 10,
        sleep: Math.round(between(rng, 330, 520)),
      };
    });
    const me: Row = {
      name: `${PROFILE.name} (You)`,
      initials: PROFILE.initials,
      hue: 205,
      me: true,
      recovery: day.recovery,
      strain: day.strain,
      sleep: asleepMinutes(day),
    };
    return [...others, me];
  }, [day]);

  const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);
  const myRank = sorted.findIndex((r) => r.me) + 1;
  const teamAvg = Math.round(rows.reduce((s, r) => s + r.recovery, 0) / rows.length);

  const show = (r: Row) => {
    if (metric === 'recovery') return <b style={{ color: recoveryColor(r.recovery) }}>{r.recovery}%</b>;
    if (metric === 'strain') return <b style={{ color: 'var(--strain)' }}>{strainText(r.strain)}</b>;
    return <b style={{ color: 'var(--sleep)' }}>{hm(r.sleep)}</b>;
  };

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Community</h1>
        <p>Teams you belong to</p>
      </header>

      <div className="card team">
        <span className="team-badge">
          <Users size={22} />
        </span>
        <span className="team-body">
          <b>Dawn Patrol</b>
          <small>{rows.length} members · Team recovery {teamAvg}%</small>
        </span>
        <span className="team-rank">
          <Trophy size={14} />#{myRank}
        </span>
      </div>

      <section className="section">
        <SectionTitle
          action={
            <Segmented
              label="Leaderboard metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'recovery', label: 'Recovery' },
                { value: 'strain', label: 'Strain' },
                { value: 'sleep', label: 'Sleep' },
              ]}
            />
          }
        >
          Leaderboard
        </SectionTitle>
        <ol className="card leaderboard">
          {sorted.map((r, i) => (
            <li key={r.name} className={r.me ? 'is-me' : undefined}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-avatar" style={{ background: `hsl(${r.hue} 35% 32%)` }}>
                {r.initials}
              </span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-value">{show(r)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
