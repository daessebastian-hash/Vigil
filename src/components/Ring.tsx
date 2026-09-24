import { useEffect, useState, type ReactNode } from 'react';

interface RingProps {
  size: number;
  stroke: number;
  /** 0–1 */
  value: number;
  color: string;
  /** Optional highlighted range drawn just outside the ring, 0–1 fractions. */
  band?: [number, number];
  bandColor?: string;
  children?: ReactNode;
  label?: string;
}

/** Circular gauge that fills clockwise from 12 o'clock. */
export function Ring({ size, stroke, value, color, band, bandColor, children, label }: RingProps) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const bandStroke = band ? Math.max(3, stroke * 0.32) : 0;
  const bandGap = band ? stroke * 0.45 : 0;
  const r = (size - stroke) / 2 - bandStroke - bandGap;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  const rb = r + stroke / 2 + bandGap + bandStroke / 2;
  const cb = 2 * Math.PI * rb;

  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          {band && (
            <circle
              cx={center}
              cy={center}
              r={rb}
              fill="none"
              stroke={bandColor ?? color}
              strokeWidth={bandStroke}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0.001, (band[1] - band[0]) * cb)} ${cb}`}
              strokeDashoffset={-band[0] * cb}
            />
          )}
          <circle
            className="ring-value"
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - shown)}
            opacity={shown > 0.002 ? 1 : 0}
          />
        </g>
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}
