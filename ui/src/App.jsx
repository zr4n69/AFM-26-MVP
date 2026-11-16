import { lazy, Suspense, useState } from 'react';
import { FIXED_TEAM_PRESTIGE } from '@engine/data/team-identities.js';
import { listSaveSlots, saveToSlot, loadFromSlot, deleteSlot } from './save-slots.js';
import { CoachPortrait, OvrPill } from './components/Chrome.jsx';

const GameSession = lazy(() => import('./GameSession.jsx'));

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
  if (p >= 4.5) return { label: 'Elite',       color: '#9C7628' };
  if (p >= 3.8) return { label: 'Contender',   color: '#3D7555' };
  if (p >= 3.0) return { label: 'Competitive', color: '#317DA0' };
  if (p >= 2.2) return { label: 'Average',     color: '#58615B' };
  return                 { label: 'Rebuilding', color: '#B44F47' };
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
  { index: 0,  city: 'Florida',      name: 'Corsairs',      primary: '#A8322B', secondary: '#5A5754', logo: `${BASE}logos-franchise-v3/FLA.png` },
  { index: 1,  city: 'Austin',       name: 'Vanguard',      primary: '#D9C9A8', secondary: '#1B3A6B', logo: `${BASE}logos-franchise-v3/AUS.png` },
  { index: 2,  city: 'Columbus',     name: 'Rockets',       primary: '#E8631A', secondary: '#6B6F76', logo: `${BASE}logos-franchise-v3/COL.png` },
  { index: 3,  city: 'Sacramento',   name: 'Prospectors',   primary: '#0B0B12', secondary: '#7A4B2A', logo: `${BASE}logos-franchise-v3/SAC.png` },
  { index: 4,  city: 'Orlando',      name: 'Flight',        primary: '#123D2B', secondary: '#F4F4F4', logo: `${BASE}logos-franchise-v3/ORL.png` },
  { index: 5,  city: 'Memphis',      name: 'Crowns',        primary: '#0E0E10', secondary: '#7B3FA7', logo: `${BASE}logos-franchise-v3/MEM.png` },
  { index: 6,  city: 'Omaha',        name: 'Forge',         primary: '#161719', secondary: '#E15A2A', logo: `${BASE}logos-franchise-v3/OMA.png` },
  { index: 7,  city: 'Raleigh',      name: 'Oakguard',      primary: '#123D2B', secondary: '#1A7A78', logo: `${BASE}logos-franchise-v3/RAL.png` },
  { index: 8,  city: 'Salt Lake',    name: 'Summit',        primary: '#0E0E10', secondary: '#E8C547', logo: `${BASE}logos-franchise-v3/SLC.png` },
  { index: 9,  city: 'Milwaukee',    name: 'Breakers',      primary: '#0E3145', secondary: '#22BBD6', logo: `${BASE}logos-franchise-v3/MIL.png` },
  { index: 10, city: 'San Antonio',  name: 'Marshals',      primary: '#13294B', secondary: '#A8322B', logo: `${BASE}logos-franchise-v3/SA.png`  },
  { index: 11, city: 'Louisville',   name: 'Thoroughbreds', primary: '#F4F4F4', secondary: '#111111', logo: `${BASE}logos-franchise-v3/LOU.png` },
  { index: 12, city: 'Boise',        name: 'Ridgecats',     primary: '#0B1F3A', secondary: '#E8851A', logo: `${BASE}logos-franchise-v3/BOI.png` },
  { index: 13, city: 'Colorado',     name: 'Bighorns',      primary: '#2D3033', secondary: '#8A8F94', logo: `${BASE}logos-franchise-v3/CO.png`  },
  { index: 14, city: 'Albuquerque',  name: 'Outriders',     primary: '#0B0B0D', secondary: '#7A4B2A', logo: `${BASE}logos-franchise-v3/ALB.png` },
  { index: 15, city: 'Providence',   name: 'Ironclads',     primary: '#2F5233', secondary: '#F4F4F4', logo: `${BASE}logos-franchise-v3/PRO.png` },
];


