import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, OvrPill, Stars, Avatar, formatM } from '../components/Chrome.jsx';
import { bridgeFreeAgent } from '../data/bridge.js';
import { estimateMarketSalary } from '@engine/simulation/free-agency.js';

const OFF_POS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'];
const DEF_POS = ['EDGE', 'DL', 'LB', 'CB', 'S'];

function statLine(p) {
  const s = { ...(p.careerStats || {}), ...(p.stats || {}) };
  const pos = p._engine?.position || p.pos;
  if (pos === 'QB') {
    const yds = s.passingYards || 0;
    const td = s.passingTouchdowns || 0;
    const int = s.interceptionsThrown || 0;
    return yds > 0 ? `${yds} yds, ${td} TD, ${int} INT` : null;
  }
  if (pos === 'RB') {
    const yds = s.rushingYards || 0;
    const td = s.rushingTouchdowns || 0;
    return yds > 0 ? `${yds} rush yds, ${td} TD` : null;
  }
  if (pos === 'WR' || pos === 'TE') {
    const yds = s.receivingYards || 0;
    const td = s.receivingTouchdowns || 0;
    return yds > 0 ? `${yds} rec yds, ${td} TD` : null;
  }
  if (pos === 'EDGE' || pos === 'DL' || pos === 'LB') {
    const tkl = s.tackles || 0;
    const sacks = s.sacks || 0;
    return tkl > 0 ? `${tkl} tkl, ${sacks} sck` : null;
  }
  if (pos === 'CB' || pos === 'S') {
    const tkl = s.tackles || 0;
    const ints = s.interceptions || 0;
    const pd = s.passDeflections || 0;
    return tkl > 0 ? `${tkl} tkl, ${ints} INT, ${pd} PD` : null;
  }
  return null;
}

