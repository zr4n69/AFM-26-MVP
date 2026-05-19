import { useState, useEffect, useCallback } from 'react';
import { useLeague } from './context/LeagueContext.jsx';
import { Sidebar, ErrorBoundary } from './components/Chrome.jsx';
import { ScreenDashboard } from './screens/Dashboard.jsx';
import { ScreenRoster } from './screens/Roster.jsx';
import { ScreenDepthChart } from './screens/DepthChart.jsx';
import { ScreenStrategy } from './screens/Strategy.jsx';
import { ScreenContracts } from './screens/Contracts.jsx';
import { ScreenGameWeek } from './screens/GameWeek.jsx';
import { ScreenStandings } from './screens/Standings.jsx';
import { ScreenLeaders } from './screens/Leaders.jsx';
import { ScreenTraining } from './screens/Training.jsx';
import { ScreenScouting } from './screens/Scouting.jsx';
import { ScreenDraft } from './screens/Draft.jsx';
import { ScreenFreeAgency } from './screens/FreeAgency.jsx';
import { ScreenTrades } from './screens/Trades.jsx';
import { ScreenAwards } from './screens/Awards.jsx';
import { ScreenHallOfFame } from './screens/HallOfFame.jsx';
import { Chyron } from './components/Chyron.jsx';
import { saveToSlot } from './save-slots.js';

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
  const { userTeam, season, week, actions } = ctx;
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const save = useCallback(() => {
    const league = actions.getRawLeague();
    saveToSlot(league, slotIndex, 'manual');
    setLastSaved(new Date().toISOString());
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
        team={userTeam}
        season={season}
        week={week}
        lastSaved={lastSaved}
        onSave={() => setShowSaveDialog(true)}
        onExit={() => setShowExitDialog(true)}
      />
      <div className="main">
        <ErrorBoundary key={activeScreen}>
          {ScreenComponent && <ScreenComponent onNav={setActiveScreen} />}
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
