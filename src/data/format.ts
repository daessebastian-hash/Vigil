import { addDays, keyToDate } from './dates';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "7:12" style hours:minutes. */
export function hm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** "7h 12m" style. */
export function hmLong(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m % 60}m`;
}

export function clock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function clockShort(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
}

export function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return 'TODAY';
  if (key === addDays(todayKey, -1)) return 'YESTERDAY';
  const d = keyToDate(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function shortDate(key: string): string {
  const d = keyToDate(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function weekdayInitial(key: string): string {
  return WEEKDAYS[keyToDate(key).getDay()][0];
}

export function weekday(key: string): string {
  return WEEKDAYS[keyToDate(key).getDay()];
}

export function num(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function strainText(strain: number): string {
  return strain.toFixed(1);
}

export function tempText(celsius: number, units: 'metric' | 'imperial'): string {
  return units === 'metric' ? `${celsius.toFixed(1)}°C` : `${(celsius * 1.8 + 32).toFixed(1)}°F`;
}

export function distanceText(km: number, units: 'metric' | 'imperial'): string {
  return units === 'metric' ? `${km.toFixed(1)} km` : `${(km * 0.621371).toFixed(1)} mi`;
}

export function signed(value: number, digits = 0): string {
  const s = value.toFixed(digits);
  return value > 0 ? `+${s}` : s;
}
