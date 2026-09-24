export interface BarDatum {
  key: string;
  value: number | null;
  color: string;
  /** X-axis label; empty string hides it. */
  label: string;
  /** Optional value printed above the bar. */
  text?: string;
  active?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  max: number;
  ticks: number[];
  tickFormat?: (value: number) => string;
  height?: number;
  onSelect?: (key: string) => void;
  /** Optional horizontal reference line, e.g. sleep need. */
  reference?: { value: number; label: string };
}

export function BarChart({ data, max, ticks, tickFormat = String, height = 150, onSelect, reference }: BarChartProps) {
  const pct = (v: number) => `calc((100% - 18px) * ${Math.max(0, Math.min(1, v / max))})`;
  const dense = data.length > 14;
  return (
    <div className="chart">
      <div className="chart-plot" style={{ height }}>
        {ticks.map((t) => (
          <div key={t} className="chart-grid" style={{ bottom: pct(t) }}>
            <span>{tickFormat(t)}</span>
          </div>
        ))}
        {reference && (
          <div className="chart-ref" style={{ bottom: pct(reference.value) }}>
            <span>{reference.label}</span>
          </div>
        )}
        <div className={`bars${dense ? ' bars-dense' : ''}`}>
          {data.map((d) => (
            <button
              type="button"
              key={d.key}
              className={`bar-col${d.active ? ' is-active' : ''}`}
              onClick={onSelect ? () => onSelect(d.key) : undefined}
              disabled={!onSelect}
              aria-label={`${d.label || d.key}: ${d.text ?? d.value ?? 'no data'}`}
            >
              {d.text && !dense && <span className="bar-text">{d.text}</span>}
              <span className="bar" style={{ height: d.value === null ? 0 : pct(d.value), background: d.color }} />
            </button>
          ))}
        </div>
      </div>
      <div className={`chart-x${dense ? ' bars-dense' : ''}`}>
        {data.map((d) => (
          <span key={d.key} className={d.active ? 'is-active' : undefined}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