function MainMenu({ onStartGame, onLoadGame }) {
  const [slots, setSlots] = useState(() => listSaveSlots());
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newGameSlot, setNewGameSlot] = useState(null);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [setupStep, setSetupStep] = useState('coach');
  const [coach, setCoach] = useState({ firstName: '', lastName: '', portraitIndex: 0 });
  const refresh = () => setSlots(listSaveSlots());

  function handleDelete(index) {
    deleteSlot(index);
    setConfirmDelete(null);
    refresh();
  }

  async function handleNewGame(slotIndex) {
    const { createLeague } = await import('@engine/data/factories.js');
    const league = createLeague(`afm26-${Date.now()}`, { playerTeamIndex: selectedTeamIndex, coach });
    saveToSlot(league, slotIndex, 'new-game');
    onStartGame(league, slotIndex);
  }

  const selectedTeam = TEAM_OPTIONS[selectedTeamIndex];
  const selectedPrestige = FIXED_TEAM_PRESTIGE[selectedTeam.index];
  const selectedTier = prestigeTier(selectedPrestige);
  const selectedOvr = prestigeOvr(selectedPrestige);
  const selectedStars = prestigeStars(selectedPrestige);

  return (
    <main className="career-entry">
      <div className="career-entry-shell">
        <div className="career-brand">
          <img src={`${BASE}brand/afm-wordmark.svg`} alt="AFM Franchise Football" />
          <p>American Football League · GM Simulation</p>
        </div>

        <div className="career-entry-grid">
          <section className="career-files">
            <header className="career-files-header">
              <div><span>Career command center</span><h1>Front office files</h1></div>
              <b>{slots.filter(slot => slot.occupied).length} / {slots.length} active</b>
            </header>
            <div className="career-slot-list">
            {slots.map(slot => (
            <div key={slot.slotIndex} className="card career-slot" style={{ position: 'relative' }}>
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
                    <button className="btn accent" onClick={() => {
                      setNewGameSlot(slot.slotIndex);
                      setSetupStep('coach');
                      void import('@engine/data/factories.js');
                    }}>New Career</button>
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
            <footer className="career-files-footer"><span>Independent league histories</span><b>Autosave enabled</b></footer>
          </section>

          <aside className="career-league-board">
            <header><span>League register</span><b>16 clubs</b></header>
            <div className="career-club-grid">
              {TEAM_OPTIONS.map(team => (
                <div className="career-club" key={team.index} title={`${team.city} ${team.name}`}>
                  <img src={team.logo} alt="" aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className="career-league-note">
              <strong>Run the whole operation.</strong>
              <p>Roster · Scheme · Contracts · Draft · Game day</p>
            </div>
          </aside>
        </div>

        <div className="career-operations" aria-label="Career management areas">
          <span>Front office loop</span>
          <ol>
            <li><b>01</b> Roster</li><li><b>02</b> Scheme</li><li><b>03</b> Contracts</li><li><b>04</b> Draft</li><li><b>05</b> Game day</li>
          </ol>
        </div>

        {/* Team selection modal */}
        {newGameSlot !== null && (
          <div className="team-picker-overlay" onClick={() => setNewGameSlot(null)}>
            <section
              className="team-picker"
              style={{ '--selected-primary': selectedTeam.primary, '--selected-secondary': selectedTeam.secondary }}
              onClick={event => event.stopPropagation()}
              aria-labelledby="team-picker-title"
            >
              <header className="team-picker-header">
                <div>
                  <span>Franchise board · Career slot {newGameSlot + 1}</span>
                  <h2 id="team-picker-title">{setupStep === 'coach' ? 'Create your coach' : 'Choose your club'}</h2>
                  <p>{setupStep === 'coach' ? 'Build the identity that will lead your full career history.' : 'Review all 16 ownership opportunities and select the franchise you will manage.'}</p>
                </div>
                <button className="team-picker-close" onClick={() => setNewGameSlot(null)} aria-label="Close team selection">×</button>
              </header>

              {setupStep === 'coach' ? (
                <div className="coach-creator">
                  <aside className="coach-creator-preview">
                    <CoachPortrait team={selectedTeam} coach={coach} size={150} portraitIndex={coach.portraitIndex} />
                    <small>Head Coach &amp; General Manager</small>
                    <h3>{coach.firstName || 'First'} {coach.lastName || 'Last'}</h3>
                  </aside>
                  <div className="coach-creator-form">
                    <div className="coach-name-fields">
                      <label>First name<input value={coach.firstName} maxLength={24} onChange={e => setCoach({ ...coach, firstName: e.target.value })} /></label>
                      <label>Surname<input value={coach.lastName} maxLength={24} onChange={e => setCoach({ ...coach, lastName: e.target.value })} /></label>
                    </div>
                    <div className="team-picker-list-head"><span>Choose portrait</span><b>16 options</b></div>
                    <div className="coach-portrait-grid">
                      {Array.from({ length: 16 }, (_, index) => (
                        <button type="button" className={coach.portraitIndex === index ? 'selected' : ''} key={index} onClick={() => setCoach({ ...coach, portraitIndex: index })}>
                          <CoachPortrait team={selectedTeam} portraitIndex={index} size={68} />
                        </button>
                      ))}
                    </div>
                    <button className="btn primary coach-next" disabled={!coach.firstName.trim() || !coach.lastName.trim()} onClick={() => setSetupStep('team')}>Choose franchise →</button>
                  </div>
                </div>
              ) : <div className="team-picker-body">
                <div className="team-picker-list">
                  <div className="team-picker-list-head"><span>League directory</span><b>16 clubs</b></div>
                  <div className="team-picker-grid">
                    {TEAM_OPTIONS.map(team => {
                      const prestige = FIXED_TEAM_PRESTIGE[team.index];
                      const tier = prestigeTier(prestige);
                      const ovr = prestigeOvr(prestige);
                      const selected = selectedTeamIndex === team.index;
                      return (
                        <button
                          type="button"
                          key={team.index}
                          className={`team-option ${selected ? 'selected' : ''}`}
                          style={{ '--team-primary': team.primary }}
                          onClick={() => setSelectedTeamIndex(team.index)}
                          aria-pressed={selected}
                        >
                          <img className="team-option-logo" src={team.logo} alt="" aria-hidden="true" />
                          <span className="team-option-copy">
                            <small>{team.city}</small>
                            <strong>{team.name}</strong>
                            <em><i style={{ color: tier.color }}>{tier.label}</i><span className="team-option-ovr">OVR <OvrPill ovr={ovr} /></span></em>
                          </span>
                          <span className="team-option-status" aria-hidden="true">{selected ? '✓' : String(team.index + 1).padStart(2, '0')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <aside className="team-dossier">
                  <span className="team-dossier-label">Ownership dossier</span>
                  <div className="team-dossier-logo">
                    <img src={selectedTeam.logo} alt={`${selectedTeam.city} ${selectedTeam.name} logo`} />
                  </div>
                  <small>{selectedTeam.city}</small>
                  <h3>{selectedTeam.name}</h3>
                  <div className="team-dossier-rule" />
                  <dl>
                    <div><dt>Roster outlook</dt><dd>{selectedTier.label}</dd></div>
                    <div><dt>Overall</dt><dd><OvrPill ovr={selectedOvr} className="ovr-compact" /></dd></div>
                    <div><dt>Prestige</dt><dd>{selectedStars}</dd></div>
                  </dl>
                  <div className="team-dossier-colors">
                    <span style={{ background: selectedTeam.primary }} />
                    <span style={{ background: selectedTeam.secondary }} />
                    <b>Club palette</b>
                  </div>
                  <div className="team-dossier-actions">
                    <button className="btn primary" onClick={() => handleNewGame(newGameSlot)}>Take control →</button>
                    <button className="team-picker-cancel" onClick={() => setSetupStep('coach')}>← Back to coach</button>
                  </div>
                </aside>
              </div>}
            </section>
          </div>
        )}
      </div>
    </main>
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
      <Suspense fallback={<main className="career-entry"><div className="screen-loading">Opening front office…</div></main>}>
        <GameSession league={activeLeague} slotIndex={activeSlot} onExitToMenu={handleExit} />
      </Suspense>
    );
  }

  return <MainMenu onStartGame={handleStart} onLoadGame={handleStart} />;
}

export default App;
