import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Activity, Day } from '../data/types';
import { generateHistory } from '../data/generate';
import { cycleKey } from '../data/dates';
import { finalizeDay, startOfDayMs } from '../data/physiology';
import { newSession, retick, sessionToActivity, type LiveSession } from '../data/live';
import type { ActivityKind } from '../data/types';

export type Units = 'metric' | 'imperial';

interface Persisted {
  userActivities: Activity[];
  journal: Record<string, Record<string, boolean>>;
  units: Units;
  live: LiveSession | null;
}

const STORAGE_KEY = 'vigil:v1';
const EMPTY: Persisted = { userActivities: [], journal: {}, units: 'metric', live: null };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(state: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode, sandboxed previews); the app still works in memory.
  }
}

interface Store {
  days: Day[];
  todayKey: string;
  selectedKey: string;
  selectedDay: Day;
  setSelectedKey: (key: string) => void;
  dayByKey: (key: string) => Day | undefined;
  activityById: (id: string) => { day: Day; activity: Activity } | undefined;
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  journal: Record<string, Record<string, boolean>>;
  setJournalAnswer: (key: string, questionId: string, value: boolean | null) => void;
  units: Units;
  setUnits: (units: Units) => void;
  live: LiveSession | null;
  startLive: (kind: ActivityKind) => void;
  updateLive: (patch: Partial<Pick<LiveSession, 'speed' | 'paused'>>) => void;
  finishLive: (keep: boolean) => Activity | null;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

const REFRESH_MS = 5 * 60_000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(load);
  const [now, setNow] = useState(() => Date.now());
  const todayKey = cycleKey(new Date(now));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  useEffect(() => save(persisted), [persisted]);

  // Keep "today" moving: re-simulate the day in progress every few minutes.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const baseDays = useMemo(() => generateHistory(new Date(now)), [now]);

  const days = useMemo(() => {
    if (!persisted.userActivities.length) return baseDays;
    return baseDays.map((day) => {
      const from = startOfDayMs(day.key);
      const to = from + 86_400_000;
      const extra = persisted.userActivities.filter((a) => a.start >= from && a.start < to);
      return extra.length ? finalizeDay(day, [...day.activities, ...extra]) : day;
    });
  }, [baseDays, persisted.userActivities]);

  const dayByKey = useCallback((key: string) => days.find((d) => d.key === key), [days]);
  const selectedDay = dayByKey(selectedKey) ?? days[days.length - 1];

  const activityById = useCallback(
    (id: string) => {
      for (const day of days) {
        const activity = day.activities.find((a) => a.id === id);
        if (activity) return { day, activity };
      }
      return undefined;
    },
    [days],
  );

  const addActivity = useCallback((activity: Activity) => {
    setPersisted((p) => ({ ...p, userActivities: [...p.userActivities, activity] }));
  }, []);

  const removeActivity = useCallback((id: string) => {
    setPersisted((p) => ({ ...p, userActivities: p.userActivities.filter((a) => a.id !== id) }));
  }, []);

  const setJournalAnswer = useCallback((key: string, questionId: string, value: boolean | null) => {
    setPersisted((p) => {
      const entry = { ...(p.journal[key] ?? {}) };
      if (value === null) delete entry[questionId];
      else entry[questionId] = value;
      return { ...p, journal: { ...p.journal, [key]: entry } };
    });
  }, []);

  const setUnits = useCallback((units: Units) => setPersisted((p) => ({ ...p, units })), []);

  const startLive = useCallback((kind: ActivityKind) => {
    setPersisted((p) => ({ ...p, live: newSession(kind, Date.now()) }));
  }, []);

  const updateLive = useCallback((patch: Partial<Pick<LiveSession, 'speed' | 'paused'>>) => {
    setPersisted((p) => (p.live ? { ...p, live: retick(p.live, Date.now(), patch) } : p));
  }, []);

  const finishLive = useCallback(
    (keep: boolean) => {
      const session = persisted.live;
      const activity = keep && session ? sessionToActivity(session, Date.now()) : null;
      setPersisted((p) => ({
        ...p,
        live: null,
        userActivities: activity ? [...p.userActivities, activity] : p.userActivities,
      }));
      return activity;
    },
    [persisted.live],
  );

  const resetDemo = useCallback(() => {
    setPersisted(EMPTY);
    setSelectedKey(cycleKey(new Date()));
  }, []);

  const value: Store = {
    days,
    todayKey,
    selectedKey,
    selectedDay,
    setSelectedKey,
    dayByKey,
    activityById,
    addActivity,
    removeActivity,
    journal: persisted.journal,
    setJournalAnswer,
    units: persisted.units,
    setUnits,
    live: persisted.live,
    startLive,
    updateLive,
    finishLive,
    resetDemo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
