import { useState, useEffect, useCallback } from 'react';
import { createLeague } from '@engine/data/factories.js';
import { listSaveSlots, saveToSlot, loadFromSlot, deleteSlot, MAX_SLOTS } from './save-slots.js';
import { LeagueProvider } from './context/LeagueContext.jsx';
import { GameShell } from './GameShell.jsx';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function phaseLabel(phase) {
  const labels = {
    offseason: 'Off-Season', preseason: 'Pre-Season',
    regularSeason: 'Regular Season', playoffs: 'Playoffs',
    seasonReview: 'Season Review',
  };
  return labels[phase] ?? phase;
}

const TEAM_OPTIONS = [
  { index: 0, city: 'Portland', name: 'Stags', primary: '#A8322B', secondary: '#5A5754' },
  { index: 1, city: 'Austin', name: 'Founders', primary: '#D9C9A8', secondary: '#1B3A6B' },
  { index: 2, city: 'Columbus', name: 'Comets', primary: '#E8631A', secondary: '#6B6F76' },
  { index: 3, city: 'Sacramento', name: 'Ridgebacks', primary: '#3E1F6B', secondary: '#0B0B12' },
  { index: 4, city: 'Orlando', name: 'Pilots', primary: '#E8851A', secondary: '#F2C94C' },
  { index: 5, city: 'Memphis', name: 'Kings', primary: '#0E0E10', secondary: '#F2F2F2' },
  { index: 6, city: 'Omaha', name: 'Steel', primary: '#5A3A22', secondary: '#1F3B2D' },
  { index: 7, city: 'Raleigh', name: 'Redwoods', primary: '#F4EFE6', secondary: '#C9A227' },
  { index: 8, city: 'Salt Lake', name: 'Summit', primary: '#0E0E10', secondary: '#E8C547' },
  { index: 9, city: 'Milwaukee', name: 'Harbors', primary: '#B11226', secondary: '#E8B042' },
  { index: 10, city: 'San Antonio', name: 'Marshals', primary: '#13294B', secondary: '#A8322B' },
  { index: 11, city: 'Louisville', name: 'Thoroughbreds', primary: '#7A4B2A', secondary: '#F4EAD2' },
  { index: 12, city: 'Boise', name: 'Cutthroats', primary: '#A8322B', secondary: '#E8851A' },
  { index: 13, city: 'Birmingham', name: 'Vulcans', primary: '#0F4C81', secondary: '#3FB8AF' },
  { index: 14, city: 'Albuquerque', name: 'Roadrunners', primary: '#0B1F3A', secondary: '#A8A8AC' },
  { index: 15, city: 'Providence', name: 'Anchors', primary: '#2F5233', secondary: '#F4F4F4' },
];

