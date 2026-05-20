import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, Avatar, OvrPill, Stars, InjBadge, FatigueBar, TraitBadge, formatM } from '../components/Chrome.jsx';

const FILTERS = ['All', 'Offense', 'Defense', 'Special Teams', 'Injured'];
const OFF_POS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'];
const DEF_POS = ['EDGE', 'DT', 'LB', 'CB', 'S'];
const ST_POS = ['K', 'P', 'LS'];

export function ScreenRoster({ onNav }) {
  const { userTeam } = useLeague();
  const team = userTeam;
  if (!team) return null;

  const [filter, setFilter] = useState('All');
  const [sortKey, setSortKey] = useState('ovr');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
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
            <div className="value">{topPlayer?.ovr || '—'}</div>
            <div className="delta">{topPlayer?.name || ''}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Cap Hit</div>
            <div className="value">{formatM(team.payroll)}</div>
            <div className={`delta ${team.capSpace > 0 ? 'pos' : 'neg'}`}>{formatM(team.capSpace)} space</div>
          </div>
        </div>

        <div className="card">
          <div className="card-h" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="tabs" style={{ border: 'none', margin: 0 }}>
              {FILTERS.map(f => (
                <div key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ borderBottom: 'none', paddingBottom: 8 }}>{f}</div>
              ))}
            </div>
            <div className="right" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="muted">Sort:</span>
              {['ovr', 'pos', 'age', 'cap'].map(k => (
                <span key={k} className={`chip ${sortKey === k ? 'pos' : 'outline'}`} onClick={() => setSortKey(k)} style={{ cursor: 'pointer' }}>{k.toUpperCase()}</span>
              ))}
            </div>
          </div>
          <div className="card-b tight">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">OVR</th><th>Pot</th>
                  <th>Status</th><th className="col-mobile-hide">Fatigue</th><th className="col-mobile-hide">Traits</th>
                  <th className="num col-mobile-hide">Yrs</th><th className="num">Cap</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(p => (
                  <tr key={p.id} onClick={() => setSelectedPlayer(p)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar player={p} team={team} size={30} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{p.depth === 0 ? 'Starter' : p.depth === 1 ? 'Backup' : 'Depth'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono"><strong>{p.pos}</strong></td>
                    <td className="num">{p.age}</td>
                    <td className="num"><OvrPill ovr={p.ovr} /></td>
                    <td><Stars n={p.potential} /></td>
                    <td><InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></td>
                    <td className="col-mobile-hide"><FatigueBar value={p.fatigue} /></td>
                    <td className="muted col-mobile-hide" style={{ fontSize: 11 }}>{p.traits.join(' · ') || '—'}</td>
                    <td className="num mono col-mobile-hide">{p.years}</td>
                    <td className="num mono">{formatM(p.cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <PlayerDetailModal player={selectedPlayer} team={team} onClose={() => setSelectedPlayer(null)} />
        )}
      </div>
    </>
  );
}

function PlayerDetailModal({ player, team, onClose }) {
  const p = player;
  const attrs = p.attrs || {};
  const careerStats = p.careerStats || {};
  const seasonStats = p._engine?.stats || {};
  const awards = p._engine?.awards || [];

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
    if (v >= 90) return '#7B2FF7';
    if (v >= 80) return '#2563EB';
    if (v >= 70) return '#B8860B';
    if (v >= 60) return '#6B7280';
    return '#92400E';
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(14,17,22,0.5)', display: 'grid', placeItems: 'center' }}
      onClick={onClose}>
      <div className="card" style={{ width: '95vw', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', animation: 'fadeIn .15s ease-out' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
          background: `linear-gradient(135deg, ${team.primary} 60%, ${team.secondary} 60%)`,
          color: 'white', borderRadius: '8px 8px 0 0',
        }}>
          <Avatar player={p} team={team} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ font: '700 22px var(--font-display)' }}>{p.name}</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{p.pos} · Age {p.age} · {p.depth === 0 ? 'Starter' : p.depth === 1 ? 'Backup' : 'Depth'}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {p.traits.length > 0 ? p.traits.map(t => <TraitBadge key={t} trait={t} />) : <span>No special traits</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <OvrPill ovr={p.ovr} />
            <div style={{ marginTop: 8 }}><Stars n={p.potential} /></div>
          </div>
        </div>

        <div className="card-b" style={{ padding: '16px 24px' }}>
          {/* Contract Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, marginBottom: 20, textAlign: 'center' }}>
            <div><div className="muted" style={{ fontSize: 11 }}>Salary</div><div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatM(p.salary)}/yr</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Cap Hit</div><div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatM(p.cap)}/yr</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Years Left</div><div style={{ fontWeight: 700 }}>{p.years}</div></div>
            <div><div className="muted" style={{ fontSize: 11 }}>Guaranteed</div><div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatM(p.guaranteed)}</div></div>
          </div>

          {/* Injury Status */}
          {p.injStatus && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FFF5F5', borderRadius: 6, border: '1px solid #FEE2E2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} />
                {p._engine?.health?.injury && (
                  <span className="muted" style={{ fontSize: 12 }}>{p._engine.health.injury}</span>
                )}
              </div>
            </div>
          )}

          {/* Ratings */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ font: '700 13px var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 10 }}>Ratings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {Object.entries(attrs).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, flex: 1 }}>{ratingLabels[key] || key}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
                    color: ratingColor(val), minWidth: 24, textAlign: 'right',
                  }}>{val}</span>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--bg-3)' }}>
                    <div style={{ width: `${val}%`, height: '100%', borderRadius: 2, background: ratingColor(val) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Season Stats */}
          {Object.keys(seasonStats).some(k => seasonStats[k] > 0) && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ font: '700 13px var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 10 }}>Season Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {Object.entries(seasonStats).filter(([, v]) => v > 0).map(([key, val]) => (
                  <div key={key} style={{ textAlign: 'center', padding: '8px 0', background: 'var(--bg-2)', borderRadius: 4 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{statLabels[key] || key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Career Stats */}
          {Object.keys(careerStats).some(k => careerStats[k] > 0) && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ font: '700 13px var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 10 }}>Career Stats</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {Object.entries(careerStats).filter(([, v]) => v > 0).map(([key, val]) => (
                  <div key={key} style={{ textAlign: 'center', padding: '8px 0', background: 'var(--bg-2)', borderRadius: 4 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{statLabels[key] || key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ font: '700 13px var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 10 }}>Awards & Honors</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {awards.map((a, i) => {
                  const awardNames = { mvp: 'MVP', opoy: 'OPOY', dpoy: 'DPOY', offensiveROY: 'Off. ROY', defensiveROY: 'Def. ROY', firstTeamAllPro: '1st Team All-Pro', secondTeamAllPro: '2nd Team All-Pro' };
                  const label = awardNames[a.awardType] || a.awardType || a.type || a;
                  return (
                    <span key={i} className="chip pos" style={{ fontSize: 11 }}>
                      {label} {a.season ? `(S${a.season})` : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
