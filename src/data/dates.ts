export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** The physiological day in progress. Before 4 AM we are still in yesterday's cycle. */
export function cycleKey(now: Date): string {
  const d = new Date(now);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  return dateKey(d);
}
