import { useId } from 'react';

interface LineChartProps {
  values: (number | null)[];
  min: number;
  max: number;
  color: string;
  height?: number;
  ticks?: number[];
  tickFormat?: (value: number) => string;
  xLabels?: { at: number; text: string }[];
  /** Shaded vertical spans, as fractions 0–1 of the x axis (e.g. workouts). */
  spans?: { from: number; to: number; color: string }[];
  /** Horizontal value bands behind the line (e.g. stress levels, normal range). */
  bands?: { from: number; to: number; color: string }[];
  /** Colour the stroke by value instead of a single colour. */
  valueStops?: { value: number; color: string }[];
  area?: boolean;
  endDot?: boolean;
  label: string;
}

const W = 1000;
const H = 100;

export function LineChart({
  values,
  min,
  max,
  color,
  height = 140,
  ticks = [],
  tickFormat = String,
  xLabels = [],
  spans = [],
  bands = [],
  valueStops,
  area = true,
  endDot = true,
  label,
}: LineChartProps) {
  const id = useId().replace(/:/g, '');
  const n = Math.max(values.length - 1, 1);
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * H;

  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push({ i, v });
  });
  if (run.length) runs.push(run);

  const line = runs
    .map((r) => r.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(2)}`).join(''))
    .join('');
  const fill = runs
    .filter((r) => r.length > 1)
    .map((r) => `M${x(r[0].i)},${H}` + r.map((p) => `L${x(p.i).toFixed(1)},${y(p.v).toFixed(2)}`).join('') + `L${x(r[r.length - 1].i)},${H}Z`)
    .join('');

  let last: { i: number; v: number } | null = null;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== null) {
      last = { i, v };
      break;
    }
  }
  const stroke = valueStops ? `url(#${id}-stroke)` : color;
  const pctY = (v: number) => ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;

  return (
    <div className="chart">
      <div className="chart-plot line-plot" style={{ height }} role="img" aria-label={label}>
        {ticks.map((t) => (
          <div key={t} className="chart-grid" style={{ bottom: `${pctY(t)}%` }}>
            <span>{tickFormat(t)}</span>
          </div>
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {valueStops && (
              <linearGradient id={`${id}-stroke`} gradientUnits="userSpaceOnUse" x1="0" y1={H} x2="0" y2="0">
                {valueStops.map((s) => (
                  <stop key={s.value} offset={`${((s.value - min) / (max - min)) * 100}%`} stopColor={s.color} />
                ))}
              </linearGradient>
            )}
          </defs>
          {bands.map((b, i) => (
            <rect key={i} x={0} width={W} y={y(b.to)} height={Math.max(0, y(b.from) - y(b.to))} fill={b.color} />
          ))}
          {spans.map((s, i) => (
            <rect key={i} x={s.from * W} width={Math.max(2, (s.to - s.from) * W)} y={0} height={H} fill={s.color} />
          ))}
          {area && <path d={fill} fill={`url(#${id}-fill)`} />}
          <path d={line} fill="none" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {endDot && last && (
          <span
            className="line-dot"
            style={{ left: `${(last.i / n) * 100}%`, bottom: `${pctY(last.v)}%`, background: valueStops ? 'var(--text)' : color }}
          />
        )}
      </div>
      {xLabels.length > 0 && (
        <div className="line-x">
          {xLabels.map((l) => (
            <span key={`${l.at}-${l.text}`} style={{ left: `${l.at * 100}%` }}>
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
