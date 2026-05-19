import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, Avatar, OvrPill, Stars } from '../components/Chrome.jsx';
import { isTrainingWindowOpen } from '../data/bridge.js';

export function ScreenTraining({ onNav }) {
  const { userTeam, actions, _engine } = useLeague();
  const league = _engine;
  const windowInfo = isTrainingWindowOpen(league);

  const [picked, setPicked] = useState([]);
  const [intensity, setIntensity] = useState({});
  const [results, setResults] = useState(null);
  const [filter, setFilter] = useState('All');

  const OFF_POS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'];
  const DEF_POS = ['EDGE', 'DT', 'LB', 'CB', 'S'];

  // Eligible: young players with development potential, sorted by potential desc
  let eligible = userTeam.roster
    .filter(p => p.potential >= 2 && p.age <= 30)
    .sort((a, b) => b.potential - a.potential || ((b._engine?.development?.potentialCeiling || 0) - b.ovr) - ((a._engine?.development?.potentialCeiling || 0) - a.ovr));

  if (filter === 'Offense') eligible = eligible.filter(p => OFF_POS.includes(p.pos));
  if (filter === 'Defense') eligible = eligible.filter(p => DEF_POS.includes(p.pos));
  if (filter === 'Starters') eligible = eligible.filter(p => p.isStarter);

  function toggle(id) {
    if (picked.includes(id)) setPicked(picked.filter(p => p !== id));
    else if (picked.length < 5) setPicked([...picked, id]);
  }

  function setPlayerIntensity(id, val) {
    setIntensity({ ...intensity, [id]: val });
  }

  function runSession() {
    if (!windowInfo.open || picked.length === 0) return;
    try {
      const playerPlans = picked.map(id => ({
        playerId: id,
        intensity: intensity[id] || 'standard',
      }));
      const options = { type: windowInfo.type === 'camp' ? 'camp' : 'regularSeason' };
      const session = actions.scheduleTraining(userTeam.id, playerPlans, options);
      const res = actions.resolveTraining(session.id);
      setResults(res || []);
    } catch (e) {
      console.error('[runSession]', e);
      alert(e.message || 'Training failed');
    }
  }

  // Training windows status
  const campSessions = league.training?.camp?.sessions || [];
  const regWindows = league.training?.regularSeason?.windows || [];

  const riskLabel = (int) => int === 'light' ? '2%' : int === 'standard' ? '5%' : '8%';
  const gainLabel = (int) => int === 'light' ? '+0-1' : int === 'standard' ? '+1-2' : '+1-3';

  return (
    <>
      <Topbar crumb="Team / Training" title="Training" actions={
        <>
          {results && <button className="btn" onClick={() => setResults(null)}>Back to Selection</button>}
          {!results && windowInfo.open && (
            <button className="btn primary" disabled={picked.length === 0} onClick={runSession}>
              Run Session
            </button>
          )}
        </>
      } />
      <div className="page">

        {/* Info cards row */}
        <div className="grid grid-3" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="card-h"><h2>Current Window</h2></div>
            <div className="card-b">
              {windowInfo.open ? (
                <>
                  <div className="chip pos" style={{ marginBottom: 8 }}>{windowInfo.label}</div>
                  <div style={{ font: '700 16px var(--font-display)', marginBottom: 4 }}>
                    {windowInfo.type === 'camp' ? 'Training Camp' : `Available after Week ${windowInfo.afterWeek}`}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>5 focused players max</div>
                </>
              ) : (
                <>
                  <div className="chip outline" style={{ marginBottom: 8 }}>Closed</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Training windows: camp (preseason), after weeks 3, 6, 9 (regular season).
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>Camp Schedule</h2></div>
            <div className="card-b">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Training Camp</span>
                <span className="muted">{campSessions.length > 0 ? `${campSessions.filter(s => s.completed).length} session(s) used` : 'Preseason'}</span>
              </div>
              {regWindows.map((w, i) => {
                const used = w.sessions.some(s => s.completed);
                const isCurrent = windowInfo.open && windowInfo.afterWeek === w.afterWeek;
                return (
                  <div key={w.afterWeek} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>In-season W{w.afterWeek}</span>
                    {isCurrent ? <strong>Now</strong> : <span className="muted">{used ? 'Used ✓' : 'Upcoming'}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>Intensity Effects</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Light</span><span className="muted">Inj 1-3% · Gain low</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Standard</span><span className="muted">Inj 3-6% · Gain mid</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Aggressive</span><span className="muted">Inj 6-10% · Gain high</span></div>
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Modified by age, fatigue, durability, and history.</div>
            </div>
          </div>
        </div>

        {/* Results view */}
        {results ? (
          <div className="card">
            <div className="card-h"><h2>Training Results</h2></div>
            <div className="card-b tight">
              <table className="tbl">
                <thead><tr><th>Player</th><th>Pos</th><th className="num">OVR</th><th>Outcome</th></tr></thead>
                <tbody>
                  {results.map(r => {
                    const p = userTeam.roster.find(pl => pl.id === r.playerId);
                    return (
                      <tr key={r.playerId} style={r.injured ? { background: '#FFF5F5' } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar player={p} team={userTeam} size={26} />
                            <strong>{p?.name || r.playerId}</strong>
                          </div>
                        </td>
                        <td className="mono">{p?.pos}</td>
                        <td className="num"><OvrPill ovr={p?.ovr} /></td>
                        <td>
                          {r.injured
                            ? <span style={{ color: 'var(--neg)' }}>Injured ({r.injuryWeeks} wk{r.injuryWeeks > 1 ? 's' : ''})</span>
                            : r.gain > 0
                              ? <span className="up">+{r.gain} OVR</span>
                              : <span className="muted">No change</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Selection view */
          <>
            <div className="card">
              <div className="card-h">
                <h2>Focus Training — choose up to 5</h2>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', marginRight: 16 }}>
                  {['All', 'Offense', 'Defense', 'Starters'].map(f => (
                    <span key={f} className={`chip ${filter === f ? 'pos' : 'outline'}`}
                      style={{ fontSize: 10, padding: '2px 10px', cursor: 'pointer' }}
                      onClick={() => setFilter(f)}>{f}</span>
                  ))}
                </div>
                <span className="right">{picked.length}/5 selected</span>
              </div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}></th>
                      <th>Player</th>
                      <th>Pos</th>
                      <th>Age</th>
                      <th className="num">OVR</th>
                      <th>Pot</th>
                      <th>Growth Room</th>
                      <th>Intensity</th>
                      <th>Inj Risk</th>
                      <th>Expected Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map(p => {
                      const checked = picked.includes(p.id);
                      const room = (p._engine?.development?.potentialCeiling || p.ovr) - p.ovr;
                      const int = intensity[p.id] || 'standard';
                      return (
                        <tr key={p.id} style={checked ? { background: 'var(--bg-2)' } : {}}>
                          <td><input type="checkbox" checked={checked} onChange={() => toggle(p.id)} disabled={!windowInfo.open} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar player={p} team={userTeam} size={26} />
                              <strong>{p.name}</strong>
                            </div>
                          </td>
                          <td className="mono">{p.pos}</td>
                          <td>{p.age}</td>
                          <td className="num"><OvrPill ovr={p.ovr} /></td>
                          <td><Stars n={p.potential} /></td>
                          <td className="mono">+{Math.max(0, room)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {['light', 'standard', 'aggressive'].map(it => (
                                <span key={it} className={`chip ${int === it ? 'pos' : 'outline'}`}
                                  style={{ fontSize: 10, padding: '2px 8px', cursor: windowInfo.open ? 'pointer' : 'default', textTransform: 'capitalize' }}
                                  onClick={() => windowInfo.open && setPlayerIntensity(p.id, it)}>
                                  {it}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="mono">{riskLabel(int)}</td>
                          <td className="mono">{gainLabel(int)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-h"><h2>Non-focused Camp Gains</h2><span className="right">All other roster players</span></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div><strong>4-5★ potential</strong>: up to <span className="mono">+3</span> in training camp</div>
                  <div><strong>1-3★ potential</strong>: up to <span className="mono">+2</span> in training camp</div>
                  <div className="muted">Smaller gains in regular-season windows. Age-based decline still applies (31+ = -1/yr, 35+ = -2.5/yr)</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