function MainMenu({ onStartGame, onLoadGame }) {
  const [slots, setSlots] = useState(() => listSaveSlots());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newGameSlot, setNewGameSlot] = useState(null);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const refresh = () => setSlots(listSaveSlots());

  function handleDelete(index) {
    deleteSlot(index);
    setConfirmDelete(null);
    refresh();
  }

  function handleNewGame(slotIndex) {
    const league = createLeague(`afm26-${Date.now()}`, { playerTeamIndex: selectedTeamIndex });
    saveToSlot(league, slotIndex, 'new-game');
    onStartGame(league, slotIndex);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      background: 'var(--bg-0)', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ width: 560, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 8,
            background: 'var(--ink-1)', color: 'white',
            font: '800 18px var(--font-display)', letterSpacing: '0.04em',
            marginBottom: 14,
          }}>AFL</div>
          <h1 style={{ font: '700 28px var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>AFM-26</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>American Football League · GM Simulation</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slots.map(slot => (
            <div key={slot.slotIndex} className="card" style={{ position: 'relative' }}>
              <div className="card-b" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 6, display: 'grid', placeItems: 'center',
                  background: slot.occupied ? 'var(--accent-soft)' : 'var(--bg-3)',
                  color: slot.occupied ? 'var(--accent)' : 'var(--ink-4)',
                  font: '700 14px var(--font-display)',
                }}>{slot.slotIndex + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {slot.occupied ? (
                    <>
                      <div style={{ fontWeight: 700 }}>{slot.teamName}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Season {slot.season} · {phaseLabel(slot.phase)} · {slot.record} · {formatDate(slot.savedAt)}
                      </div>
                    </>
                  ) : (
                    <div className="muted">Empty Slot</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {slot.occupied ? (
                    <>
                      <button className="btn primary" onClick={() => {
                        const league = loadFromSlot(slot.slotIndex);
                        onLoadGame(league, slot.slotIndex);
                      }}>Continue</button>
                      <button className="btn" onClick={() => setConfirmDelete(slot.slotIndex)}>×</button>
                    </>
                  ) : (
                    <button className="btn accent" onClick={() => setNewGameSlot(slot.slotIndex)}>New Career</button>
                  )}
                </div>
              </div>
              {confirmDelete === slot.slotIndex && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 'var(--r-lg)',
                  background: 'rgba(255,255,255,0.95)', display: 'grid', placeItems: 'center',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>Delete this save?</p>
                    <button className="btn" style={{ background: 'var(--neg)', color: 'white', borderColor: 'var(--neg)', marginRight: 6 }}
                      onClick={() => handleDelete(slot.slotIndex)}>Delete</button>
                    <button className="btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Team selection modal */}
        {newGameSlot !== null && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(14,17,22,0.5)',
            display: 'grid', placeItems: 'center',
          }} onClick={() => setNewGameSlot(null)}>
            <div style={{
              width: 640, maxHeight: '80vh', background: 'var(--bg-1)',
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'fadeIn .15s ease-out',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, font: '700 20px var(--font-display)' }}>Choose Your Team</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>Select a team to manage in your new career</p>
                </div>
                <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)' }}
                  onClick={() => setNewGameSlot(null)}>&times;</button>
              </div>
              <div style={{ padding: '16px 24px', maxHeight: '55vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TEAM_OPTIONS.map(t => (
                    <div key={t.index}
                      onClick={() => setSelectedTeamIndex(t.index)}
                      style={{
                        padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                        border: selectedTeamIndex === t.index ? '2px solid var(--accent, #5B6CF0)' : '2px solid var(--line)',
                        background: selectedTeamIndex === t.index ? 'var(--bg-2)' : 'var(--bg-1)',
                        display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'border-color 0.1s, background 0.1s',
                      }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 6, flex: '0 0 36px',
                        background: `linear-gradient(135deg, ${t.primary} 60%, ${t.secondary} 60%)`,
                      }} />
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.city}</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                      </div>
                      {selectedTeamIndex === t.index && (
                        <span style={{ marginLeft: 'auto', color: 'var(--accent, #5B6CF0)', fontWeight: 700, fontSize: 18 }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn" onClick={() => setNewGameSlot(null)}>Cancel</button>
                <button className="btn accent" onClick={() => handleNewGame(newGameSlot)}>
                  Start Career as {TEAM_OPTIONS[selectedTeamIndex].city} {TEAM_OPTIONS[selectedTeamIndex].name}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState('menu');
  const [activeLeague, setActiveLeague] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);

  function handleStart(league, slotIndex) {
    setActiveLeague(league);
    setActiveSlot(slotIndex);
    setScreen('game');
  }

  function handleExit() {
    setActiveLeague(null);
    setActiveSlot(null);
    setScreen('menu');
  }

  if (screen === 'game' && activeLeague) {
    return (
      <LeagueProvider seed={activeLeague.seed} playerTeamIndex={activeLeague.teams.findIndex(t => t.isPlayerControlled)}>
        <GameShell slotIndex={activeSlot} onExitToMenu={handleExit} />
      </LeagueProvider>
    );
  }

  return <MainMenu onStartGame={handleStart} onLoadGame={handleStart} />;
}

export default App;
