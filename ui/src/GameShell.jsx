import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useLeague } from './context/LeagueContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { Sidebar, ErrorBoundary } from './components/Chrome.jsx';
import { Chyron } from './components/Chyron.jsx';
import { saveToSlot } from './save-slots.js';
import { uploadCloudSave } from './cloud-saves.js';

function lazyNamed(loader, exportName) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

const SCREENS = {
  dashboard: lazyNamed(() => import('./screens/Dashboard.jsx'), 'ScreenDashboard'),
  roster: lazyNamed(() => import('./screens/Roster.jsx'), 'ScreenRoster'),
  depth: lazyNamed(() => import('./screens/DepthChart.jsx'), 'ScreenDepthChart'),
  strategy: lazyNamed(() => import('./screens/Strategy.jsx'), 'ScreenStrategy'),
  contracts: lazyNamed(() => import('./screens/Contracts.jsx'), 'ScreenContracts'),
  training: lazyNamed(() => import('./screens/Training.jsx'), 'ScreenTraining'),
  gameweek: lazyNamed(() => import('./screens/GameWeek.jsx'), 'ScreenGameWeek'),
  standings: lazyNamed(() => import('./screens/Standings.jsx'), 'ScreenStandings'),
  leaders: lazyNamed(() => import('./screens/Leaders.jsx'), 'ScreenLeaders'),
  scouting: lazyNamed(() => import('./screens/Scouting.jsx'), 'ScreenScouting'),
  draft: lazyNamed(() => import('./screens/Draft.jsx'), 'ScreenDraft'),
  fa: lazyNamed(() => import('./screens/FreeAgency.jsx'), 'ScreenFreeAgency'),
  trades: lazyNamed(() => import('./screens/Trades.jsx'), 'ScreenTrades'),
  awards: lazyNamed(() => import('./screens/Awards.jsx'), 'ScreenAwards'),
  hof: lazyNamed(() => import('./screens/HallOfFame.jsx'), 'ScreenHallOfFame'),
};

// Bottom nav tabs (visible on mobile)
const BOTTOM_TABS = [
  { id: 'dashboard', label: 'Home', icon: '⌂' },
  { id: 'roster', label: 'Roster', icon: '\u{1F464}' },
  { id: 'gameweek', label: 'Play', icon: '▶' },
  { id: 'standings', label: 'League', icon: '\u{1F3C6}' },
  { id: '_more', label: 'More', icon: '≡' },
];

// All screens grouped for the "More" menu
const MENU_SECTIONS = [
  { label: 'Team', items: [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'roster', name: 'Roster' },
    { id: 'depth', name: 'Depth Chart' },
    { id: 'strategy', name: 'Strategy' },
    { id: 'contracts', name: 'Contracts' },
    { id: 'training', name: 'Training' },
  ]},
  { label: 'Season', items: [
    { id: 'gameweek', name: 'Game Week' },
    { id: 'standings', name: 'Standings' },
    { id: 'leaders', name: 'Leaders' },
  ]},
  { label: 'Front Office', items: [
    { id: 'scouting', name: 'Scouting' },
    { id: 'draft', name: 'Draft' },
    { id: 'fa', name: 'Free Agency' },
    { id: 'trades', name: 'Trade Center' },
  ]},
  { label: 'League', items: [
    { id: 'awards', name: 'Awards' },
    { id: 'hof', name: 'Hall of Fame' },
  ]},
];

