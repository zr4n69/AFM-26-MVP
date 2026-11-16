import { useState } from 'react';
import { useLeague } from '../context/league-context.js';
import { Topbar, Avatar, OvrPill, Stars, InjBadge, FatigueBar, TraitBadge } from '../components/Chrome.jsx';
import { GameIcon } from '../components/GameIcon.jsx';
import { formatM, formatDollars } from '../components/formatting.js';
import { TRAIT_DESCRIPTIONS, TRAIT_ICONS } from '../components/trait-data.js';

const FILTERS = ['All', 'Offense', 'Defense', 'Special Teams', 'Injured'];
const OFF_POS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'];
const DEF_POS = ['EDGE', 'DT', 'LB', 'CB', 'S'];
const ST_POS = ['K', 'P', 'LS'];

export function ScreenRoster({ onNav }) {
  const { userTeam, actions } = useLeague();
  const team = userTeam;
  const [filter, setFilter] = useState('All');
  const [sortKey, setSortKey] = useState('ovr');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [cutTarget, setCutTarget] = useState(null);

  if (!team) return null;

  function handleRelease(playerId) {
    actions.releasePlayer(team.id, playerId);
    setSelectedPlayer(null);
  }

  let roster = [...team.roster];
  if (filter === 'Offense') roster = roster.filter(p => OFF_POS.includes(p.pos));
  if (filter === 'Defense') roster = roster.filter(p => DEF_POS.includes(p.pos));
  if (filter === 'Special Teams') roster = roster.filter(p => ST_POS.includes(p.pos));
  if (filter === 'Injured') roster = roster.filter(p => p.injStatus);

  roster.sort((a, b) => {
    if (sortKey === 'ovr') return b.ovr - a.ovr;
    if (sortKey === 'age') return a.age - b.age;
    if (sortKey === 'cap') return b.cap - a.cap;
    if (sortKey === 'pos') return a.pos.localeCompare(b.pos);
    return 0;
  });

  const avgAge = team.roster.length
    ? (team.roster.reduce((s, p) => s + p.age, 0) / team.roster.length).toFixed(1)
    : '—';
  const topPlayer = team.roster.reduce((best, p) => (p.ovr > (best?.ovr || 0) ? p : best), null);

  return (
    <>
      <Topbar
        crumb={`Team / ${team.city} ${team.name}`}
        title="Roster"
        pill={`${team.roster.length} players`}
        actions={
          <>
            <button className="btn" onClick={() => onNav('fa')}>Sign Free Agent</button>
          </>
        }
      />
      <div className="page">
        <div className="grid grid-4 roster-summary">
          <div className="stat-tile">
            <div className="label">Roster Size</div>
            <div className="value">{team.roster.length} <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/55</span></div>
          </div>
          <div className="stat-tile">
            <div className="label">Avg Age</div>
            <div className="value">{avgAge}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Top OVR</div>
            <div className="value value-rating">{topPlayer ? <OvrPill ovr={topPlayer.ovr} className="ovr-featured" /> : '—'}</div>
            <div className="delta">{topPlayer?.name || ''}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Cap Hit</div>
            <div className="value">{formatM(team.payroll)}</div>
            <div className={`delta ${team.capSpace > 0 ? 'pos' : 'neg'}`}>{formatM(team.capSpace)} space</div>
          </div>
        </div>

        <div className="card">
          <div className="card-h roster-controls">
            <div className="tabs roster-filters">
              {FILTERS.map(f => (
                <div key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ borderBottom: 'none', paddingBottom: 8 }}>{f}</div>
              ))}
            </div>
            <div className="right roster-sort">
              <span className="muted">Sort:</span>
              {['ovr', 'pos', 'age', 'cap'].map(k => (
                <span key={k} className={`chip ${sortKey === k ? 'pos' : 'outline'}`} onClick={() => setSortKey(k)} style={{ cursor: 'pointer' }}>{k.toUpperCase()}</span>
              ))}
            </div>
          </div>
          <div className="card-b tight roster-list-body">
            <div className="roster-desktop-table">
              <table className="tbl">
              <thead>
                <tr>
                  <th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">OVR</th><th>Pot</th>
                  <th>Status</th><th className="col-mobile-hide">Fatigue</th><th className="col-mobile-hide">Traits</th>
                  <th className="num col-mobile-hide">Yrs</th><th className="num">Cap</th><th></th>
                </tr>
              </thead>
              <tbody>
                {roster.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => setSelectedPlayer(p)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar player={p} team={team} size={30} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{p.depth === 0 ? 'Starter' : p.depth === 1 ? 'Backup' : 'Depth'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono" onClick={() => setSelectedPlayer(p)}><strong>{p.pos}</strong></td>
                    <td className="num" onClick={() => setSelectedPlayer(p)}>{p.age}</td>
                    <td className="num" onClick={() => setSelectedPlayer(p)}><OvrPill ovr={p.ovr} /></td>
                    <td onClick={() => setSelectedPlayer(p)}><Stars n={p.potential} /></td>
                    <td onClick={() => setSelectedPlayer(p)}><InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></td>
                    <td className="col-mobile-hide" onClick={() => setSelectedPlayer(p)}><FatigueBar value={p.fatigue} /></td>
                    <td className="muted col-mobile-hide" style={{ fontSize: 11 }} onClick={() => setSelectedPlayer(p)}>
                      {p.traits[0]
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <GameIcon name={TRAIT_ICONS[p.traits[0]]} size={13} />
                            {p.traits[0].replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          </span>
                        : '—'}
                    </td>
                    <td className="num mono col-mobile-hide" onClick={() => setSelectedPlayer(p)}>{p.years}</td>
                    <td className="num mono" onClick={() => setSelectedPlayer(p)}>{formatM(p.cap)}</td>
                    <td>
                      <button className="btn" style={{ padding: '3px 8px', fontSize: 10, color: 'var(--neg)', borderColor: 'var(--neg)' }}
                        onClick={(e) => { e.stopPropagation(); setCutTarget(p); }}>Cut</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            <div className="roster-mobile-list">
              {roster.map(p => {
                const role = p.depth === 0 ? 'Starter' : p.depth === 1 ? 'Second unit' : 'Reserve';
                const trait = p.traits[0];
                return (
                  <article className="roster-mobile-player" key={p.id}>
                    <button type="button" className="roster-mobile-player-main" onClick={() => setSelectedPlayer(p)}>
                      <Avatar player={p} team={team} size={46} />
                      <span className="roster-mobile-identity">
                        <strong>{p.name}</strong>
                        <small>{p.pos} · Age {p.age} · {role}</small>
                      </span>
                      <span className="roster-mobile-overall"><small>OVR</small><OvrPill ovr={p.ovr} /></span>
                    </button>
                    <div className="roster-mobile-facts">
                      <span className="roster-mobile-potential"><small>Potential</small><Stars n={p.potential} /></span>
                      <span><small>Cap</small><b>{formatM(p.cap)}</b></span>
                      <span className="roster-mobile-fatigue"><small>Fatigue</small><FatigueBar value={p.fatigue} /></span>
                      <span className="roster-mobile-status"><InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></span>
                      {trait && <span className="roster-mobile-trait"><GameIcon name={TRAIT_ICONS[trait]} size={13} /> {trait.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase())}</span>}
                      <button type="button" className="roster-mobile-release" onClick={() => setCutTarget(p)}>Release</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <PlayerDetailModal player={selectedPlayer} team={team} onClose={() => setSelectedPlayer(null)} onRelease={handleRelease} />
        )}

        {/* Quick Cut confirmation */}
        {cutTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(14,17,22,0.5)', display: 'grid', placeItems: 'center' }}
            onClick={() => setCutTarget(null)}>
            <div className="card" style={{ width: 380, maxWidth: '90vw', animation: 'fadeIn .15s ease-out' }}
              onClick={e => e.stopPropagation()}>
              <div className="card-h"><h2>Release {cutTarget.name}?</h2></div>
              <div className="card-b">
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                  <span className="mono">{cutTarget.pos}</span>
                  <span>Age {cutTarget.age}</span>
                  <OvrPill ovr={cutTarget.ovr} />
                  <span className="muted">{formatM(cutTarget.cap)}/yr</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                  Dead cap: {formatDollars(cutTarget._engine?.contract?.releaseImpact?.deadMoney ?? 0)} · Freed cap: {formatDollars(cutTarget._engine?.contract?.releaseImpact?.capSavings ?? 0)}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setCutTarget(null)}>Cancel</button>
                  <button className="btn" style={{ background: 'var(--neg)', color: 'white', borderColor: 'var(--neg)' }}
                    onClick={() => { handleRelease(cutTarget.id); setCutTarget(null); }}>Confirm Release</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PlayerDetailModal({ player, team, onClose, onRelease }) {
  const p = player;
  const attrs = p.attrs || {};
  const careerStats = p.careerStats || {};
  const seasonStats = p._engine?.stats || {};
  const awards = p._engine?.awards || [];
  const championships = p._engine?.championships || [];
  const origin = p._engine?.origin;
  const [confirmRelease, setConfirmRelease] = useState(false);

  const ratingLabels = {
    awareness: 'Awareness', stamina: 'Stamina', discipline: 'Discipline',
    accuracy: 'Accuracy', armStrength: 'Arm Strength', decisionMaking: 'Decision Making',
    mobility: 'Mobility', poise: 'Poise',
    rushing: 'Rushing', burst: 'Burst', power: 'Power', receiving: 'Receiving', ballSecurity: 'Ball Security',
    routeRunning: 'Route Running', catching: 'Catching', speed: 'Speed', contestedCatch: 'Contested Catch',
    blocking: 'Blocking', passBlock: 'Pass Block', runBlock: 'Run Block', strength: 'Strength',
    passRush: 'Pass Rush', runDefense: 'Run Defense', pursuit: 'Pursuit',
    tackling: 'Tackling', coverage: 'Coverage', blitzing: 'Blitzing', ballSkills: 'Ball Skills',
    kicking: 'Kicking', punting: 'Punting', legStrength: 'Leg Strength',
  };

  const statLabels = {
    passingYards: 'Pass Yds', passingTouchdowns: 'Pass TD', interceptions: 'INT',
    rushingYards: 'Rush Yds', rushingTouchdowns: 'Rush TD',
    receivingYards: 'Rec Yds', receivingTouchdowns: 'Rec TD', receptions: 'Rec',
    sacks: 'Sacks', tackles: 'Tackles', forcedFumbles: 'FF',
  };

  function ratingColor(v) {
    if (v >= 90) return '#9c7628';
    if (v >= 80) return '#3d7555';
    if (v >= 70) return '#317da0';
    if (v >= 60) return '#747b76';
    return '#a44842';
  }

  const depthLabel = p.depth === 0 ? 'Starter' : p.depth === 1 ? 'Second unit' : 'Reserve';
  const seasonStatEntries = Object.entries(seasonStats).filter(([, value]) => value > 0);
  const careerStatEntries = Object.entries(careerStats).filter(([, value]) => value > 0);

  return (
    <div className="player-dossier-overlay" onClick={onClose}>
      <article
        className="player-dossier"
        style={{ '--dossier-primary': team.primary, '--dossier-secondary': team.secondary }}
        onClick={event => event.stopPropagation()}
        aria-label={`${p.name} personnel dossier`}
      >
        <header className="player-dossier-header">
          {team.logo && <img className="player-dossier-team-mark" src={team.logo} alt="" aria-hidden="true" />}
          <div className="player-dossier-kicker">Personnel file · {team.city} {team.name}</div>
          <button className="player-dossier-close" onClick={onClose} aria-label="Close player dossier">×</button>
          <Avatar player={p} team={team} size={82} />
          <div className="player-dossier-identity">
            <h2>{p.name}</h2>
            <p>{p.pos} · Age {p.age} · {depthLabel}</p>
            <div className="player-dossier-trait-strip">
              {p.traits.length > 0 ? p.traits.map(trait => <TraitBadge key={trait} trait={trait} />) : <span>No special traits</span>}
            </div>
          </div>
          <div className="player-dossier-score" style={{ '--overall-color': ratingColor(p.ovr) }}>
            <div className="player-overall-hero"><span>OVR</span><strong>{p.ovr}</strong><i>Overall grade</i></div>
            <div className="player-potential-hero">
              <span>Potential ceiling</span>
              <div className="player-potential-meter" aria-label={`${p.potential} of 5 potential`}>
                {Array.from({ length: 5 }).map((_, index) => <i className={index < p.potential ? 'filled' : ''} key={index} />)}
              </div>
              <b>{p.potential} / 5</b>
            </div>
          </div>
        </header>

        <div className="player-dossier-body">
          <aside className="player-dossier-sidebar">
            <section>
              <h3>Contract sheet</h3>
              <dl className="player-contract-grid">
                <div><dt>Salary</dt><dd>{formatM(p.salary)}<small>/yr</small></dd></div>
                <div><dt>Cap hit</dt><dd>{formatM(p.cap)}<small>/yr</small></dd></div>
                <div><dt>Years left</dt><dd>{p.years}</dd></div>
                <div><dt>Guaranteed</dt><dd>{formatM(p.guaranteed)}</dd></div>
              </dl>
            </section>

            {p.injStatus && (
              <section className="player-injury-note">
                <h3>Medical status</h3>
                <div><InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></div>
                {p._engine?.health?.injury && <p>{p._engine.health.injury}</p>}
              </section>
            )}

            <section>
              <h3>Personnel notes</h3>
              {p.traits.length > 0 ? (
                <div className="player-trait-notes">
                  {p.traits.map(trait => (
                    <div key={trait}>
                      <GameIcon name={TRAIT_ICONS[trait]} size={20} className="trait-detail-icon" />
                      <p><strong>{trait.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase())}</strong>{TRAIT_DESCRIPTIONS[trait] || ''}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="player-dossier-empty">No special personnel notes.</p>}
            </section>
          </aside>

          <main className="player-dossier-evaluation">
            <section>
              <div className="player-dossier-section-head"><h3>Scouting grades</h3><span>{Object.keys(attrs).length} attributes</span></div>
              <div className="player-rating-grid">
                {Object.entries(attrs).map(([key, value]) => (
                  <div className="player-rating" key={key} style={{ '--rating-color': ratingColor(value) }}>
                    <span>{ratingLabels[key] || key}</span>
                    <b>{value}</b>
                    <i><em style={{ width: `${value}%` }} /></i>
                  </div>
                ))}
              </div>
            </section>

            {seasonStatEntries.length > 0 && (
              <section>
                <div className="player-dossier-section-head"><h3>Season production</h3><span>Current season</span></div>
                <div className="player-stat-grid">
                  {seasonStatEntries.map(([key, value]) => (
                    <div key={key}><b>{typeof value === 'number' ? value.toLocaleString() : value}</b><span>{statLabels[key] || key}</span></div>
                  ))}
                </div>
              </section>
            )}

            {careerStatEntries.length > 0 && (
              <section>
                <div className="player-dossier-section-head"><h3>Career production</h3><span>All seasons</span></div>
                <div className="player-stat-grid">
                  {careerStatEntries.map(([key, value]) => (
                    <div key={key}><b>{typeof value === 'number' ? value.toLocaleString() : value}</b><span>{statLabels[key] || key}</span></div>
                  ))}
                </div>
              </section>
            )}

            {(awards.length > 0 || championships.length > 0 || origin) && (
              <section>
                <div className="player-dossier-section-head"><h3>Career file</h3><span>{awards.length + championships.length} honors</span></div>
                <div className="player-awards">
                  <span>{origin?.type === 'draft' ? `Drafted R${origin.round}, Pick ${origin.overallPick || '—'} (S${origin.season})` : origin?.type === 'undrafted' ? `Undrafted free agent (S${origin.season})` : 'Pre-career player'}</span>
                  {awards.map((award, index) => {
                    const awardNames = { mvp: 'MVP', opoy: 'OPOY', dpoy: 'DPOY', offensiveROY: 'Off. ROY', defensiveROY: 'Def. ROY', firstTeamAllPro: '1st Team All-Pro', secondTeamAllPro: '2nd Team All-Pro' };
                    const label = awardNames[award.awardType] || award.awardType || award.type || award;
                    return <span key={index}>{label} {award.season ? `(S${award.season})` : ''}</span>;
                  })}
                  {championships.map((ring, index) => <span key={`ring-${index}`}>League Champion (S{ring.season})</span>)}
                </div>
              </section>
            )}
          </main>
        </div>

        <footer className={`player-dossier-footer${confirmRelease ? ' confirming' : ''}`}>
          {confirmRelease ? (
            <>
              <div><strong>Release {p.name}?</strong><span>Dead money {formatM(p._engine?.contract?.releaseImpact?.deadMoney ?? 0)} · Cap savings {formatM(p._engine?.contract?.releaseImpact?.capSavings ?? 0)}</span></div>
              <div><button className="btn danger" onClick={() => onRelease(p.id)}>Confirm Release</button><button className="btn" onClick={() => setConfirmRelease(false)}>Cancel</button></div>
            </>
          ) : (
            <><button className="btn danger-outline" onClick={() => setConfirmRelease(true)}>Release Player</button><button className="btn" onClick={onClose}>Close file</button></>
          )}
        </footer>
      </article>
    </div>
  );
}
