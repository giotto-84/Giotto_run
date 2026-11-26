import { useEffect } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { canTrain } from './logic/parq';
import { Icon } from './components/ui';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { PlanScreen } from './screens/PlanScreen';
import { SessionScreen } from './screens/SessionScreen';
import { Player } from './screens/Player';
import { LogRun } from './screens/LogRun';
import { Guide } from './screens/Guide';
import { ExerciseDetail } from './screens/ExerciseDetail';
import { Progress } from './screens/Progress';
import { ProfileScreen } from './screens/ProfileScreen';

const TABS = [
  { to: '/', label: 'Oggi', icon: 'home' },
  { to: '/piano', label: 'Piano', icon: 'plan' },
  { to: '/guida', label: 'Guida', icon: 'book' },
  { to: '/progressi', label: 'Progressi', icon: 'chart' },
  { to: '/profilo', label: 'Profilo', icon: 'user' },
];

function useTheme() {
  const settings = useLiveQuery(() => db.settings.get('me'), []);
  useEffect(() => {
    const t = settings?.theme ?? 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }, [settings?.theme]);
}

function Shell() {
  useTheme();
  const profile = useLiveQuery(() => db.profile.get('me'), [], null);
  const loc = useLocation();

  if (profile === null) return null; // caricamento
  const ready = profile && canTrain(profile);
  if (!ready && !loc.pathname.startsWith('/benvenuto')) return <Navigate to="/benvenuto" replace />;

  const hideTabs = loc.pathname.startsWith('/corsa') || loc.pathname.startsWith('/benvenuto');

  return (
    <>
      <main className={`app${hideTabs ? ' no-tabs' : ''}`}>
        <Routes>
          <Route path="/benvenuto" element={<Onboarding />} />
          <Route path="/" element={<Home />} />
          <Route path="/piano" element={<PlanScreen />} />
          <Route path="/seduta/:id" element={<SessionScreen />} />
          <Route path="/corsa/:id" element={<Player />} />
          <Route path="/registra" element={<LogRun />} />
          <Route path="/guida" element={<Guide />} />
          <Route path="/guida/:id" element={<ExerciseDetail />} />
          <Route path="/progressi" element={<Progress />} />
          <Route path="/profilo" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideTabs && (
        <div className="tabs">
          <nav aria-label="Sezioni">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={t.icon} size={24} />
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