function Dialog({ title, message, actions, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,20,25,0.7)',
      display: 'grid', placeItems: 'center',
    }} onClick={onClose}>
      <div className="card" style={{
        width: 380, maxWidth: '90vw', animation: 'fadeIn .15s ease-out',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 20px rgba(199,255,62,0.08)',
      }} onClick={e => e.stopPropagation()}>
        <div className="card-h"><h2>{title}</h2></div>
        <div className="card-b">
          <p style={{ fontSize: 13, margin: '0 0 16px', color: 'var(--ink-3)' }}>{message}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ active, onNav, onMore }) {
  return (
    <div className="mobile-nav">
      <div className="mobile-nav-inner">
        {BOTTOM_TABS.map(tab => (
          <div
            key={tab.id}
            className={`mobile-nav-item ${active === tab.id ? 'active' : ''}`}
            onClick={() => tab.id === '_more' ? onMore() : onNav(tab.id)}
          >
            <div className="nav-icon">{tab.icon}</div>
            <span>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMenuOverlay({ open, active, onNav, onClose, onSave, onExit, team, season, week }) {
  if (!open) return null;
  return (
    <div className="mobile-menu-overlay open" onClick={onClose}>
      <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
        <div className="menu-header">
          <h3>{team?.city} {team?.name}</h3>
          <button className="btn sm" onClick={onClose}>&times;</button>
        </div>
        <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 12 }}>
          <span>Season {season}</span>
          <span>Week {week}</span>
        </div>
        {MENU_SECTIONS.map(section => (
          <div className="menu-section" key={section.label}>
            <div className="menu-section-label">{section.label}</div>
            {section.items.map(item => (
              <div
                key={item.id}
                className={`menu-item ${active === item.id ? 'active' : ''}`}
                onClick={() => { onNav(item.id); onClose(); }}
              >
                {item.name}
              </div>
            ))}
          </div>
        ))}
        <div className="menu-section" style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}>
          <div className="menu-item" onClick={() => { onSave(); onClose(); }}>
            Save Game
          </div>
          <div className="menu-item" style={{ color: 'var(--neg)' }} onClick={() => { onExit(); onClose(); }}>
            Exit to Menu
          </div>
        </div>
      </div>
    </div>
  );
}

export function GameShell({ slotIndex, onExitToMenu }) {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const ctx = useLeague();
  const { user } = useAuth();
  const { userTeam, season, week, actions, revision, actionError } = ctx;
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const initialRevision = useRef(true);

  const persist = useCallback((reason = 'manual') => {
    try {
      const league = actions.getRawLeague();
      const snapshot = saveToSlot(league, slotIndex, reason);
      if (user) {
        uploadCloudSave(user.id, slotIndex, snapshot).catch((error) => {
          console.error('[cloud-save]', error);
          setSaveError(`Saved offline, but cloud sync failed: ${error.message}`);
        });
      }
      setLastSaved(new Date().toISOString());
      setSaveError(null);
      return true;
    } catch (e) {
      console.error(`[${reason}]`, e);
      setSaveError(e.message);
      return false;
    }
  }, [actions, slotIndex, user]);
  const save = useCallback(() => persist('manual'), [persist]);

  useEffect(() => {
    if (initialRevision.current) {
      initialRevision.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => persist('autosave'), 750);
    return () => window.clearTimeout(timer);
  }, [revision, persist]);

  useEffect(() => {
    function handleBeforeUnload(e) {
      persist('before-unload');
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persist]);

  const ScreenComponent = SCREENS[activeScreen];

  return (
    <div className="app">
      <Sidebar
        active={activeScreen}
        onNav={setActiveScreen}
        team={userTeam}
        season={season}
        week={week}
        lastSaved={lastSaved}
        onSave={() => setShowSaveDialog(true)}
        onExit={() => setShowExitDialog(true)}
      />
      <div className="main">
        <ErrorBoundary key={activeScreen}>
          <Suspense fallback={<div className="card"><div className="card-b muted">Loading…</div></div>}>
            {ScreenComponent && <ScreenComponent onNav={setActiveScreen} />}
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        active={activeScreen}
        onNav={setActiveScreen}
        onMore={() => setShowMobileMenu(true)}
      />

      {/* Mobile "More" menu overlay */}
      <MobileMenuOverlay
        open={showMobileMenu}
        active={activeScreen}
        onNav={setActiveScreen}
        onClose={() => setShowMobileMenu(false)}
        onSave={save}
        onExit={onExitToMenu}
        team={userTeam}
        season={season}
        week={week}
      />

      {/* Broadcast chyron ticker */}
      <Chyron season={season} week={week} />

      {saveError && (
        <Dialog
          title="Save Failed"
          message={saveError}
          onClose={() => setSaveError(null)}
          actions={<button className="btn" onClick={() => setSaveError(null)}>OK</button>}
        />
      )}

      {actionError && (
        <Dialog
          title="Action Required"
          message={actionError}
          onClose={actions.clearActionError}
          actions={<button className="btn" onClick={actions.clearActionError}>OK</button>}
        />
      )}

      {showSaveDialog && (
        <Dialog
          title="Save Game"
          message={`Save current progress to Slot ${slotIndex + 1}?`}
          onClose={() => setShowSaveDialog(false)}
          actions={<>
            <button className="btn primary" onClick={() => { save(); setShowSaveDialog(false); }}>Save</button>
            <button className="btn" onClick={() => setShowSaveDialog(false)}>Cancel</button>
          </>}
        />
      )}

      {showExitDialog && (
        <Dialog
          title="Exit to Main Menu"
          message="Would you like to save before exiting?"
          onClose={() => setShowExitDialog(false)}
          actions={<>
            <button className="btn primary" onClick={() => { save(); onExitToMenu(); }}>Save & Exit</button>
            <button className="btn" style={{ background: 'var(--neg)', color: 'white', borderColor: 'var(--neg)' }}
              onClick={onExitToMenu}>Exit Without Saving</button>
            <button className="btn" onClick={() => setShowExitDialog(false)}>Cancel</button>
          </>}
        />
      )}
    </div>
  );
}
