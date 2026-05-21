import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill, Stars, TradeChip, formatM } from '../components/Chrome.jsx';
import { isTradeWindowOpen } from '../data/bridge.js';

function tradeStatLine(p) {
  const s = p.careerStats || {};
  const pos = p._engine?.position || p.pos;
  if (pos === 'QB') {
    const yds = s.passingYards || 0;
    const td = s.passingTouchdowns || 0;
    return yds > 0 ? `${yds} yds, ${td} TD` : null;
  }
  if (pos === 'RB') {
    const yds = s.rushingYards || 0;
    const td = s.rushingTouchdowns || 0;
    return yds > 0 ? `${yds} rush, ${td} TD` : null;
  }
  if (pos === 'WR' || pos === 'TE') {
    const yds = s.receivingYards || 0;
    const td = s.receivingTouchdowns || 0;
    return yds > 0 ? `${yds} rec, ${td} TD` : null;
  }
  if (pos === 'EDGE' || pos === 'DL' || pos === 'LB') {
    const tkl = s.tackles || 0;
    const sacks = s.sacks || 0;
    return tkl > 0 ? `${tkl} tkl, ${sacks} sck` : null;
  }
  if (pos === 'CB' || pos === 'S') {
    const tkl = s.tackles || 0;
    const ints = s.interceptions || 0;
    return tkl > 0 ? `${tkl} tkl, ${ints} INT` : null;
  }
  return null;
}

