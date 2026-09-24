import { useState } from 'react';
import type { Day } from '../data/types';
import { useStore } from '../state/store';
import { window as dayWindow, mean } from '../data/insights';
import { shortDate, weekdayInitial } from '../data/format';
import { BarChart } from './BarChart';
import { SectionTitle, Segmented } from './ui';

type Range = '1w' | '1m' | '3m';
const RANGE_DAYS: Record<Range, number> = { '1w': 7, '1m': 30, '3m': 90 };
const RANGES: { value: Range; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
];

interface TrendCardProps {
  title: string;
  get: (d: Day) => number;
  color: (d: Day) => string;
  max: number;
  ticks: number[];
  tickFormat?: (v: number) => string;
  format: (v: number) => string;
  /** Leave today's bar out of the average when the day is still in progress. */
  skipPartialToday?: boolean;
  reference?: { value: number; label: string };
}

export function TrendCard({ title, get, color, max, ticks, tickFormat, format, skipPartialToday, reference }: TrendCardProps) {
  const { days, selectedKey, setSelectedKey } = useStore();
  const [range, setRange] = useState<Range>('1w');
  const slice = dayWindow(days, selectedKey, RANGE_DAYS[range]);
  const every = range === '1m' ? 7 : 21;
  const last = slice.length - 1;
  const data = slice.map((d, i) => ({
    key: d.key,
    value: get(d),
    color: color(d),
    label: range === '1w' ? weekdayInitial(d.key) : (last - i) % every === 0 ? shortDate(d.key) : '',
    text: format(get(d)),
    active: d.key === selectedKey,
  }));
  const forAverage = skipPartialToday ? slice.filter((d) => !d.isToday) : slice;
  const avg = mean(forAverage.map(get));

  return (
    <section className="section">
      <SectionTitle action={<Segmented label={`${title} range`} options={RANGES} value={range} onChange={setRange} />}>{title}</SectionTitle>
      <div className="card">
        <div className="trend-avg">
          <span>{range === '1w' ? '7' : RANGE_DAYS[range]}-day average</span>
          <b>{format(avg)}</b>
        </div>
        <BarChart data={data} max={max} ticks={ticks} tickFormat={tickFormat} onSelect={setSelectedKey} reference={reference} />
      </div>
    </section>
  );
}
