import { useState, useEffect, useRef, Fragment } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, FieldDiagram, InjBadge } from '../components/Chrome.jsx';

export function ScreenGameWeek({ onNav }) {
  const { userTeam, teams, week, season, actions } = useLeague();
  const [mode, setMode] = useState('preview');
  const [gameResult, setGameResult] = useState(null);
  const [drives, setDrives] = useState([]);
  const [driveIndex, setDriveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [simWeek, setSimWeek] = useState(null);
  const [simOpp, setSimOpp] = useState(null);

  const team = userTeam;
  if (!team) return null;

  const previewWeek = week + 1;
  const previewOpp = findOpponent(actions.getRawLeague(), team, previewWeek, teams);

  function startSim() {
    try {
      const weekToSim = previewWeek;
      const opp = previewOpp;
      const result = actions.simulateWeek(weekToSim);
      if (!result || !Array.isArray(result) || result.length === 0) { setMode('recap'); return; }
      const engineId = team._engine?.id;
      const userGame = result.find(g =>
        g.homeTeamId === engineId || g.awayTeamId === engineId
      );
      if (!userGame) { setMode('recap'); return; }

      setSimWeek(weekToSim);
      setSimOpp(opp);
      setGameResult(userGame);
      const log = (userGame.driveLog || []).map((d, i) => mapDrive(d, i, userGame, team));
      setDrives(log);
      setDriveIndex(0);
      setMode('live');
      setPaused(false);
    } catch (e) {
      console.error('[startSim]', e);
      setMode('recap');
    }
  }

  function skipToEnd() {
    setDriveIndex(drives.length);
    setMode('recap');
  }

  if (mode === 'preview') {
    return <GamePreview team={team} opp={previewOpp} week={previewWeek} season={season} onStart={startSim} onNav={onNav} />;
  }

  if (mode === 'live') {
    return (
      <GameLive
        team={team}
        opp={simOpp}
        game={gameResult}
        drives={drives}
        driveIndex={driveIndex}
        setDriveIndex={setDriveIndex}
        paused={paused}
        setPaused={setPaused}
        onSkip={skipToEnd}
        onDone={() => setMode('recap')}
      />
    );
  }

  return (
    <GameRecap
      team={team}
      opp={simOpp}
      game={gameResult}
      drives={drives}
      week={simWeek}
      onNext={() => { setMode('preview'); setGameResult(null); setDrives([]); setSimWeek(null); setSimOpp(null); }}
    />
  );
}

function findOpponent(league, userTeam, week, bridgedTeams) {
  if (!league || !userTeam) return bridgedTeams?.[1] || userTeam || {};
  const schedWeek = league.schedule?.find(s => s.week === week);
  if (!schedWeek) return bridgedTeams.find(t => t.id !== userTeam.id) || userTeam;
  const engineId = userTeam._engine?.id;
  const game = (schedWeek.games || []).find(g =>
    g.homeTeamId === engineId || g.awayTeamId === engineId
  );
  if (!game) return bridgedTeams[1] || userTeam;
  const oppId = game.homeTeamId === engineId ? game.awayTeamId : game.homeTeamId;
  return bridgedTeams.find(t => t._engine?.id === oppId) || bridgedTeams[1] || userTeam;
}

function drivePoints(outcome) {
  if (outcome === 'touchdown') return 7;
  if (outcome === 'fieldGoal') return 3;
  if (outcome === 'safety') return 2;
  return 0;
}

function mapDrive(d, i, game, userTeam) {
  const isUs = d.possessionTeamId === userTeam?._engine?.id;
  const outcome = d.outcome;
  const pts = drivePoints(outcome);
  // Safety scores for the defense, not offense
  const scoringTeam = outcome === 'safety' ? (isUs ? 'them' : 'us') : (isUs ? 'us' : 'them');
  return {
    num: i + 1,
    team: isUs ? 'us' : 'them',
    yards: d.yardsGained || 0,
    plays: Math.max(1, Math.ceil(Math.abs(d.yardsGained || 0) / 6)),
    result: driveOutcomeLabel(outcome),
    los: d.startingFieldPosition || 25,
    time: formatSeconds(d.timeUsedSeconds || 0),
    concepts: [d.offensiveConceptId, d.defensiveConceptId].filter(Boolean).join(' · '),
    keyNotes: d.keyPlayNotes || [],
    points: pts,
    scoringTeam,
  };
}

function driveOutcomeLabel(outcome) {
  if (!outcome) return '—';
  const map = { touchdown: 'TD', fieldGoal: 'FG', punt: 'PUNT', interception: 'INT', fumble: 'FUM', turnoverOnDowns: 'TOD', safety: 'SAF' };
  return map[outcome] || outcome;
}

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function GamePreview({ team, opp, week, season, onStart, onNav }) {
  const isHome = week % 2 === 1;

  return (
    <>
      <Topbar
        crumb={`Game Week / Week ${week}`}
        title={`${team.name} vs ${opp.name}`}
        actions={
          <>
            <button className="btn" onClick={() => onNav('strategy')}>Game Plan</button>
            <button className="btn primary" onClick={onStart}>Start Sim →</button>
          </>
        }
      />
      <div className="page">
        <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            background: `linear-gradient(90deg, ${team.primary} 0%, ${team.primary} 35%, white 50%, ${opp.primary} 65%, ${opp.primary} 100%)`,
            color: 'white', padding: '28px 32px', alignItems: 'center', gap: 24,
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.85, textTransform: 'uppercase' }}>{isHome ? 'Home' : 'Away'} · {team.w}-{team.l}</div>
              <div style={{ font: '700 32px var(--font-display)', marginTop: 4 }}>{team.city}</div>
              <div style={{ font: '700 32px var(--font-display)', lineHeight: 1 }}>{team.name}</div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>OVR {team.ovr} · OFF {team.offRating} · DEF {team.defRating}</div>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--ink-2)' }}>
              <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', letterSpacing: '0.1em' }}>WEEK {week} · SEASON {season}</div>
              <div style={{ font: '700 56px var(--font-display)', color: 'var(--ink-1)', lineHeight: 1, margin: '6px 0' }}>VS</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.85, textTransform: 'uppercase' }}>{isHome ? 'Away' : 'Home'} · {opp.w}-{opp.l}</div>
              <div style={{ font: '700 32px var(--font-display)', marginTop: 4 }}>{opp.city}</div>
              <div style={{ font: '700 32px var(--font-display)', lineHeight: 1 }}>{opp.name}</div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>OVR {opp.ovr} · OFF {opp.offRating} · DEF {opp.defRating}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-h"><h2>Your Strategy</h2><span className="right" style={{ cursor: 'pointer' }} onClick={() => onNav('strategy')}>Edit →</span></div>
            <div className="card-b">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offense</div>
                  <div style={{ fontWeight: 700 }}>{formatSystem(team.strategy?.offensiveSystem)}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Defense</div>
                  <div style={{ fontWeight: 700 }}>{formatSystem(team.strategy?.defensiveSystem)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, columnGap: 12, fontSize: 13 }}>
                {Object.entries(team.strategy?.tendencies || {}).map(([k, v]) => (
                  <Fragment key={k}>
                    <span>{formatTendencyLabel(k)}</span>
                    <span className="mono">{v}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h2>Inactives</h2></div>
            <div className="card-b tight">
              {team.roster.filter(p => p.injStatus).length === 0 && (
                <div style={{ padding: 16 }} className="muted">All starters available.</div>
              )}
              {team.roster.filter(p => p.injStatus).map(p => (
                <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <strong>{p.name}</strong>
                  <span className="muted">· {p.pos}</span>
                  <span style={{ flex: 1 }} />
                  <InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GameLive({ team, opp, game, drives, driveIndex, setDriveIndex, paused, setPaused, onSkip, onDone }) {
  const timerRef = useRef(null);

  const visibleDrives = drives.slice(0, driveIndex);
  const currentDrive = drives[driveIndex - 1];
  const quarter = currentDrive ? Math.min(4, Math.ceil(driveIndex / Math.ceil(drives.length / 4))) : 1;
  const poss = currentDrive?.team || 'us';
  const los = currentDrive?.los || 25;

  // Running score — accumulate points from visible drives
  let scoreUs = 0;
  let scoreThem = 0;
  for (const d of visibleDrives) {
    if (d.points > 0) {
      if (d.scoringTeam === 'us') scoreUs += d.points;
      else scoreThem += d.points;
    }
  }

  useEffect(() => {
    if (paused || driveIndex >= drives.length) {
      if (driveIndex >= drives.length && drives.length > 0) onDone();
      return;
    }
    timerRef.current = setTimeout(() => {
      setDriveIndex(prev => prev + 1);
    }, 700);
    return () => clearTimeout(timerRef.current);
  }, [driveIndex, paused, drives.length]);

  const keyPlays = game.keyEvents || [];

  return (
    <>
      <Topbar crumb="Game Week / Live" title={`Live · Week ${game.week || '?'}`} actions={
        <>
          <button className="btn" onClick={() => setPaused(p => !p)}>{paused ? 'Resume' : 'Pause'}</button>
          <button className="btn" onClick={onSkip}>Skip to End</button>
        </>
      } />
      <div className="page">
        <div className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ background: 'var(--ink-1)', color: 'white', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '20px 28px', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ColorBlock team={team} size={48} />
              <div>
                <div style={{ font: '700 20px var(--font-display)' }}>{team.abbr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{team.name}</div>
              </div>
              <div style={{ font: '700 64px var(--font-display)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{scoreUs}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 11px var(--font-mono)', letterSpacing: '0.12em', opacity: 0.6 }}>Q{quarter}</div>
              <div style={{ display: 'inline-flex', gap: 4, marginTop: 8 }}>
                {[1, 2, 3, 4].map(q => <div key={q} style={{ width: 8, height: 8, borderRadius: 99, background: q <= quarter ? 'var(--accent)' : 'rgba(255,255,255,0.18)' }} />)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>{poss === 'us' ? team.abbr : opp.abbr} ball</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
              <div style={{ font: '700 64px var(--font-display)', marginRight: 'auto', fontVariantNumeric: 'tabular-nums' }}>{scoreThem}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: '700 20px var(--font-display)' }}>{opp.abbr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{opp.name}</div>
              </div>
              <ColorBlock team={opp} size={48} />
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <FieldDiagram losYard={los} possessionLeft={poss === 'us'} />
          </div>
        </div>

        <div className="grid grid-3-2">
          <div className="card">
            <div className="card-h"><h2>Drive Log</h2><span className="right">{visibleDrives.length} drives</span></div>
            <div className="card-b tight" style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>#</th><th>Team</th><th className="num">Yds</th><th>Time</th><th>Result</th></tr></thead>
                <tbody>
                  {[...visibleDrives].reverse().map(d => (
                    <tr key={d.num} style={{ animation: 'fadeIn 0.3s' }}>
                      <td className="mono">{d.num}</td>
                      <td><ColorBlock team={d.team === 'us' ? team : opp} size={14} /> <span className="mono" style={{ marginLeft: 6 }}>{d.team === 'us' ? team.abbr : opp.abbr}</span></td>
                      <td className="num mono">{d.yards}</td>
                      <td className="mono">{d.time}</td>
                      <td><span className={`chip ${d.result === 'TD' ? 'pos' : 'outline'}`} style={{ fontSize: 11 }}>{d.result}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <h2>Key Plays</h2>
              <span className="right" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--neg)', animation: 'pulse 1.4s infinite' }} />LIVE
              </span>
            </div>
            <div className="card-b tight">
              {keyPlays.length === 0 && <div style={{ padding: 16 }} className="muted">Game is starting…</div>}
              {keyPlays.map((kp, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', animation: 'fadeIn 0.3s' }}>
                  <div style={{ fontSize: 13 }}>{kp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GameRecap({ team, opp, game, drives, week, onNext }) {
  if (!game) return null;
  const isHome = game.homeTeamId === team?._engine?.id;
  const bs = game.boxScore || { home: { points: 0 }, away: { points: 0 } };
  const scoreUs = isHome ? bs.home.points : bs.away.points;
  const scoreThem = isHome ? bs.away.points : bs.home.points;
  const won = scoreUs > scoreThem;

  return (
    <>
      <Topbar crumb={`Game Week / Final`} title={`Final · Week ${week}`} actions={
        <button className="btn primary" onClick={onNext}>Continue to Week {week + 1} →</button>
      } />
      <div className="page">
        <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '24px 32px', gap: 24, background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ColorBlock team={team} size={56} />
              <div>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{team.city}</div>
                <div style={{ font: '700 26px var(--font-display)' }}>{team.name}</div>
              </div>
              <div style={{ font: '700 80px var(--font-display)', marginLeft: 'auto', color: won ? 'var(--ink-1)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>{scoreUs}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 11px var(--font-mono)', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>FINAL</div>
              <div className={`chip ${won ? 'pos' : ''}`} style={{ marginTop: 8 }}>
                {won ? 'W' : 'L'} · {won ? `+${scoreUs - scoreThem}` : scoreUs - scoreThem}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
              <div style={{ font: '700 80px var(--font-display)', marginRight: 'auto', color: !won ? 'var(--ink-1)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>{scoreThem}</div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{opp.city}</div>
                <div style={{ font: '700 26px var(--font-display)' }}>{opp.name}</div>
              </div>
              <ColorBlock team={opp} size={56} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2>Drive Chart</h2><span className="right">{drives.length} drives</span></div>
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th>#</th><th>Team</th><th className="num">Yds</th><th>Time</th><th>Concepts</th><th>Result</th></tr></thead>
              <tbody>
                {drives.map(d => (
                  <tr key={d.num}>
                    <td className="mono">{d.num}</td>
                    <td><ColorBlock team={d.team === 'us' ? team : opp} size={14} /> <span className="mono" style={{ marginLeft: 6 }}>{d.team === 'us' ? team.abbr : opp.abbr}</span></td>
                    <td className="num mono">{d.yards}</td>
                    <td className="mono">{d.time}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{d.concepts}</td>
                    <td><span className={`chip ${d.result === 'TD' ? 'pos' : 'outline'}`} style={{ fontSize: 11 }}>{d.result}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {game.injuries?.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-h"><h2>Game Injuries</h2></div>
            <div className="card-b tight">
              {game.injuries.map((inj, i) => {
                const injPlayer = resolvePlayerName(inj.playerId, team, opp);
                return (
                  <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line-soft)' }}>
                    <span className="badge q">INJ</span>
                    <strong>{injPlayer.name}</strong>
                    <span className="muted">· {injPlayer.pos}</span>
                    {inj.injury && <span className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>{inj.injury} · {inj.weeksRemaining}wk</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function resolvePlayerName(playerId, team, opp) {
  const allPlayers = [...(team.roster || []), ...(opp.roster || [])];
  const found = allPlayers.find(p => p.id === playerId || p._engine?.id === playerId);
  if (found) return { name: found.name, pos: found.pos };
  // Fallback: extract readable info from ID
  const parts = (playerId || '').split('_');
  const pos = parts.find(p => ['QB','RB','WR','TE','OT','OG','C','EDGE','DT','DL','LB','CB','S','K','P'].includes(p.toUpperCase()));
  return { name: playerId, pos: pos?.toUpperCase() || '?' };
}

function formatSystem(key) {
  if (!key) return '—';
  const map = {
    westCoast: 'West Coast', powerRun: 'Power Run', spreadRpo: 'Spread RPO',
    verticalAirRaid: 'Vertical Air Raid', balancedPro: 'Balanced Pro',
    fourThreeZone: '4-3 Zone', threeFourPressure: '3-4 Pressure',
    nickelMatch: 'Nickel Match', manBlitz: 'Man Blitz', bendDontBreak: "Bend Don't Break",
  };
  return map[key] || key;
}

function formatTendencyLabel(key) {
  const map = {
    tempo: 'Tempo', aggression: 'Aggression', runPassLean: 'Run / Pass Lean',
    deepPassing: 'Deep Passing', blitzRate: 'Blitz Rate', coverageRisk: 'Coverage Risk',
  };
  return map[key] || key;
}