export function ScreenTrades({ onNav }) {
  const { userTeam, teams, trades, cpuTrades, draft, actions, _engine } = useLeague();
  const league = _engine;
  const teamId = userTeam.id;
  const windowOpen = isTradeWindowOpen(league);

  const [targetTeamId, setTargetTeamId] = useState(null);
  const [givePlayers, setGivePlayers] = useState([]);
  const [givePicks, setGivePicks] = useState([]);
  const [getPlayers, setGetPlayers] = useState([]);
  const [getPicks, setGetPicks] = useState([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(null); // 'give' | 'get'
  const [evaluation, setEvaluation] = useState(null);

  const otherTeams = teams.filter(t => t.id !== teamId);
  const targetTeam = teams.find(t => t.id === targetTeamId);

  // Compute live value
  const myValue = actions.getTradeValue(teamId, { playerIds: givePlayers, pickIds: givePicks });
  const theirValue = targetTeamId ? actions.getTradeValue(targetTeamId, { playerIds: getPlayers, pickIds: getPicks }) : 0;

  function proposeDeal() {
    if (!targetTeamId || !windowOpen) return;
    try {
      const trade = actions.proposeTrade(teamId, targetTeamId, {
        offeredPlayerIds: givePlayers,
        requestedPlayerIds: getPlayers,
        offeredPickIds: givePicks,
        requestedPickIds: getPicks,
      });
      const result = actions.evaluateTrade(trade.id);
      setEvaluation(result);
      if (result.response === 'accepted') {
        actions.completeTrade(trade.id);
      }
    } catch (e) {
      setEvaluation({ response: 'error', reason: e.message });
    }
  }

  function resetTrade() {
    setGivePlayers([]);
    setGivePicks([]);
    setGetPlayers([]);
    setGetPicks([]);
    setEvaluation(null);
  }

  const findPlayer = (teamObj, id) => teamObj?.roster?.find(p => p.id === id);
  const findPick = (id) => (draft?.picks || []).find(p => p.id === id);

  // Trade window schedule
  const windowSchedule = [
    { label: 'Preseason', open: league.phase === 'preseason' },
    { label: 'Offseason', open: league.phase === 'offseason' },
    { label: 'Wks 1-4', open: league.phase === 'regularSeason' && league.currentWeek <= 4 },
    { label: 'Wks 5-10', open: false },
    { label: 'Playoffs', open: false },
  ];

  // Recent completed trades
  const recentTrades = trades.filter(t => t.status === 'completed').slice(-5);

  return (
    <>
      <Topbar crumb="Front Office / Trade Center" title="Trade Center" actions={
        <>
          <button className="btn" onClick={resetTrade}>Clear</button>
          {(givePlayers.length > 0 || givePicks.length > 0) && targetTeamId && (
            <button className="btn primary" disabled={!windowOpen} onClick={proposeDeal}>
              {windowOpen ? 'Propose Trade' : 'Window Closed'}
            </button>
          )}
        </>
      } />
      <div className="page">

        {/* Trade window banner */}
        <div className="card" style={{
          marginBottom: 18,
          borderColor: windowOpen ? 'var(--pos)' : 'var(--neg)',
          borderWidth: 1,
        }}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: windowOpen ? 'var(--pos)' : 'var(--neg)' }} />
            <div style={{ flex: 1 }}>
              <strong>Trade window is {windowOpen ? 'open' : 'closed'}.</strong>
              <span className="muted" style={{ marginLeft: 8 }}>
                {windowOpen
                  ? 'Trades allowed now. Propose deals to other teams.'
                  : 'Trades allowed during offseason and regular-season Weeks 1-4.'}
              </span>
            </div>
            {!windowOpen && <span className="chip outline">Mock mode</span>}
          </div>
        </div>

        {/* Evaluation result */}
        {evaluation && (
          <div className="card" style={{
            marginBottom: 14,
            borderColor: evaluation.response === 'accepted' ? 'var(--pos)' : 'var(--neg)',
          }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={`chip ${evaluation.response === 'accepted' ? 'pos' : ''}`} style={{ fontWeight: 700 }}>
                {evaluation.response === 'accepted' ? 'ACCEPTED' : evaluation.response === 'error' ? 'ERROR' : 'REJECTED'}
              </span>
              <span>{evaluation.reason}</span>
              <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => { setEvaluation(null); resetTrade(); }}>New Trade</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
          {/* Build a Trade */}
          <div className="card">
            <div className="card-h"><h2>Build a Trade</h2><span className="right">{windowOpen ? 'Live' : 'Mock mode'}</span></div>
            <div className="card-b">
              {/* Team selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Trade partner</label>
                <select style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', color: 'var(--ink-1)', fontSize: 13 }}
                  value={targetTeamId || ''} onChange={e => { setTargetTeamId(e.target.value || null); setGetPlayers([]); setGetPicks([]); setEvaluation(null); }}>
                  <option value="">Select a team...</option>
                  {otherTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.city} {t.name} ({t.w}-{t.l})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* You give */}
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>You give</div>
                  <div style={{ border: '1px dashed var(--line)', borderRadius: 6, padding: 10, minHeight: 160 }}>
                    {givePlayers.map(id => {
                      const p = findPlayer(userTeam, id);
                      return p ? <TradeChip key={id} name={`${p.pos} ${p.name}`} detail={`OVR ${p.ovr} · Age ${p.age} · ${'★'.repeat(p.potential || 0)}`} onRemove={() => setGivePlayers(givePlayers.filter(x => x !== id))} /> : null;
                    })}
                    {givePicks.map(id => {
                      const pk = findPick(id);
                      return pk ? <TradeChip key={id} name={`R${pk.round} Pick`} detail={`#${pk.overallPick}`} onRemove={() => setGivePicks(givePicks.filter(x => x !== id))} /> : null;
                    })}
                    <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--ink-4)', fontSize: 12, cursor: 'pointer' }}
                      onClick={() => setShowPlayerPicker('give')}>+ add player or pick</div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Trade value</span>
                    <strong className="mono">{myValue}</strong>
                  </div>
                </div>

                {/* You get */}
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>
                    You get{targetTeam ? ` from ${targetTeam.city}` : ''}
                  </div>
                  <div style={{ border: '1px dashed var(--line)', borderRadius: 6, padding: 10, minHeight: 160 }}>
                    {getPlayers.map(id => {
                      const p = findPlayer(targetTeam, id);
                      return p ? <TradeChip key={id} name={`${p.pos} ${p.name}`} detail={`OVR ${p.ovr} · Age ${p.age} · ${'★'.repeat(p.potential || 0)}`} highlight onRemove={() => setGetPlayers(getPlayers.filter(x => x !== id))} /> : null;
                    })}
                    {getPicks.map(id => {
                      const pk = findPick(id);
                      return pk ? <TradeChip key={id} name={`R${pk.round} Pick`} detail={`#${pk.overallPick}`} highlight onRemove={() => setGetPicks(getPicks.filter(x => x !== id))} /> : null;
                    })}
                    {targetTeamId && (
                      <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--ink-4)', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setShowPlayerPicker('get')}>+ add player or pick</div>
                    )}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Trade value</span>
                    <strong className="mono">{theirValue}</strong>
                  </div>
                </div>
              </div>

              {/* Value comparison */}
              {(myValue > 0 || theirValue > 0) && (
                <>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--line-soft)', margin: '14px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Value Comparison</div>
                      <div style={{ font: '700 18px var(--font-display)', marginTop: 2 }}>{myValue} ↔ {theirValue}</div>
                      <div className={theirValue > myValue ? 'dn' : theirValue < myValue ? 'up' : 'muted'} style={{ fontSize: 12 }}>
                        {theirValue > myValue ? `+${theirValue - myValue} in their favor` : theirValue < myValue ? `+${myValue - theirValue} in your favor` : 'Even'}
                      </div>
                    </div>
                    <div>
                      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>CPU Likelihood</div>
                      <div style={{ font: '700 18px var(--font-display)', marginTop: 2 }}>
                        {theirValue === 0 ? '—' : myValue / theirValue >= 1.0 ? 'Very Likely' : myValue / theirValue >= 0.85 ? 'Likely' : myValue / theirValue >= 0.7 ? 'Possible' : myValue / theirValue >= 0.55 ? 'Unlikely' : 'No Chance'}
                      </div>
                      <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>Context-aware: needs, scheme, cap</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right column */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Trade Window</h2></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                {windowSchedule.map((w, i) => {
                  const isCurrent = (i === 0 && league.phase === 'preseason') ||
                    (i === 1 && league.phase === 'offseason') ||
                    (i === 2 && league.phase === 'regularSeason' && league.currentWeek <= 4) ||
                    (i === 3 && league.phase === 'regularSeason' && league.currentWeek > 4) ||
                    (i === 4 && league.phase === 'playoffs');
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span className={`chip ${w.open ? 'pos' : 'outline'}`} style={{ fontSize: 10, minWidth: 70, textAlign: 'center' }}>{w.label}</span>
                      {isCurrent ? <strong>Current</strong> : <span className="muted">{w.open ? 'Open' : 'Closed'}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>CPU Urgency Triggers</h2></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Missing required-position starter</li>
                  <li>Scheme-critical player gap</li>
                  <li>Need to reduce cap deficit</li>
                  <li>Contender adding production</li>
                  <li>Rebuilder collecting picks / youth</li>
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h2>Recent League Trades</h2></div>
              <div className="card-b tight">
                {recentTrades.length === 0 && cpuTrades.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center' }} className="muted">No trades this season</div>
                )}
                {recentTrades.map((t, i) => {
                  const from = teams.find(tm => tm.id === t.fromTeamId);
                  const to = teams.find(tm => tm.id === t.toTeamId);
                  return (
                    <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ColorBlock team={from} size={14} /> <span className="mono">{from?.abbr}</span>
                        <span style={{ color: 'var(--ink-4)' }}>↔</span>
                        <ColorBlock team={to} size={14} /> <span className="mono">{to?.abbr}</span>
                      </div>
                      <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
                        {t.offeredPlayerIds.length + t.offeredPickIds.length} assets ↔ {t.requestedPlayerIds.length + t.requestedPickIds.length} assets
                      </div>
                    </div>
                  );
                })}
                {cpuTrades.map((t, i) => {
                  const from = teams.find(tm => tm.id === t.fromTeamId);
                  const to = teams.find(tm => tm.id === t.toTeamId);
                  return (
                    <div key={`cpu-${i}`} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ColorBlock team={from} size={14} /> <span className="mono">{from?.abbr}</span>
                        <span style={{ color: 'var(--ink-4)' }}>↔</span>
                        <ColorBlock team={to} size={14} /> <span className="mono">{to?.abbr}</span>
                        <span className="chip outline" style={{ fontSize: 9, marginLeft: 'auto' }}>CPU</span>
                      </div>
                      <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
                        {t.given?.name} ({t.given?.position}) ↔ {t.received?.name} ({t.received?.position})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Player/Pick picker modal */}
        {showPlayerPicker && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(14,17,22,0.45)', display: 'grid', placeItems: 'center' }}
            onClick={() => setShowPlayerPicker(null)}>
            <div className="card" style={{ width: 640, maxWidth: '95vw', maxHeight: '70vh', animation: 'fadeIn .15s ease-out' }} onClick={e => e.stopPropagation()}>
              <div className="card-h"><h2>{showPlayerPicker === 'give' ? 'Add from your roster' : `Add from ${targetTeam?.city || 'partner'}`}</h2></div>
              <div className="card-b tight" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                {/* Players */}
                <table className="tbl">
                  <thead><tr><th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">OVR</th><th>Pot.</th><th className="num">Cap</th><th className="col-mobile-hide">Stats</th><th></th></tr></thead>
                  <tbody>
                    {(showPlayerPicker === 'give' ? userTeam : targetTeam)?.roster
                      ?.filter(p => !(showPlayerPicker === 'give' ? givePlayers : getPlayers).includes(p.id))
                      .sort((a, b) => b.ovr - a.ovr)
                      .slice(0, 30)
                      .map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td className="mono">{p.pos}</td>
                          <td className="num">{p.age}</td>
                          <td className="num"><OvrPill ovr={p.ovr} /></td>
                          <td><Stars n={p.potential} /></td>
                          <td className="num mono">{formatM(p.cap)}</td>
                          <td className="muted col-mobile-hide" style={{ fontSize: 11 }}>{tradeStatLine(p) || '—'}</td>
                          <td>
                            <button className="btn" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => {
                              if (showPlayerPicker === 'give') setGivePlayers([...givePlayers, p.id]);
                              else setGetPlayers([...getPlayers, p.id]);
                              setShowPlayerPicker(null);
                            }}>Add</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {/* Draft picks */}
                <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: 12, borderTop: '2px solid var(--line)' }}>Draft Picks</div>
                {(draft?.picks || [])
                  .filter(pk => {
                    const ownerId = pk.currentTeamId;
                    const side = showPlayerPicker === 'give' ? teamId : targetTeamId;
                    return ownerId === side && !pk.prospectId && !(showPlayerPicker === 'give' ? givePicks : getPicks).includes(pk.id);
                  })
                  .map(pk => (
                    <div key={pk.id} style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-soft)' }}>
                      <span>R{pk.round} #{pk.overallPick}</span>
                      <button className="btn" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => {
                        if (showPlayerPicker === 'give') setGivePicks([...givePicks, pk.id]);
                        else setGetPicks([...getPicks, pk.id]);
                        setShowPlayerPicker(null);
                      }}>Add</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
