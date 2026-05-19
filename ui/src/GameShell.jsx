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

function Dialog({ title, message, actions, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(14,17,22,0.45)',
      display: 'grid', placeItems: 'center',
    }} onClick={onClose}>
      <div className="card" style={{
        width: 380, animation: 'fadeIn .15s ease-out',
      }} onClick={e => e.stopPropagation()}>
        <div className="card-h"><h2>{title}</h2></div>
        <div className="card-b">
          <p style={{ fontSize: 13, margin: '0 0 16px', color: 'var(--ink-3)' }}>{message}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {actions}
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
