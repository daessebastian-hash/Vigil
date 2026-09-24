import type { Sleep, SleepStage } from '../data/types';
import { clock, clockShort } from '../data/format';

const ROWS: { stage: SleepStage; label: string }[] = [
  { stage: 'awake', label: 'AWAKE' },
  { stage: 'rem', label: 'REM' },
  { stage: 'light', label: 'LIGHT' },
  { stage: 'deep', label: 'SWS' },
];

export const STAGE_COLOR: Record<SleepStage, string> = {
  awake: 'var(--stage-awake)',
  rem: 'var(--stage-rem)',
  light: 'var(--stage-light)',
  deep: 'var(--stage-deep)',
};

const W = 1000;
const ROW_H = 40;

export function Hypnogram({ sleep }: { sleep: Sleep }) {
  const total = sleep.inBed;
  const row = (stage: SleepStage) => ROWS.findIndex((r) => r.stage === stage);
  const x = (min: number) => (min / total) * W;

  const hourMarks: { at: number; text: string }[] = [];
  const first = new Date(sleep.start);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + 3_600_000; t < sleep.end; t += 3_600_000) {
    const at = (t - sleep.start) / (sleep.end - sleep.start);
    if (at > 0.2 && at < 0.8 && new Date(t).getHours() % 2 === 0) hourMarks.push({ at, text: clockShort(t) });
  }

  return (
    <div className="hypno">
      <div className="hypno-body">
        <div className="hypno-labels">
          {ROWS.map((r) => (
            <span key={r.stage}>{r.label}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${ROWS.length * ROW_H}`} preserveAspectRatio="none" role="img" aria-label="Sleep stages through the night">
          {ROWS.map((r, i) => (
            <line key={r.stage} x1={0} x2={W} y1={i * ROW_H + ROW_H / 2} y2={i * ROW_H + ROW_H / 2} stroke="var(--line)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          ))}
          {sleep.hypnogram.slice(1).map((seg, i) => {
            const prev = sleep.hypnogram[i];
            return (
              <line
                key={`c${i}`}
                x1={x(seg.start)}
                x2={x(seg.start)}
                y1={row(prev.stage) * ROW_H + ROW_H / 2}
                y2={row(seg.stage) * ROW_H + ROW_H / 2}
                stroke="var(--line-strong)"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {sleep.hypnogram.map((seg, i) => (
            <rect
              key={i}
              x={x(seg.start)}
              width={Math.max(3, x(seg.end) - x(seg.start))}
              y={row(seg.stage) * ROW_H + ROW_H * 0.22}
              height={ROW_H * 0.56}
              rx={3}
              fill={STAGE_COLOR[seg.stage]}
            />
          ))}
        </svg>
      </div>
      <div className="hypno-x">
        <span style={{ left: 0 }}>{clock(sleep.start)}</span>
        {hourMarks.map((m) => (
          <span key={m.text} style={{ left: `${m.at * 100}%` }} className="mid">
            {m.text}
          </span>
        ))}
        <span style={{ right: 0 }}>{clock(sleep.end)}</span>
      </div>
    </div>
  );
}
