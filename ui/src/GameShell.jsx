import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useLeague } from './context/league-context.js';
import { Sidebar, ErrorBoundary, CoachPortrait } from './components/Chrome.jsx';
import { CoachDossier } from './components/CoachDossier.jsx';
import { ScreenDashboard } from './screens/Dashboard.jsx';
import { Chyron } from './components/Chyron.jsx';
import { saveToSlot } from './save-slots.js';

function lazyScreen(loader, exportName) {
  return lazy(() => loader().then(module => ({ default: module[exportName] })));
}

const ScreenRoster = lazyScreen(() => import('./screens/Roster.jsx'), 'ScreenRoster');
const ScreenDepthChart = lazyScreen(() => import('./screens/DepthChart.jsx'), 'ScreenDepthChart');
const ScreenStrategy = lazyScreen(() => import('./screens/Strategy.jsx'), 'ScreenStrategy');
const ScreenContracts = lazyScreen(() => import('./screens/Contracts.jsx'), 'ScreenContracts');
const ScreenGameWeek = lazyScreen(() => import('./screens/GameWeek.jsx'), 'ScreenGameWeek');
const ScreenStandings = lazyScreen(() => import('./screens/Standings.jsx'), 'ScreenStandings');
const ScreenLeaders = lazyScreen(() => import('./screens/Leaders.jsx'), 'ScreenLeaders');
const ScreenTraining = lazyScreen(() => import('./screens/Training.jsx'), 'ScreenTraining');
const ScreenScouting = lazyScreen(() => import('./screens/Scouting.jsx'), 'ScreenScouting');
const ScreenDraft = lazyScreen(() => import('./screens/Draft.jsx'), 'ScreenDraft');
const ScreenFreeAgency = lazyScreen(() => import('./screens/FreeAgency.jsx'), 'ScreenFreeAgency');
const ScreenTrades = lazyScreen(() => import('./screens/Trades.jsx'), 'ScreenTrades');
const ScreenAwards = lazyScreen(() => import('./screens/Awards.jsx'), 'ScreenAwards');
const ScreenHallOfFame = lazyScreen(() => import('./screens/HallOfFame.jsx'), 'ScreenHallOfFame');

const SCREENS = {
  dashboard: ScreenDashboard,
  roster: ScreenRoster,
  depth: ScreenDepthChart,
  strategy: ScreenStrategy,
  contracts: ScreenContracts,
  training: ScreenTraining,
  gameweek: ScreenGameWeek,
  standings: ScreenStandings,
  leaders: ScreenLeaders,
  scouting: ScreenScouting,
  draft: ScreenDraft,
  fa: ScreenFreeAgency,
  trades: ScreenTrades,
  awards: ScreenAwards,
  hof: ScreenHallOfFame,
};

// Bottom nav tabs (visible on mobile)
const BOTTOM_TABS = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'roster', label: 'Roster', icon: 'roster' },
  { id: 'gameweek', label: 'Play', icon: 'game' },
  { id: 'standings', label: 'League', icon: 'trophy' },
  { id: '_more', label: 'More', icon: 'menu' },
];

function NavIcon({ name }) {
  const paths = {
    home: <><path d="M3 10.5 10 4l7 6.5" /><path d="M5.5 9v7h9V9M9 16v-4h2v4" /></>,
    roster: <><circle cx="10" cy="7" r="3" /><path d="M4.5 16c.8-3 2.6-4.5 5.5-4.5s4.7 1.5 5.5 4.5" /></>,
    game: <><path d="M5 4.5h10v11H5z" /><path d="M8 7.5v5l4-2.5z" /></>,
    trophy: <><path d="M7 4h6v3.5c0 3-1.2 4.5-3 4.5s-3-1.5-3-4.5z" /><path d="M7 6H4.5c0 2.5 1 3.8 3 4M13 6h2.5c0 2.5-1 3.8-3 4M10 12v3M7 16h6" /></>,
    menu: <><path d="M4 6h12M4 10h12M4 14h12" /></>,
  };
  return <svg viewBox="0 0 20 20" aria-hidden="true">{paths[name]}</svg>;
}

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
            <div className="nav-icon"><NavIcon name={tab.icon} /></div>
            <span>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileMenuOverlay({ open, active, onNav, onClose, onSave, onExit, onCoachOpen, coach, team, season, week }) {
  if (!open) return null;
  return (
    <div className="mobile-menu-overlay open" onClick={onClose}>
      <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
        <div className="menu-header">
          <button type="button" className="mobile-coach-button" onClick={() => { onClose(); onCoachOpen(); }}><CoachPortrait team={team} coach={coach} size={44} /><span><small>{coach?.title}</small><strong>{coach?.firstName} {coach?.lastName}</strong></span></button>
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
  const { userTeam, coach, season, week, actions } = ctx;
  const [presentationLock, setPresentationLock] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [showCoachDossier, setShowCoachDossier] = useState(false);
  const handlePresentationChange = useCallback(snapshot => setPresentationLock(snapshot), []);

  const presentedTeam = presentationLock?.team || userTeam;
  const presentedSeason = presentationLock?.season ?? season;
  const presentedWeek = presentationLock?.week ?? week;

  const save = useCallback(() => {
    try {
      const league = actions.getRawLeague();
      saveToSlot(league, slotIndex, 'manual');
      setLastSaved(new Date().toISOString());
      setSaveError(null);
    } catch (e) {
      console.error('[save]', e);
      setSaveError(e.message);
    }
  }, [actions, slotIndex]);

  useEffect(() => {
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const ScreenComponent = SCREENS[activeScreen];

  return (
    <div className="app">
      <Sidebar
        active={activeScreen}
        onNav={setActiveScreen}
        team={presentedTeam}
        coach={coach}
        onCoachOpen={() => setShowCoachDossier(true)}
        season={presentedSeason}
        week={presentedWeek}
        lastSaved={lastSaved}
        onSave={() => setShowSaveDialog(true)}
        onExit={() => setShowExitDialog(true)}
      />
      <div className="main">
        <Suspense fallback={<div className="screen-loading">Opening personnel file…</div>}>
          <ErrorBoundary key={activeScreen}>
            {ScreenComponent && <ScreenComponent onNav={setActiveScreen} onPresentationChange={handlePresentationChange} />}
          </ErrorBoundary>
        </Suspense>
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
        team={presentedTeam}
        coach={coach}
        onCoachOpen={() => setShowCoachDossier(true)}
        season={presentedSeason}
        week={presentedWeek}
      />

      {/* Broadcast chyron ticker */}
      <Chyron season={presentedSeason} week={presentedWeek} />

      {showCoachDossier && <CoachDossier onClose={() => setShowCoachDossier(false)} />}

      {saveError && (
        <Dialog
          title="Save Failed"
          message={saveError}
          onClose={() => setSaveError(null)}
          actions={<button className="btn" onClick={() => setSaveError(null)}>OK</button>}
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
