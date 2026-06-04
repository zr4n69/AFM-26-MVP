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
  { index: 0, city: 'Portland', name: 'Stags', primary: '#A8322B', secondary: '#5A5754', logo: `${BASE}logos/POR.svg` },
  { index: 1, city: 'Austin', name: 'Founders', primary: '#D9C9A8', secondary: '#1B3A6B', logo: `${BASE}logos/AUS.svg` },
  { index: 2, city: 'Columbus', name: 'Comets', primary: '#E8631A', secondary: '#6B6F76', logo: `${BASE}logos/COL.svg` },
  { index: 3, city: 'Sacramento', name: 'Ridgebacks', primary: '#3E1F6B', secondary: '#0B0B12', logo: `${BASE}logos/SAC.svg` },
  { index: 4, city: 'Orlando', name: 'Pilots', primary: '#E8851A', secondary: '#F2C94C', logo: `${BASE}logos/ORL.svg` },
  { index: 5, city: 'Memphis', name: 'Kings', primary: '#0E0E10', secondary: '#F2F2F2', logo: `${BASE}logos/MEM.svg` },
  { index: 6, city: 'Omaha', name: 'Steel', primary: '#5A3A22', secondary: '#1F3B2D', logo: `${BASE}logos/OMA.svg` },
  { index: 7, city: 'Raleigh', name: 'Redwoods', primary: '#F4EFE6', secondary: '#C9A227', logo: `${BASE}logos/RAL.svg` },
  { index: 8, city: 'Salt Lake', name: 'Summit', primary: '#0E0E10', secondary: '#E8C547', logo: `${BASE}logos/SLC.svg` },
  { index: 9, city: 'Milwaukee', name: 'Harbors', primary: '#B11226', secondary: '#E8B042', logo: `${BASE}logos/MIL.svg` },
  { index: 10, city: 'San Antonio', name: 'Marshals', primary: '#13294B', secondary: '#A8322B', logo: `${BASE}logos/SA.svg` },
  { index: 11, city: 'Louisville', name: 'Thoroughbreds', primary: '#7A4B2A', secondary: '#F4EAD2', logo: `${BASE}logos/LOU.svg` },
  { index: 12, city: 'Boise', name: 'Cutthroats', primary: '#A8322B', secondary: '#E8851A', logo: `${BASE}logos/BOI.svg` },
  { index: 13, city: 'Birmingham', name: 'Vulcans', primary: '#0F4C81', secondary: '#3FB8AF', logo: `${BASE}logos/BIR.svg` },
  { index: 14, city: 'Albuquerque', name: 'Roadrunners', primary: '#0B1F3A', secondary: '#A8A8AC', logo: `${BASE}logos/ALB.svg` },
  { index: 15, city: 'Providence', name: 'Anchors', primary: '#2F5233', secondary: '#F4F4F4', logo: `${BASE}logos/PRO.svg` },
];