export function ScreenFreeAgency({ onNav }) {
  const { userTeam, freeAgents, actions } = useLeague();
  const teamId = userTeam.id;

  const [filter, setFilter] = useState('All');
  const [offerTarget, setOfferTarget] = useState(null);
  const [offerSalary, setOfferSalary] = useState(3);
  const [offerYears, setOfferYears] = useState(2);
  const [lastResult, setLastResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showRelease, setShowRelease] = useState(false);

  const bridgedFAs = (freeAgents || [])
    .map(p => {
      const b = bridgeFreeAgent(p);
      try { b.marketValue = estimateMarketSalary(p) / 1_000_000; } catch { b.marketValue = 1; }
      return b;
    })
    .sort((a, b) => b.ovr - a.ovr);

  const filtered = bridgedFAs.filter(p => {
    if (filter === 'All') return true;
    if (filter === 'Offense') return OFF_POS.includes(p._engine?.position);
    if (filter === 'Defense') return DEF_POS.includes(p._engine?.position);
    return false; // ST
  });

  const rosterCount = userTeam.roster?.length || 0;
  const rosterSpots = 55 - rosterCount;
  const rosterFull = rosterSpots <= 0;

  function submitOffer() {
    if (!offerTarget) return;
    setErrorMsg(null);
    try {
      actions.makeOffer(teamId, offerTarget.id, offerSalary * 1_000_000, offerYears);
      const result = actions.resolveOffers();
      setLastResult(result);
      setOfferTarget(null);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to make offer');
    }
  }

  function releasePlayer(playerId) {
    try {
      actions.releasePlayer(teamId, playerId);
      setErrorMsg(null);
    } catch (e) {
      setErrorMsg(e.message || 'Failed to release player');
    }
  }

  return (
    <>
      <Topbar crumb="Front Office / Free Agency" title="Free Agency" />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Cap Space</div>
            <div className="value">{formatM(userTeam.capSpace)}</div>
            <div className="delta">Available to spend</div>
          </div>
          <div className="stat-tile" style={rosterFull ? { borderColor: 'var(--neg)' } : {}}>
            <div className="label">Roster Size</div>
            <div className="value" style={rosterFull ? { color: 'var(--neg)' } : {}}>{rosterCount}<span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/55</span></div>
            <div className={`delta ${rosterFull ? 'neg' : ''}`}>{rosterFull ? 'Release a player first!' : `${rosterSpots} spot${rosterSpots === 1 ? '' : 's'} open`}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Free Agents</div>
            <div className="value">{freeAgents.length}</div>
            <div className="delta">In current pool</div>
          </div>
          <div className="stat-tile">
            <div className="label">Roster Needs</div>
            <div className="value">{Object.values(userTeam.rosterNeeds || {}).filter(v => v > 0).length}</div>
            <div className="delta">Positions to fill</div>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="card" style={{ marginBottom: 14, borderColor: 'var(--neg)' }}>
            <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="chip" style={{ background: 'var(--neg)', color: 'white', fontSize: 10 }}>ERROR</span>
              <span style={{ flex: 1 }}>{errorMsg}</span>
              <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setErrorMsg(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Roster full warning */}
        {rosterFull && (
          <div className="card" style={{ marginBottom: 14, borderColor: 'var(--neg)' }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--neg)' }} />
              <div style={{ flex: 1 }}>
                <strong>Roster is full ({rosterCount}/55).</strong>
                <span className="muted" style={{ marginLeft: 8 }}>You must release a player before signing a free agent.</span>
              </div>
              <button className="btn" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowRelease(!showRelease)}>
                {showRelease ? 'Hide Roster' : 'Release a Player'}
              </button>
            </div>
            {showRelease && (
              <div className="card-b tight" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table className="tbl">
                  <thead><tr><th>Player</th><th>Pos</th><th className="num">OVR</th><th className="num">Cap Hit</th><th></th></tr></thead>
                  <tbody>
                    {[...userTeam.roster].sort((a, b) => a.ovr - b.ovr).map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar player={p} team={userTeam} size={24} />
                            <strong>{p.name}</strong>
                          </div>
                        </td>
                        <td className="mono">{p.pos}</td>
                        <td className="num"><OvrPill ovr={p.ovr} /></td>
                        <td className="num mono">{formatM(p.cap)}</td>
                        <td>
                          <button className="btn" style={{ padding: '3px 10px', fontSize: 11, color: 'var(--neg)', borderColor: 'var(--neg)' }}
                            onClick={() => releasePlayer(p.id)}>Release</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Last resolve result — per-player acceptance/rejection */}
        {lastResult && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-h">
              <h2>Offer Results</h2>
              <span className="right">
                <button className="btn" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setLastResult(null)}>Dismiss</button>
              </span>
            </div>
            <div className="card-b tight">
              {lastResult.signings.map((s, i) => {
                const player = s.player || {};
                return (
                  <div key={`s-${i}`} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="chip pos" style={{ fontSize: 10, minWidth: 64, textAlign: 'center' }}>ACCEPTED</span>
                    <div style={{ flex: 1 }}>
                      <strong>{player.firstName} {player.lastName}</strong>
                      <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{player.position} · OVR {player.overall}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 12 }}>{formatM((s.salary || 0) / 1_000_000)}/yr · {s.years}yr</span>
                  </div>
                );
              })}
              {lastResult.rejections.map((r, i) => {
                const player = r.player || {};
                return (
                  <div key={`r-${i}`} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="chip" style={{ fontSize: 10, minWidth: 64, textAlign: 'center', background: 'var(--neg)', color: 'white' }}>REJECTED</span>
                    <div style={{ flex: 1 }}>
                      <strong>{player.firstName} {player.lastName}</strong>
                      <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{player.position} · OVR {player.overall}</span>
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>{r.reason || 'Chose another offer'}</span>
                  </div>
                );
              })}
              {lastResult.signings.length === 0 && lastResult.rejections.length === 0 && (
                <div style={{ padding: 16 }} className="muted">No offers to process.</div>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-h">
            <div className="tabs" style={{ border: 'none', margin: 0 }}>
              {['All', 'Offense', 'Defense'].map(f => (
                <div key={f} className={`tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)} style={{ borderBottom: 'none', paddingBottom: 8 }}>{f}</div>
              ))}
            </div>
          </div>
          <div className="card-b tight">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">OVR</th>
                  <th>Potential</th><th className="num">Est. Value</th><th className="col-mobile-hide">Stats</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(p => {
                    const stats = statLine(p);
                    return (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td className="mono"><strong>{p.pos}</strong></td>
                      <td className="num">{p.age}</td>
                      <td className="num"><OvrPill ovr={p.ovr} /></td>
                      <td><Stars n={p.potential} /></td>
                      <td className="num mono">{formatM(p.marketValue)}/yr</td>
                      <td className="muted col-mobile-hide" style={{ fontSize: 11 }}>{stats || '—'}</td>
                      <td>
                        <button className="btn" style={{ padding: '4px 12px', fontSize: 11 }}
                          disabled={rosterFull}
                          onClick={() => { setErrorMsg(null); setOfferTarget(p); setOfferSalary(Math.round(p.marketValue * 10) / 10); setOfferYears(Math.min(4, Math.max(1, 5 - Math.floor(p.age / 8)))); }}>
                          {rosterFull ? 'Full' : 'Offer'}
                        </button>
                      </td>
                    </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Offer modal */}
        {offerTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(14,17,22,0.45)', display: 'grid', placeItems: 'center' }}
            onClick={() => setOfferTarget(null)}>
            <div className="card" style={{ width: 400, animation: 'fadeIn .15s ease-out' }} onClick={e => e.stopPropagation()}>
              <div className="card-h"><h2>Offer to {offerTarget.name}</h2></div>
              <div className="card-b">
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 13, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="mono">{offerTarget.pos}</span>
                  <span>Age {offerTarget.age}</span>
                  <OvrPill ovr={offerTarget.ovr} />
                  <Stars n={offerTarget.potential} />
                  <span className="muted">Est. {formatM(offerTarget.marketValue)}/yr</span>
                </div>
                {statLine(offerTarget) && (
                  <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>Career: {statLine(offerTarget)}</div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Salary ($/yr in millions)</label>
                  <input type="range" min="0.8" max="25" step="0.1" value={offerSalary} className="slider"
                    onChange={e => setOfferSalary(+e.target.value)} />
                  <div className="mono" style={{ textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{formatM(offerSalary)}/yr</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Contract Length</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4].map(y => (
                      <span key={y} className={`chip ${offerYears === y ? 'pos' : 'outline'}`}
                        style={{ cursor: 'pointer', padding: '4px 12px' }}
                        onClick={() => setOfferYears(y)}>{y}yr</span>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 12, marginBottom: 16, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Total value</span>
                    <strong className="mono">{formatM(offerSalary * offerYears)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Cap impact (yr 1)</span>
                    <strong className="mono dn">-{formatM(offerSalary)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setOfferTarget(null)}>Cancel</button>
                  <button className="btn primary" onClick={submitOffer}>Make Offer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="card-h"><h2>How Negotiations Work</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li>Offer salary and years — decision is instant</li>
                <li>Player weighs contract value (35%), prestige (25%), team performance (20%), need (10%), morale (10%)</li>
                <li>CPU teams may also make competing offers</li>
                <li>Accepted players join your roster immediately</li>
              </ol>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>In-Season vs Offseason</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <p><strong>In-season:</strong> Short-term needs only — injury replacements, depth fixes. Quality is lower.</p>
              <p><strong>Offseason:</strong> Expired contracts processed, teams release players to clear cap, large pool including former starters.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
