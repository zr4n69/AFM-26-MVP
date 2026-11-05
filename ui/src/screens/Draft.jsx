import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill, Stars } from '../components/Chrome.jsx';
import { bridgeProspect } from '../data/bridge.js';
import { formatM } from '../components/Chrome.jsx';

export function ScreenDraft({ onNav }) {
  const { userTeam, teams, draft, draftClass, scouting, season, phase, actions, _engine } = useLeague();
  const league = _engine;
  const teamId = userTeam?.id;

  const isOffseason = phase === 'offseason';
  const initialMode = draft?.status === 'completed' ? 'results' : draft?.status === 'in_progress' ? 'live' : 'predraft';
  const [mode, setMode] = useState(initialMode);
  const [showBoard, setShowBoard] = useState(false);
  const [draftLog, setDraftLog] = useState([]);
  const [currentPickIdx, setCurrentPickIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const picks = useMemo(() => draft?.picks || [], [draft?.picks]);
  const userPicks = picks.filter(p => p.currentTeamId === teamId);
  const revealed = scouting?.revealedGroupsByTeamId?.[teamId] || {};
  const freeAgencyComplete = !!league?.offseasonEvents?.freeAgencyComplete;
  const hofEligible = league?.hallOfFame?.eligiblePlayers || [];
  const userHofBallot = league?.hallOfFame?.ballotsByTeamId?.[teamId] || [];
  const hofComplete = hofEligible.length === 0 || userHofBallot.length > 0;

  const draftOrder = (draft?.draftOrder || [])
    .map(id => teams.find(team => team.id === id))
    .filter(Boolean);

  // Find next undrafted pick
  const nextPickIdx = picks.findIndex(p => !p.prospectId);

  const startDraft = useCallback(() => {
    setMode('live');
    if (league.draft) league.draft.status = 'in_progress';
    setCurrentPickIdx(Math.max(0, nextPickIdx));
    setDraftLog([]);
    setIsRunning(true);
  }, [league, nextPickIdx]);

  // Run CPU picks automatically
  useEffect(() => {
    if (!isRunning || mode !== 'live') return;

    const idx = picks.findIndex(p => !p.prospectId);
    if (idx === -1) {
      const finishTimer = setTimeout(() => {
        setIsRunning(false);
        actions.finalizeDraft();
        setMode('results');
      }, 0);
      return () => clearTimeout(finishTimer);
    }

    const pick = picks[idx];

    // If it's the user's pick, pause
    if (pick.currentTeamId === teamId) {
      const pauseTimer = setTimeout(() => setIsRunning(false), 0);
      return () => clearTimeout(pauseTimer);
    }

    // CPU pick with delay
    timerRef.current = setTimeout(() => {
      const result = actions.runCpuPick(pick.id);
      if (result) {
        setDraftLog(prev => [...prev, {
          pickId: pick.id,
          round: pick.round,
          overall: pick.overallPick,
          teamId: pick.currentTeamId,
          prospectName: `${result.prospect.firstName} ${result.prospect.lastName}`,
          position: result.prospect.position,
          rating: result.player.overall,
        }]);
        setCurrentPickIdx(idx + 1);
      }
    }, 400);

    return () => clearTimeout(timerRef.current);
  }, [isRunning, mode, picks, teamId, actions, currentPickIdx]);

  function userDraftPlayer(prospectId) {
    try {
      const pick = picks.find(p => !p.prospectId && p.currentTeamId === teamId);
      if (!pick) return;

      const result = actions.draftPick(pick.id, prospectId);
      if (!result) { setIsRunning(true); return; }
      setDraftLog(prev => [...prev, {
        pickId: pick.id,
        round: pick.round,
        overall: pick.overallPick,
        teamId: teamId,
        prospectName: `${result.prospect.firstName} ${result.prospect.lastName}`,
        position: result.prospect.position,
        rating: result.player?.overall || 0,
        isUser: true,
      }]);

      // Continue CPU picks
      setIsRunning(true);
    } catch (e) {
      console.error('[userDraftPlayer]', e);
      setIsRunning(true);
    }
  }

  function autoPick() {
    try {
      const pick = picks.find(p => !p.prospectId && p.currentTeamId === teamId);
      if (!pick) return;
      const result = actions.runCpuPick(pick.id);
      if (result) {
        setDraftLog(prev => [...prev, {
          pickId: pick.id,
          round: pick.round,
          overall: pick.overallPick,
          teamId: teamId,
          prospectName: `${result.prospect.firstName} ${result.prospect.lastName}`,
          position: result.prospect.position,
          rating: result.player?.overall || 0,
          isUser: true,
        }]);
      }
      setIsRunning(true);
    } catch (e) {
      console.error('[autoPick]', e);
      setIsRunning(true);
    }
  }

  const findTeam = (id) => teams.find(t => t.id === id);
  const currentPick = picks[nextPickIdx >= 0 ? nextPickIdx : currentPickIdx];
  const visiblePickIdx = nextPickIdx >= 0 ? nextPickIdx : currentPickIdx;
  const isUserOnClock = currentPick && !currentPick.prospectId && currentPick.currentTeamId === teamId;

  // Available prospects — only undrafted
  const available = draftClass
    .filter(p => !p.draftedByTeamId)
    .map(p => bridgeProspect(p, revealed))
    .sort((a, b) => a.projRank - b.projRank);

  // Current round
  const currentRound = currentPick ? currentPick.round : (draft?.status === 'completed' ? 5 : 1);
  const totalDrafted = picks.filter(p => p.prospectId).length;

  const freeAgencyGate = isOffseason && !freeAgencyComplete && draft?.status !== 'completed';
  if (freeAgencyGate && !showBoard) {
    return (
      <>
        <Topbar crumb="Front Office / Draft" title={`${season + 1} AFL Draft`} />
        <div className="page">
          <div className="card">
            <div className="card-b" style={{ padding: 40, textAlign: 'center' }}>
              <h2 style={{ marginBottom: 8 }}>Resolve Free Agency First</h2>
              <p className="muted" style={{ maxWidth: 440, margin: '0 auto' }}>
                The offseason market must be resolved before draft day opens. Make any offers you want, then finish free agency.
              </p>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={() => onNav('fa')}>Go to Free Agency →</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Outside offseason: only My Board is accessible
  const draftLocked = !isOffseason && draft?.status !== 'in_progress' && draft?.status !== 'completed';
  if (draftLocked && !showBoard) {
    return (
      <>
        <Topbar crumb="Front Office / Draft" title={`${season + 1} AFL Draft`} actions={
          <button className="btn accent" onClick={() => setShowBoard(true)}>📋 My Draft Board</button>
        } />
        <div className="page">
          <div className="card">
            <div className="card-b" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <h2 style={{ marginBottom: 8 }}>Draft Available During Offseason</h2>
              <p className="muted" style={{ maxWidth: 400, margin: '0 auto' }}>
                The AFL Draft is a special offseason event. Complete the current season to enter the draft.
                Use Scouting to prepare for draft day — or build your personal draft board now.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                <button className="btn" onClick={() => onNav('scouting')}>Go to Scouting →</button>
                <button className="btn accent" onClick={() => setShowBoard(true)}>📋 My Draft Board</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar crumb="Front Office / Draft" title={`${season + 1} AFL Draft`} actions={
        <>
          <button className={`btn${showBoard ? ' accent' : ''}`} onClick={() => setShowBoard(b => !b)}>
            📋 {showBoard ? 'Hide Board' : 'My Board'}
          </button>
          {!showBoard && mode === 'predraft' && <button className="btn primary" onClick={startDraft}>Start Draft</button>}
          {!showBoard && mode === 'live' && isUserOnClock && <button className="btn primary" onClick={autoPick}>Auto-Pick</button>}
          {!showBoard && mode === 'results' && <button className="btn" onClick={() => onNav('roster')}>View Roster</button>}
          {!showBoard && mode === 'results' && isOffseason && (
            <button className="btn primary" onClick={() => {
              if (!hofComplete) onNav('hof');
              else if (actions.startNextSeason()) onNav('dashboard');
            }}>
              {hofComplete ? `Start Season ${season + 1} →` : 'Cast HOF Ballot →'}
            </button>
          )}
        </>
      } />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Round</div>
            <div className="value">{currentRound} <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/5</span></div>
            <div className="delta">{totalDrafted} of {picks.length} picked</div>
          </div>
          <div className="stat-tile">
            <div className="label">Your Picks</div>
            <div className="value">{userPicks.length}</div>
            <div className="delta">{userPicks.map(p => `R${p.round}`).join(', ')}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: 18 }}>{draft.status === 'completed' ? 'Complete' : isUserOnClock ? 'On Clock' : mode === 'live' ? 'In Progress' : 'Pre-Draft'}</div>
            <div className="delta">{available.length} prospects left</div>
          </div>
          <div className="stat-tile">
            <div className="label">Rookie Pool</div>
            <div className="value">{formatM(userPicks.reduce((s, p) => s + (p.rookieContract?.salary || 0) / 1_000_000, 0))}</div>
            <div className="delta">Across {userPicks.length} picks</div>
          </div>
        </div>

        {/* MY BOARD */}
        {showBoard && (
          <MockDraftBoard
            draftClass={draftClass}
            revealed={revealed}
            board={userTeam._engine?.mockDraftBoard || []}
            onUpdate={ids => actions.updateMockDraftBoard(ids)}
          />
        )}

        {/* PRE-DRAFT MODE */}
        {!showBoard && mode === 'predraft' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <div className="card">
              <div className="card-h"><h2>Draft Order</h2><span className="right">Worst record picks first</span></div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th className="num">Pick</th><th>Team</th><th className="num">Record</th></tr></thead>
                  <tbody>
                    {draftOrder.map((t, i) => (
                      <tr key={t.id} style={t.id === teamId ? { background: 'var(--bg-2)', fontWeight: 600 } : {}}>
                        <td className="num mono">{i + 1}</td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ColorBlock team={t} size={16} /> {t.city} {t.name}</div></td>
                        <td className="num mono">{t.w}-{t.l}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-h"><h2>Top Available Prospects</h2></div>
                <div className="card-b tight" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th className="num">Rk</th><th>Prospect</th><th>Pos</th><th>Range</th><th className="num">OVR</th></tr></thead>
                    <tbody>
                      {available.slice(0, 20).map(p => (
                        <tr key={p.id}>
                          <td className="num mono">{p.projRank}</td>
                          <td><strong>{p.name}</strong></td>
                          <td className="mono">{p.pos}</td>
                          <td className="mono">{p.ratingRange[0]}-{p.ratingRange[1]}</td>
                          <td className="num">{p.ovr != null ? <OvrPill ovr={p.ovr} /> : <span className="muted">?</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="card-h"><h2>Draft Info</h2></div>
                <div className="card-b" style={{ fontSize: 13 }}>
                  <p>5 rounds · 16 picks per round · 80 total selections</p>
                  <p className="muted">Undrafted prospects enter the free agent pool after the draft concludes.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIVE DRAFT MODE */}
        {!showBoard && mode === 'live' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
            {/* Draft board / ticker */}
            <div className="card">
              <div className="card-h"><h2>Draft Board</h2><span className="right">Round {currentRound} · Pick {totalDrafted + 1}</span></div>
              <div className="card-b tight" style={{ maxHeight: 550, overflowY: 'auto' }}>
                {/* Show all completed picks + current */}
                {picks.slice(0, visiblePickIdx + 1).map((pick, i) => {
                  const t = findTeam(pick.currentTeamId);
                  const prospect = pick.prospectId ? draftClass.find(pr => pr.id === pick.prospectId) : null;
                  const logEntry = draftLog.find(l => l.pickId === pick.id);
                  const isCurrent = i === visiblePickIdx && !pick.prospectId;
                  return (
                    <div key={pick.id} style={{
                      padding: '10px 14px', borderBottom: '1px solid var(--line-soft)',
                      background: isCurrent ? 'var(--accent-soft, #EEF0FF)' : logEntry?.isUser ? 'var(--bg-2)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: prospect ? 4 : 0 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', minWidth: 48 }}>R{pick.round} #{pick.overallPick}</span>
                        <ColorBlock team={t} size={14} />
                        <strong style={{ fontSize: 12 }}>{t?.name}</strong>
                        {isCurrent && pick.currentTeamId === teamId && (
                          <span className="chip pos" style={{ fontSize: 9, marginLeft: 'auto' }}>YOUR PICK</span>
                        )}
                        {isCurrent && pick.currentTeamId !== teamId && (
                          <span className="chip outline" style={{ fontSize: 9, marginLeft: 'auto', animation: 'pulse 1.5s infinite' }}>On Clock</span>
                        )}
                      </div>
                      {prospect && (
                        <div style={{ fontSize: 13, paddingLeft: 56 }}>
                          <strong>{prospect.firstName} {prospect.lastName}</strong>
                          <span className="mono muted" style={{ marginLeft: 8 }}>{prospect.position}</span>
                          {logEntry && <span style={{ marginLeft: 8 }}><OvrPill ovr={logEntry.rating} /></span>}
                        </div>
                      )}
                    </div>
                  );
                }).reverse()}
                {draftLog.length === 0 && !isUserOnClock && (
                  <div style={{ padding: 20, textAlign: 'center' }} className="muted">Draft starting...</div>
                )}
              </div>
            </div>

            {/* Prospect selection */}
            <div className="card">
              <div className="card-h">
                <h2>{isUserOnClock ? 'You are on the clock!' : `Available Prospects (${available.length})`}</h2>
                {isUserOnClock && <span className="right" style={{ color: 'var(--accent)' }}>R{currentPick.round} #{currentPick.overallPick}</span>}
              </div>
              <div className="card-b tight" style={{ maxHeight: 550, overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="num">Rk</th><th>Prospect</th><th>Pos</th><th>Age</th>
                      <th>Range</th><th className="num">OVR</th><th>Pot</th>
                      {isUserOnClock && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {available.slice(0, 40).map(p => (
                      <tr key={p.id}>
                        <td className="num mono">{p.projRank}</td>
                        <td><strong>{p.name}</strong></td>
                        <td className="mono">{p.pos}</td>
                        <td>{p.age}</td>
                        <td className="mono">{p.ratingRange[0]}-{p.ratingRange[1]}</td>
                        <td className="num">{p.ovr != null ? <OvrPill ovr={p.ovr} /> : <span className="muted">?</span>}</td>
                        <td>{p.potential != null ? <Stars n={p.potential} /> : <span className="muted">—</span>}</td>
                        {isUserOnClock && (
                          <td><button className="btn primary" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => userDraftPlayer(p.id)}>Draft</button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS MODE */}
        {!showBoard && mode === 'results' && (
          <div className="card">
            <div className="card-h"><h2>Draft Results</h2><span className="right">{totalDrafted} players drafted</span></div>
            <div className="card-b tight" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="tbl">
                <thead><tr><th className="num">Pick</th><th>Team</th><th>Player</th><th>Pos</th><th className="num">OVR</th></tr></thead>
                <tbody>
                  {picks.filter(p => p.prospectId).map(p => {
                    const prospect = draftClass.find(pr => pr.id === p.prospectId);
                    const t = findTeam(p.currentTeamId);
                    const overall = prospect
                      ? prospect.exactRating ?? Math.round((prospect.ratingRange[0] + prospect.ratingRange[1]) / 2)
                      : 0;
                    return (
                      <tr key={p.id} style={p.currentTeamId === teamId ? { background: 'var(--bg-2)', fontWeight: 600 } : {}}>
                        <td className="num mono">R{p.round} #{p.overallPick}</td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ColorBlock team={t} size={16} /> {t?.name}</div></td>
                        <td><strong>{prospect ? `${prospect.firstName} ${prospect.lastName}` : '—'}</strong></td>
                        <td className="mono">{prospect?.position}</td>
                        <td className="num"><OvrPill ovr={overall} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Mock Draft Board ─────────────────────────────────────────────────────────
function MockDraftBoard({ draftClass, revealed, board, onUpdate }) {
  const all = draftClass
    .filter(p => !p.draftedByTeamId)
    .map(p => bridgeProspect(p, revealed))
    .sort((a, b) => a.projRank - b.projRank);

  const boardSet = new Set(board);
  const boarded = board.map(id => all.find(p => p.id === id)).filter(Boolean);
  const available = all.filter(p => !boardSet.has(p.id));

  const [posFilter, setPosFilter] = useState('');

  function move(idx, dir) {
    const next = [...board];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onUpdate(next);
  }

  function addToBoard(id) { onUpdate([...board, id]); }
  function removeFromBoard(id) { onUpdate(board.filter(x => x !== id)); }

  const filtered = available.filter(p => !posFilter || p.pos === posFilter);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Left: personal board */}
      <div className="card">
        <div className="card-h">
          <h2>My Board</h2>
          <span className="right muted" style={{ fontSize: 12 }}>{boarded.length} ranked</span>
        </div>
        <div className="card-b tight" style={{ maxHeight: 520, overflowY: 'auto' }}>
          {boarded.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
              Add prospects from the right →
            </div>
          )}
          {boarded.map((p, idx) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderBottom: '1px solid var(--line-soft)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--neon)', minWidth: 22 }}>
                #{idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {p.pos} · {p.ratingRange[0]}–{p.ratingRange[1]}
                  {p.ovr != null ? ` · OVR ${p.ovr}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                <button className="btn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => move(idx, 1)} disabled={idx === boarded.length - 1}>↓</button>
                <button className="btn" style={{ padding: '2px 7px', fontSize: 11, color: 'var(--neg)', borderColor: 'var(--neg)' }} onClick={() => removeFromBoard(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: available to add */}
      <div className="card">
        <div className="card-h">
          <h2>Available Prospects</h2>
          <span className="right muted" style={{ fontSize: 12 }}>{available.length} left</span>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['', 'QB','RB','WR','TE','OT','OG','C','EDGE','DL','LB','CB','S'].map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              className={`btn${posFilter === pos ? ' primary' : ''}`}
              style={{ padding: '2px 8px', fontSize: 11 }}>
              {pos || 'All'}
            </button>
          ))}
        </div>
        <div className="card-b tight" style={{ maxHeight: 468, overflowY: 'auto' }}>
          <table className="tbl">
            <thead><tr><th className="num">Rk</th><th>Prospect</th><th>Pos</th><th>Range</th><th className="num">OVR</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="num mono">{p.projRank}</td>
                  <td><strong>{p.name}</strong></td>
                  <td className="mono">{p.pos}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{p.ratingRange[0]}–{p.ratingRange[1]}</td>
                  <td className="num">{p.ovr != null ? <OvrPill ovr={p.ovr} /> : <span className="muted">?</span>}</td>
                  <td>
                    <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => addToBoard(p.id)}>+ Add</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
