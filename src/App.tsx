import { useEffect, useRef } from 'react';
import { HashRouter, MemoryRouter, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { House, HeartPulse, Menu, Sparkles, Users } from 'lucide-react';
import { StoreProvider } from './state/store';
import { Home } from './screens/Home';
import { Recovery } from './screens/Recovery';
import { Strain } from './screens/Strain';
import { Sleep } from './screens/Sleep';
import { ActivityDetail } from './screens/ActivityDetail';
import { Health } from './screens/Health';
import { Coach } from './screens/Coach';
import { Community } from './screens/Community';
import { More } from './screens/More';
import { Journal } from './screens/Journal';
import { StartActivity } from './screens/StartActivity';
import { Live } from './screens/Live';
import { AddActivity } from './screens/AddActivity';

const TABS = [
  { to: '/', label: 'Home', icon: House },
  { to: '/health', label: 'Health', icon: HeartPulse },
  { to: '/coach', label: 'Coach', icon: Sparkles },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/more', label: 'More', icon: Menu },
];

/** Full-screen flows that hide the tab bar. */
const IMMERSIVE = ['/start', '/live', '/add'];

function Shell() {
  const { pathname } = useLocation();
  const viewport = useRef<HTMLElement>(null);
  const immersive = IMMERSIVE.includes(pathname);

  useEffect(() => {
    viewport.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <main ref={viewport} className={`viewport${immersive ? ' is-immersive' : ''}`} key={pathname}>
        <Outlet />
      </main>
      {!immersive && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
              <Icon size={22} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

// The single-file preview runs inside a sandboxed frame, so it keeps routes in memory.
const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter;

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="recovery" element={<Recovery />} />
            <Route path="strain" element={<Strain />} />
            <Route path="sleep" element={<Sleep />} />
            <Route path="activity/:id" element={<ActivityDetail />} />
            <Route path="health" element={<Health />} />
            <Route path="coach" element={<Coach />} />
            <Route path="community" element={<Community />} />
            <Route path="more" element={<More />} />
            <Route path="journal" element={<Journal />} />
            <Route path="start" element={<StartActivity />} />
            <Route path="live" element={<Live />} />
            <Route path="add" element={<AddActivity />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  );
}