function TeamSVGIcon({ index }) {
  const v = { viewBox: "0 0 36 36", style: { width: '100%', height: '100%' } };
  const s = { stroke: "white", fill: "none", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (index) {
    case 0: // Portland Stags – antlers
      return <svg {...v}><g {...s}><line x1="18" y1="30" x2="18" y2="21"/><path d="M18 21 C16 18 13 15 10 8"/><path d="M13 15 L15 11.5"/><path d="M18 21 C20 18 23 15 26 8"/><path d="M23 15 L21 11.5"/></g></svg>;
    case 1: // Austin Founders – torch
      return <svg {...v}><g fill="white"><path d="M15 15 C13 12 13 8 16 6 C19 4 22 6 22 9 C22 12 20 14 18 14 Z"/><rect x="16.5" y="14" width="3" height="12" rx="1.5"/><rect x="13" y="25.5" width="10" height="2.5" rx="1.25"/></g></svg>;
    case 2: // Columbus Comets – comet
      return <svg {...v}><circle cx="23" cy="12" r="5.5" fill="white"/><line x1="18.5" y1="16.5" x2="8" y2="25" stroke="white" strokeWidth="3" strokeLinecap="round"/><line x1="17" y1="19" x2="8" y2="27" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/></svg>;
    case 3: // Sacramento Ridgebacks – dorsal spine
      return <svg {...v}><path d="M5 25 L10 15 L15 21 L20 11 L25 19 L31 13" {...s} strokeWidth="2.5"/></svg>;
    case 4: // Orlando Pilots – wings
      return <svg {...v}><g fill="white"><path d="M18 21 L4 13 C5 16 7 19 10 20 L18 23 L26 20 C29 19 31 16 32 13 Z"/><ellipse cx="18" cy="20" rx="2" ry="4"/></g></svg>;
    case 5: // Memphis Kings – crown
      return <svg {...v}><path d="M7 29 L7 19 L12.5 24.5 L18 13 L23.5 24.5 L29 19 L29 29 Z" fill="white"/></svg>;
    case 6: // Omaha Steel – I-beam
      return <svg {...v}><g fill="white"><rect x="10" y="10" width="16" height="3.5" rx="1"/><rect x="16" y="13.5" width="4" height="9"/><rect x="10" y="22.5" width="16" height="3.5" rx="1"/></g></svg>;
    case 7: // Raleigh Redwoods – pine tree
      return <svg {...v}><g fill="white"><polygon points="18,7 29,26 7,26"/><rect x="16" y="26" width="4" height="4" rx="1"/></g></svg>;
    case 8: // Salt Lake Summit – mountain
      return <svg {...v}><g fill="white"><path d="M4 30 L18 8 L32 30 Z"/><polygon points="13,20 18,8 23,20" fill="rgba(0,0,0,0.28)"/></g></svg>;
    case 9: // Milwaukee Harbors – sailboat / harbor
      return <svg {...v}><g {...s}><path d="M8 24 L10 28 L26 28 L28 24 Z" fill="white"/><line x1="18" y1="24" x2="18" y2="10"/><path d="M18 10 L12 20 L18 20 Z" fill="white"/><path d="M18 12 L26 22 L18 22 Z" fill="white" opacity="0.65"/></g></svg>;
    case 10: // San Antonio Marshals – star badge
      return <svg {...v}><polygon points="18,5 20.6,13.3 29.4,13.3 22.4,18.5 25.1,26.8 18,21.7 10.9,26.8 13.6,18.5 6.6,13.3 15.4,13.3" fill="white"/></svg>;
    case 11: // Louisville Thoroughbreds – horse head
      return <svg {...v}><g fill="white"><path d="M24 9 C26 10 27 13 26 17 C25 21 22 24 19 25 L19 30 L14 30 L14 24 C10 22 9 18 10 14 C11 9 15 7 18 7 C20 7 22 8 24 9 Z"/><path d="M21 7 L25 5 L26 9" fill="none" {...s} strokeWidth="1.8"/></g></svg>;
    case 12: // Boise Cutthroats – crossed blades
      return <svg {...v}><g stroke="white" strokeLinecap="round"><path d="M9 27 L27 9" strokeWidth="3" fill="none"/><path d="M27 27 L9 9" strokeWidth="3" fill="none"/><path d="M7 29 L9 27" strokeWidth="2" fill="none"/><path d="M29 7 L27 9" strokeWidth="2" fill="none"/></g></svg>;
    case 13: // Birmingham Vulcans – forge hammer
      return <svg {...v}><g fill="white"><rect x="8" y="9" width="17" height="10" rx="2"/><rect x="17" y="18" width="5" height="12" rx="1.5"/></g></svg>;
    case 14: // Albuquerque Roadrunners – roadrunner bird
      return <svg {...v}><g fill="white"><ellipse cx="16" cy="20" rx="7" ry="5"/><circle cx="24" cy="14" r="4"/><path d="M23 12 L25 9 L27 12" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M24 12 L31 10" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M10 23 L4 27 L10 26 Z"/><path d="M11 25 L5 30 L11 29 Z" opacity="0.55"/></g></svg>;
    case 15: // Providence Anchors – anchor
      return <svg {...v}><g {...s}><circle cx="18" cy="11" r="3"/><line x1="18" y1="14" x2="18" y2="28"/><line x1="11" y1="19" x2="25" y2="19"/><path d="M11 28 C11 28 11 23 18 23 C25 23 25 28 25 28"/></g></svg>;
    default:
      return <svg {...v}><circle cx="18" cy="18" r="10" fill="white" opacity="0.5"/></svg>;
  }
}

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
                          width: 36, height: 36, flex: '0 0 36px',
                          background: t.primary,
                          display: 'grid', placeItems: 'center',
                          borderRadius: 4, overflow: 'hidden',
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                          padding: 5,
                        }}>
                          <TeamSVGIcon index={t.index} />
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
                    <div style={{ width: 40, height: 40, flex: '0 0 40px', background: t.primary, display: 'grid', placeItems: 'center', borderRadius: 4, overflow: 'hidden', padding: 6 }}>
                      <TeamSVGIcon index={t.index} />
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
