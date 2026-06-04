import { useState, useEffect, useCallback } from 'react';
import { createLeague, FIXED_TEAM_PRESTIGE } from '@engine/data/factories.js';
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

const BASE = import.meta.env.BASE_URL;

function prestigeTier(p) {
  if (p >= 4.5) return { label: 'Elite',        color: '#C7FF3E' };
  if (p >= 3.8) return { label: 'Contender',    color: '#4EE6A0' };
  if (p >= 3.0) return { label: 'Competitive',  color: '#4EC9FF' };
  if (p >= 2.2) return { label: 'Average',      color: '#A0A0A8' };
  return             { label: 'Rebuilding',   color: '#FF9F45' };
}

function prestigeOvr(p) {
  return Math.round(62 + (p - 1) * 6.5);
}

function prestigeStars(p) {
  const full = Math.floor(p);
  const half = p - full >= 0.4 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

const TEAM_OPTIONS = [
  { index: 0,  city: 'Florida',      name: 'Buccaneers', primary: '#A8322B', secondary: '#5A5754', logo: `${BASE}logos/FLA.png` },
  { index: 1,  city: 'Austin',       name: 'Founders',   primary: '#D9C9A8', secondary: '#1B3A6B', logo: `${BASE}logos/AUS.png` },
  { index: 2,  city: 'Columbus',     name: 'Rockets',    primary: '#E8631A', secondary: '#6B6F76', logo: `${BASE}logos/COL.png` },
  { index: 3,  city: 'Sacramento',   name: 'Miners',     primary: '#0B0B12', secondary: '#7A4B2A', logo: `${BASE}logos/SAC.png` },
  { index: 4,  city: 'Orlando',      name: 'Pilots',     primary: '#123D2B', secondary: '#F4F4F4', logo: `${BASE}logos/ORL.png` },
  { index: 5,  city: 'Memphis',      name: 'Kings',      primary: '#0E0E10', secondary: '#7B3FA7', logo: `${BASE}logos/MEM.png` },
  { index: 6,  city: 'Omaha',        name: 'Steel',      primary: '#161719', secondary: '#E15A2A', logo: `${BASE}logos/OMA.png` },
  { index: 7,  city: 'Raleigh',      name: 'Redwoods',   primary: '#123D2B', secondary: '#1A7A78', logo: `${BASE}logos/RAL.png` },
  { index: 8,  city: 'Salt Lake',    name: 'Summit',     primary: '#0E0E10', secondary: '#E8C547', logo: `${BASE}logos/SLC.png` },
  { index: 9,  city: 'Milwaukee',    name: 'Harbors',    primary: '#0E3145', secondary: '#22BBD6', logo: `${BASE}logos/MIL.png` },
  { index: 10, city: 'San Antonio',  name: 'Marshals',   primary: '#13294B', secondary: '#A8322B', logo: `${BASE}logos/SA.png`  },
  { index: 11, city: 'Louisville',   name: 'Saints',     primary: '#F4F4F4', secondary: '#111111', logo: `${BASE}logos/LOU.png` },
  { index: 12, city: 'Boise',        name: 'Tigers',     primary: '#0B1F3A', secondary: '#E8851A', logo: `${BASE}logos/BOI.png` },
  { index: 13, city: 'Colorado',     name: 'Vulcans',    primary: '#2D3033', secondary: '#8A8F94', logo: `${BASE}logos/CO.png`  },
  { index: 14, city: 'Albuquerque',  name: 'Rogues',     primary: '#0B0B0D', secondary: '#7A4B2A', logo: `${BASE}logos/ALB.png` },
  { index: 15, city: 'Providence',   name: 'Anchors',    primary: '#2F5233', secondary: '#F4F4F4', logo: `${BASE}logos/PRO.png` },
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
      background: 'var(--turf-0, #0A1419)', fontFamily: 'var(--font-sans)',
      padding: '20px 12px',
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0 1px, transparent 1px 6px), radial-gradient(ellipse at top, rgba(78,216,255,0.06), transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 560, padding: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48,
            background: 'var(--neon, #C7FF3E)', color: 'var(--turf-0, #0A1419)',
            fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20,
            letterSpacing: '0.02em', textTransform: 'uppercase',
            clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)',
            boxShadow: '0 0 16px rgba(199,255,62,0.45)',
            marginBottom: 14,
          }}>AFL</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 400,
            fontSize: 36, margin: '0 0 6px', letterSpacing: '0.03em',
            textTransform: 'uppercase', color: 'var(--chalk, #F4F5EE)',
          }}>AFM-26</h1>
          <p style={{
            fontFamily: 'var(--font-stamp)',
            color: 'var(--neon, #C7FF3E)', fontSize: 12, margin: 0,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>American Football League · GM Simulation</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slots.map(slot => (
            <div key={slot.slotIndex} className="card" style={{ position: 'relative' }}>
              <div className="card-b" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, display: 'grid', placeItems: 'center',
                  background: slot.occupied ? 'var(--neon, #C7FF3E)' : 'var(--turf-3, #1B3A40)',
                  color: slot.occupied ? 'var(--turf-0, #0A1419)' : 'var(--ink-4)',
                  fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18,
                  clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
                  boxShadow: slot.occupied ? '0 0 10px rgba(199,255,62,0.35)' : 'none',
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
                  position: 'absolute', inset: 0,
                  background: 'rgba(10,20,25,0.92)', display: 'grid', placeItems: 'center',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      margin: '0 0 10px', fontSize: 13, fontWeight: 700,
                      fontFamily: 'var(--font-stamp)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'var(--chalk)',
                    }}>Delete this save?</p>
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
            background: 'rgba(10,20,25,0.7)',
            display: 'grid', placeItems: 'center',
          }} onClick={() => setNewGameSlot(null)}>
            <div style={{
              width: '100%', maxWidth: 640, maxHeight: '85vh',
              background: 'var(--turf-1, #0F1E25)',
              border: '2px solid var(--line-1, #2A4A52)',
              overflow: 'hidden', margin: '0 12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(199,255,62,0.1)',
              animation: 'fadeIn .15s ease-out',
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '2px solid var(--line-1, #2A4A52)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(90deg, rgba(199,255,62,0.04), transparent 50%)',
              }}>
                <div>
                  <h2 style={{
                    margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400,
                    fontSize: 22, letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: 'var(--chalk, #F4F5EE)',
                  }}>Choose Your Team</h2>
                  <p style={{
                    margin: '4px 0 0', fontSize: 12,
                    fontFamily: 'var(--font-stamp)',
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                  }}>Select a team to manage in your new career</p>
                </div>
                <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)' }}
                  onClick={() => setNewGameSlot(null)}>&times;</button>
              </div>
              <div style={{ padding: '16px 24px', maxHeight: '55vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: 8 }}>
                  {TEAM_OPTIONS.map(t => {
                    const prestige = FIXED_TEAM_PRESTIGE[t.index];
                    const tier = prestigeTier(prestige);
                    const ovr = prestigeOvr(prestige);
                    const selected = selectedTeamIndex === t.index;
                    return (
                      <div key={t.index}
                        onClick={() => setSelectedTeamIndex(t.index)}
                        style={{
                          padding: '12px 14px', cursor: 'pointer',
                          border: selected ? '2px solid var(--neon, #C7FF3E)' : '2px solid var(--line-1, #2A4A52)',
                          background: selected
                            ? 'linear-gradient(135deg, rgba(199,255,62,0.12), transparent 60%), var(--turf-2, #14292F)'
                            : 'var(--turf-1, #0F1E25)',
                          display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'border-color 0.1s, background 0.1s',
                          boxShadow: selected ? '0 0 12px rgba(199,255,62,0.2)' : 'none',
                        }}>
                        <div style={{
                          width: 42, height: 42, flex: '0 0 42px',
                          borderRadius: 4, overflow: 'hidden',
                          border: `1.5px solid ${t.primary}60`,
                        }}>
                          <img src={t.logo} alt={`${t.city} ${t.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 10, color: 'var(--ink-3)',
                            fontFamily: 'var(--font-stamp)',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                          }}>{t.city}</div>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontWeight: 400,
                            fontSize: 15, letterSpacing: '0.02em', textTransform: 'uppercase',
                            color: 'var(--chalk, #F4F5EE)',
                          }}>{t.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: tier.color, fontFamily: 'var(--font-stamp)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tier.label}</span>
                            <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>OVR {ovr}</span>
                          </div>
                        </div>
                        {selected && (
                          <span style={{ color: 'var(--neon, #C7FF3E)', fontWeight: 700, fontSize: 18 }}>✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Selected team summary */}
              {(() => {
                const t = TEAM_OPTIONS[selectedTeamIndex];
                const prestige = FIXED_TEAM_PRESTIGE[t.index];
                const tier = prestigeTier(prestige);
                const ovr = prestigeOvr(prestige);
                const stars = prestigeStars(prestige);
                return (
                  <div style={{ padding: '12px 24px', background: 'var(--turf-2, #14292F)', borderTop: '1px solid var(--line-1, #2A4A52)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, flex: '0 0 44px', borderRadius: 4, overflow: 'hidden', border: `1.5px solid ${t.primary}60` }}>
                      <img src={t.logo} alt={`${t.city} ${t.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--chalk)' }}>
                        {t.city} {t.name}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: tier.color, fontFamily: 'var(--font-stamp)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tier.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>OVR {ovr}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>{stars}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ padding: '16px 24px', borderTop: '2px solid var(--line-1, #2A4A52)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
      <LeagueProvider key={activeSlot} initialLeague={activeLeague}>
        <GameShell slotIndex={activeSlot} onExitToMenu={handleExit} />
      </LeagueProvider>
    );
  }

  return <MainMenu onStartGame={handleStart} onLoadGame={handleStart} />;
}

export default App;
