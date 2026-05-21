import { useState, useEffect, useRef, Fragment, memo } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, FieldDiagram, InjBadge } from '../components/Chrome.jsx';

const REGULAR_SEASON_WEEKS = 10;

export function ScreenGameWeek({ onNav }) {
  const { userTeam, teams, week, season, phase, actions } = useLeague();
  const [mode, setMode] = useState('preview');
  const [gameResult, setGameResult] = useState(null);
  const [drives, setDrives] = useState([]);
  const [driveIndex, setDriveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [simWeek, setSimWeek] = useState(null);
  const [simOpp, setSimOpp] = useState(null);
  // playoff sim state
  const [playoffRoundGames, setPlayoffRoundGames] = useState(null);
  const [playoffRoundName, setPlayoffRoundName] = useState(null);

  const team = userTeam;
  if (!team) return null;

  // ── Season complete: regular season is over, playoffs not yet generated ──
  const regularSeasonDone = week >= REGULAR_SEASON_WEEKS;
  const inPlayoffs = phase === 'playoffs';

  // Show season-complete screen
  if (regularSeasonDone && !inPlayoffs && mode === 'preview') {
    return (
      <SeasonComplete
        team={team}
        teams={teams}
        season={season}
        actions={actions}
        onNav={onNav}
      />
    );
  }

  // Show playoff hub
  if (inPlayoffs && (mode === 'preview' || mode === 'playoffs')) {
    return (
      <PlayoffHub
        team={team}
        teams={teams}
        season={season}
        actions={actions}
        onNav={onNav}
        playoffRoundGames={playoffRoundGames}
        playoffRoundName={playoffRoundName}
        onSimRound={(roundName) => {
          const games = actions.simulatePlayoffRound(roundName);
          setPlayoffRoundGames(games);
          setPlayoffRoundName(roundName);
        }}
      />
    );
  }

  const previewWeek = week + 1;
  const previewOpp = findOpponent(actions.getRawLeague(), team, previewWeek, teams);

  function startSim() {
    try {
      const weekToSim = previewWeek;
      const opp = previewOpp;
      const result = actions.simulateWeek(weekToSim);
      if (!result || !Array.isArray(result) || result.length === 0) {
        setMode('preview');
        return;
      }
      const engineId = team._engine?.id;
      const userGame = result.find(g =>
        g.homeTeamId === engineId || g.awayTeamId === engineId
      );
      if (!userGame) { setMode('preview'); return; }

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
      setMode('preview');
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

  // recap — if this was the final regular-season game, show "End of Season" CTA
  const isLastRegularGame = simWeek >= REGULAR_SEASON_WEEKS;
  return (
    <GameRecap
      team={team}
      opp={simOpp}
      game={gameResult}
      drives={drives}
      week={simWeek}
      isSeasonFinal={isLastRegularGame}
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
  const map = { touchdown: 'TD', fieldGoal: 'FG', punt: 'PUNT', interception: 'INT', fumble: 'FUM', turnoverOnDowns: 'TOD', safety: 'SAF', turnover: 'TO', sack: 'SACK' };
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
            background: `linear-gradient(90deg, ${team.primary} 0%, ${team.primary} 32%, var(--turf-0) 48%, var(--turf-0) 52%, ${opp.primary} 68%, ${opp.primary} 100%)`,
            color: 'var(--chalk)', padding: '28px 32px', alignItems: 'center', gap: 24,
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.85, textTransform: 'uppercase' }}>{isHome ? 'Home' : 'Away'} · {team.w}-{team.l}</div>
              <div style={{ font: '700 32px var(--font-display)', marginTop: 4 }}>{team.city}</div>
              <div style={{ font: '700 32px var(--font-display)', lineHeight: 1 }}>{team.name}</div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>OVR {team.ovr} · OFF {team.offRating} · DEF {team.defRating}</div>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--chalk)' }}>
              <div style={{ font: '700 11px var(--font-mono)', color: 'var(--neon)', letterSpacing: '0.18em' }}>WEEK {week} · SEASON {season}</div>
              <div style={{ font: '400 72px var(--font-display)', color: 'var(--chalk)', lineHeight: 1, margin: '6px 0', letterSpacing: '0.02em', textShadow: '0 0 20px var(--neon-glow)' }}>VS</div>
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
    }, 1700);
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
          <div style={{ background: 'var(--turf-0)', color: 'var(--chalk)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '20px 28px', gap: 24, borderBottom: '2px solid var(--neon)', boxShadow: 'inset 0 0 80px rgba(199,255,62,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ColorBlock team={team} size={48} />
              <div>
                <div style={{ font: '400 24px var(--font-display)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{team.abbr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{team.name}</div>
              </div>
              <div className="score-big" style={{ marginLeft: 'auto', fontSize: 64 }}>{scoreUs}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 11px var(--font-stamp)', letterSpacing: '0.18em', color: 'var(--neon)', textTransform: 'uppercase' }}>Q{quarter}</div>
              <div style={{ display: 'inline-flex', gap: 6, marginTop: 10 }}>
                {[1, 2, 3, 4].map(q => <div key={q} style={{ width: 12, height: 4, background: q <= quarter ? 'var(--neon)' : 'rgba(255,255,255,0.18)', boxShadow: q <= quarter ? '0 0 8px var(--neon-glow)' : 'none' }} />)}
              </div>
              <div style={{ font: '700 11px var(--font-stamp)', letterSpacing: '0.18em', color: 'var(--hot)', marginTop: 10, textTransform: 'uppercase' }}>{poss === 'us' ? '◀ ' : ''}{poss === 'us' ? team.abbr : opp.abbr} ball{poss === 'us' ? '' : ' ▶'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
              <div className="score-big" style={{ marginRight: 'auto', fontSize: 64 }}>{scoreThem}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: '400 24px var(--font-display)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{opp.abbr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{opp.name}</div>
              </div>
              <ColorBlock team={opp} size={48} />
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <SimPlayField
              team={team}
              opp={opp}
              currentDrive={currentDrive}
              driveIndex={driveIndex}
              los={los}
              poss={poss}
            />
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
                      <td><ResultChip result={d.result} /></td>
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

function GameRecap({ team, opp, game, drives, week, isSeasonFinal, onNext }) {
  if (!game) return null;
  const isHome = game.homeTeamId === team?._engine?.id;
  const bs = game.boxScore || { home: { points: 0 }, away: { points: 0 } };
  const scoreUs = isHome ? bs.home.points : bs.away.points;
  const scoreThem = isHome ? bs.away.points : bs.home.points;
  const won = scoreUs > scoreThem;

  const nextLabel = isSeasonFinal ? 'Season Complete — View Playoffs →' : `Continue to Week ${(week || 0) + 1} →`;

  return (
    <>
      <Topbar crumb={`Game Week / Final`} title={`Final · Week ${week}`} actions={
        <button className="btn primary" onClick={onNext}>{nextLabel}</button>
      } />
      <div className="page">
        <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', alignItems: 'center', padding: '24px 24px', gap: 0, background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ColorBlock team={team} size={44} />
              <div style={{ minWidth: 0, flex: '1 1 0' }}>
                <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{team.city}</div>
                <div style={{ font: '400 20px var(--font-display)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>{team.name}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 48, fontVariantNumeric: 'tabular-nums', color: won ? 'var(--neon)' : 'var(--ink-4)', textShadow: won ? '0 0 24px var(--neon-glow)' : 'none', lineHeight: 1, flexShrink: 0 }}>{scoreUs}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 11px var(--font-mono)', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>FINAL</div>
              <div className={`chip ${won ? 'pos' : ''}`} style={{ marginTop: 8 }}>
                {won ? 'W' : 'L'} · {won ? `+${scoreUs - scoreThem}` : scoreUs - scoreThem}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 48, fontVariantNumeric: 'tabular-nums', color: !won ? 'var(--neon)' : 'var(--ink-4)', textShadow: !won ? '0 0 24px var(--neon-glow)' : 'none', lineHeight: 1, flexShrink: 0 }}>{scoreThem}</div>
              <div style={{ textAlign: 'right', minWidth: 0, flex: '1 1 0' }}>
                <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{opp.city}</div>
                <div style={{ font: '400 20px var(--font-display)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>{opp.name}</div>
              </div>
              <ColorBlock team={opp} size={44} />
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
                    <td className="muted" style={{ fontSize: 12 }}>{formatConcepts(d.concepts)}</td>
                    <td><ResultChip result={d.result} /></td>
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

// ── Season Complete Screen ─────────────────────────────────────
function SeasonComplete({ team, teams, season, actions, onNav }) {
  const [loading, setLoading] = useState(false);
  const raw = actions.getRawLeague();
  const standings = (raw?.standings || [])
    .slice()
    .sort((a, b) => (b.wins - a.wins) || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)));

  function handleGenerate() {
    setLoading(true);
    try {
      actions.generatePlayoffs();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <>
      <Topbar
        crumb={`Season ${season} / Regular Season`}
        title="Regular Season Complete"
        actions={
          <button className="btn primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Begin Playoffs →'}
          </button>
        }
      />
      <div className="page">
        {/* Season-end hero banner */}
        <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{
            background: `linear-gradient(135deg, var(--turf-0) 0%, #0f2a18 100%)`,
            padding: '32px 36px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '2px solid var(--neon)',
            boxShadow: 'inset 0 0 80px rgba(199,255,62,0.05)',
          }}>
            <div>
              <div style={{ font: '700 11px var(--font-stamp)', letterSpacing: '0.18em', color: 'var(--neon)', textTransform: 'uppercase', marginBottom: 8 }}>
                Season {season} · Week {REGULAR_SEASON_WEEKS} Complete
              </div>
              <div style={{ font: '700 36px var(--font-display)', color: 'var(--chalk)', lineHeight: 1, marginBottom: 6 }}>
                {team.city} {team.name}
              </div>
              <div style={{ font: '700 28px var(--font-mono)', color: team.w >= 6 ? 'var(--neon)' : 'var(--hot)', letterSpacing: '0.05em' }}>
                {team.w}–{team.l} · {team.conf}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '700 11px var(--font-stamp)', color: 'var(--ink-3)', letterSpacing: '0.12em', marginBottom: 6 }}>PLAYOFF SEEDS</div>
              <div style={{ font: '700 11px var(--font-stamp)', color: 'var(--ink-4)', letterSpacing: '0.08em' }}>Top 6 teams advance</div>
              <div style={{ font: '700 11px var(--font-stamp)', color: 'var(--ink-4)', letterSpacing: '0.08em', marginTop: 4 }}>Seeds 1 & 2 earn first-round byes</div>
            </div>
          </div>
        </div>

        {/* Final standings */}
        <div className="card">
          <div className="card-h"><h2>Final Standings</h2><span className="right" onClick={() => onNav('standings')} style={{ cursor: 'pointer' }}>Full Standings →</span></div>
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th>#</th><th>Team</th><th className="num">W</th><th className="num">L</th><th className="num">PF</th><th className="num">PA</th><th></th></tr></thead>
              <tbody>
                {standings.slice(0, 8).map((s, idx) => {
                  const t = teams.find(t => t._engine?.id === s.teamId) || {};
                  const isUser = t.id === team.id;
                  const isPlayoff = idx < 6;
                  return (
                    <tr key={s.teamId} style={{ background: isUser ? 'rgba(199,255,62,0.04)' : 'transparent' }}>
                      <td className="mono" style={{ color: isPlayoff ? 'var(--neon)' : 'var(--ink-4)', fontWeight: isPlayoff ? 700 : 400 }}>{idx + 1}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <ColorBlock team={t} size={16} />
                          <span style={{ fontWeight: isUser ? 700 : 400 }}>{t.city} {t.name}</span>
                        </span>
                      </td>
                      <td className="num mono">{s.wins}</td>
                      <td className="num mono">{s.losses}</td>
                      <td className="num mono">{Math.round(s.pointsFor || 0)}</td>
                      <td className="num mono">{Math.round(s.pointsAgainst || 0)}</td>
                      <td>
                        {idx < 2 && <span className="chip pos" style={{ fontSize: 10 }}>BYE</span>}
                        {idx >= 2 && idx < 6 && <span className="chip outline" style={{ fontSize: 10 }}>PLAYOFF</span>}
                        {isUser && <span className="chip" style={{ fontSize: 10, marginLeft: 4, background: 'var(--neon)', color: '#000' }}>YOU</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Playoff Hub ────────────────────────────────────────────────
function PlayoffHub({ team, teams, season, actions, onNav, playoffRoundGames, playoffRoundName, onSimRound }) {
  const raw = actions.getRawLeague();
  const playoff = raw?.playoff || {};
  const seeds = playoff.seeds || [];
  const rounds = playoff.rounds || [];
  const champion = playoff.championTeamId;

  function seedTeam(seed) {
    const entry = seeds.find(s => s.seed === seed);
    if (!entry) return null;
    return teams.find(t => t._engine?.id === entry.teamId) || null;
  }

  function getTeamById(id) {
    return teams.find(t => t._engine?.id === id) || null;
  }

  const firstRound = rounds.find(r => r.name === 'firstRound');
  const semifinals = rounds.find(r => r.name === 'semifinals');
  const championship = rounds.find(r => r.name === 'championship');

  const firstRoundDone = (firstRound?.games || []).every(g => g.winnerTeamId);
  const semifinalsDone = (semifinals?.games || []).every(g => g.winnerTeamId);
  const championshipDone = !!champion;

  // Determine next round to sim
  let nextRound = null;
  if (!firstRoundDone) nextRound = 'firstRound';
  else if (!semifinalsDone) nextRound = 'semifinals';
  else if (!championshipDone) nextRound = 'championship';

  const roundLabel = { firstRound: 'First Round', semifinals: 'Semifinals', championship: 'Championship' };

  return (
    <>
      <Topbar
        crumb={`Season ${season} / Playoffs`}
        title={championshipDone ? '🏆 Champions Crowned' : `Playoffs · ${roundLabel[nextRound] || 'Complete'}`}
        actions={
          !championshipDone && nextRound ? (
            <button className="btn primary" onClick={() => onSimRound(nextRound)}>
              Simulate {roundLabel[nextRound]} →
            </button>
          ) : championshipDone ? (
            <button className="btn" onClick={() => onNav('standings')}>View Standings</button>
          ) : null
        }
      />
      <div className="page">
        {/* Champion banner */}
        {championshipDone && (() => {
          const champ = getTeamById(champion);
          const isUser = champ?.id === team.id;
          return (
            <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
              <div style={{
                background: `linear-gradient(135deg, ${champ?.primary || '#111'} 0%, var(--turf-0) 100%)`,
                padding: '32px 36px', textAlign: 'center',
                borderBottom: '2px solid var(--neon)',
                boxShadow: 'inset 0 0 80px rgba(199,255,62,0.08)',
              }}>
                <div style={{ font: '700 11px var(--font-stamp)', color: 'var(--neon)', letterSpacing: '0.2em', marginBottom: 8 }}>SEASON {season} CHAMPION</div>
                <div style={{ font: '700 48px var(--font-display)', color: 'var(--chalk)', lineHeight: 1 }}>
                  {champ?.city} {champ?.name}
                </div>
                {isUser && <div style={{ marginTop: 12, font: '700 14px var(--font-stamp)', color: 'var(--neon)', letterSpacing: '0.12em' }}>🏆 YOU WON THE CHAMPIONSHIP!</div>}
              </div>
            </div>
          );
        })()}

        {/* Bracket */}
        <div className="grid grid-2">
          {/* First round */}
          <div className="card">
            <div className="card-h"><h2>First Round</h2>{firstRoundDone && <span className="chip pos" style={{ fontSize: 10 }}>FINAL</span>}</div>
            <div className="card-b">
              {/* Byes */}
              <div style={{ marginBottom: 16, padding: '0 4px' }}>
                <div style={{ font: '700 10px var(--font-stamp)', color: 'var(--ink-4)', letterSpacing: '0.1em', marginBottom: 8 }}>FIRST-ROUND BYES</div>
                {[1, 2].map(seed => {
                  const t = seedTeam(seed);
                  return t ? (
                    <div key={seed} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <span className="chip pos" style={{ fontSize: 10, minWidth: 22, textAlign: 'center' }}>#{seed}</span>
                      <ColorBlock team={t} size={20} />
                      <span style={{ fontWeight: 700 }}>{t.city} {t.name}</span>
                      {t.id === team.id && <span className="chip" style={{ fontSize: 9, background: 'var(--neon)', color: '#000', marginLeft: 'auto' }}>YOU</span>}
                    </div>
                  ) : null;
                })}
              </div>
              {/* First round matchups */}
              <div style={{ font: '700 10px var(--font-stamp)', color: 'var(--ink-4)', letterSpacing: '0.1em', marginBottom: 8, padding: '0 4px' }}>MATCHUPS</div>
              {(firstRound?.games || []).map((g, i) => (
                <PlayoffMatchup key={i} game={g} teams={teams} userTeamId={team.id} />
              ))}
              {(!firstRound?.games?.length) && <div className="muted" style={{ padding: 12 }}>Bracket not yet generated.</div>}
            </div>
          </div>

          {/* Semifinals & Championship */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-h"><h2>Semifinals</h2>{semifinalsDone && <span className="chip pos" style={{ fontSize: 10 }}>FINAL</span>}</div>
              <div className="card-b">
                {firstRoundDone ? (
                  (semifinals?.games || []).map((g, i) => (
                    <PlayoffMatchup key={i} game={g} teams={teams} userTeamId={team.id} />
                  ))
                ) : (
                  <div className="muted" style={{ padding: 12 }}>Awaiting first round results.</div>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-h"><h2>Championship</h2>{championshipDone && <span className="chip pos" style={{ fontSize: 10 }}>FINAL</span>}</div>
              <div className="card-b">
                {semifinalsDone ? (
                  (championship?.games || []).map((g, i) => (
                    <PlayoffMatchup key={i} game={g} teams={teams} userTeamId={team.id} />
                  ))
                ) : (
                  <div className="muted" style={{ padding: 12 }}>Awaiting semifinal results.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Latest round results */}
        {playoffRoundGames && playoffRoundGames.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-h"><h2>Round Results</h2><span className="right">{roundLabel[playoffRoundName]}</span></div>
            <div className="card-b tight">
              {playoffRoundGames.map((g, i) => {
                const home = getTeamById(g.homeTeamId);
                const away = getTeamById(g.awayTeamId);
                const bs = g.boxScore || { home: { points: 0 }, away: { points: 0 } };
                const winner = g.winnerTeamId;
                return (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, opacity: winner && winner !== home?._engine?.id ? 0.45 : 1 }}>
                      <ColorBlock team={home} size={20} />
                      <span style={{ fontWeight: winner === home?._engine?.id ? 700 : 400 }}>{home?.name}</span>
                      <span className="mono" style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 22 }}>{bs.home.points}</span>
                    </span>
                    <span style={{ font: '700 10px var(--font-stamp)', color: 'var(--ink-4)', letterSpacing: '0.1em' }}>FINAL</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end', opacity: winner && winner !== away?._engine?.id ? 0.45 : 1 }}>
                      <span className="mono" style={{ marginRight: 'auto', fontWeight: 700, fontSize: 22 }}>{bs.away.points}</span>
                      <span style={{ fontWeight: winner === away?._engine?.id ? 700 : 400 }}>{away?.name}</span>
                      <ColorBlock team={away} size={20} />
                    </span>
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

function PlayoffMatchup({ game, teams, userTeamId }) {
  function getTeam(id) {
    return teams.find(t => t._engine?.id === id) || null;
  }
  const home = getTeam(game.homeTeamId);
  const away = getTeam(game.awayTeamId);
  const bs = game.boxScore;
  const winner = game.winnerTeamId;
  const done = !!winner;

  const rowStyle = (isHome) => {
    const tId = isHome ? home?._engine?.id : away?._engine?.id;
    const isWinner = winner === tId;
    const isUser = (isHome ? home : away)?.id === userTeamId;
    return {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderBottom: '1px solid var(--line-soft)',
      background: isUser ? 'rgba(199,255,62,0.03)' : 'transparent',
      opacity: done && !isWinner ? 0.45 : 1,
    };
  };

  return (
    <div style={{ marginBottom: 10, border: '1px solid var(--line)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={rowStyle(true)}>
        <ColorBlock team={home} size={18} />
        <span style={{ fontWeight: winner === home?._engine?.id ? 700 : 400, flex: 1 }}>{home?.city} {home?.name}</span>
        {done && <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>{bs?.home?.points ?? '—'}</span>}
        {winner === home?._engine?.id && <span className="chip pos" style={{ fontSize: 9 }}>W</span>}
      </div>
      <div style={rowStyle(false)}>
        <ColorBlock team={away} size={18} />
        <span style={{ fontWeight: winner === away?._engine?.id ? 700 : 400, flex: 1 }}>{away?.city} {away?.name}</span>
        {done && <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>{bs?.away?.points ?? '—'}</span>}
        {winner === away?._engine?.id && <span className="chip pos" style={{ fontSize: 9 }}>W</span>}
      </div>
    </div>
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

function ResultChip({ result }) {
  const isScore = result === 'TD' || result === 'FG';
  const isTurnover = result === 'INT' || result === 'FUM' || result === 'TO' || result === 'TOD';
  let cls = 'outline';
  let style = { fontSize: 11 };
  if (isScore) cls = 'pos';
  if (isTurnover) {
    cls = 'outline';
    style = { ...style, color: 'var(--neg)', borderColor: 'var(--neg)' };
  }
  if (result === 'SAF') {
    style = { ...style, color: 'var(--hot)', borderColor: 'var(--hot)' };
  }
  return <span className={`chip ${cls}`} style={style}>{result}</span>;
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

// ── Format raw concept IDs into human-readable labels ──
const CONCEPT_LABELS = {
  insideZone: 'Inside Zone', outsideZone: 'Outside Zone', powerRun: 'Power Run',
  stretch: 'Stretch', draw: 'Draw', counter: 'Counter', trap: 'Trap',
  meshConcept: 'Mesh', slants: 'Slants', fourVerts: 'Four Verts', flood: 'Flood',
  smashConcept: 'Smash', stickConcept: 'Stick', screenPass: 'Screen',
  playAction: 'Play Action', rpo: 'RPO', bootleg: 'Bootleg',
  qbOption: 'QB Option', deepPost: 'Deep Post', shallowCross: 'Shallow Cross',
  curlFlat: 'Curl-Flat', doublePosts: 'Double Posts', dagConcept: 'Dag',
  yCorner: 'Y-Corner', texasConcept: 'Texas', sailConcept: 'Sail',
  cover0: 'Cover 0', cover1: 'Cover 1', cover2: 'Cover 2', cover3: 'Cover 3',
  cover4: 'Cover 4', cover6: 'Cover 6', manFree: 'Man Free',
  twoManUnder: '2-Man Under', quarters: 'Quarters',
  zoneBlitz: 'Zone Blitz', fireZone: 'Fire Zone', spy: 'Spy',
  stuntTwist: 'Stunt/Twist', overload: 'Overload', tampa2: 'Tampa 2',
  abOption: 'QB Option', abSlants: 'Slants', abMesh: 'Mesh',
};

function formatConceptId(id) {
  if (!id) return '';
  if (CONCEPT_LABELS[id]) return CONCEPT_LABELS[id];
  // camelCase → Title Case
  return id.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

function formatConcepts(raw) {
  if (!raw) return '';
  return raw.split(' · ').map(formatConceptId).filter(Boolean).join(' · ');
}

// ── Animated Play Field for live sim ──────────────────────────
function SimPlayField({ team, opp, currentDrive, driveIndex, los, poss }) {
  const isUs = currentDrive ? currentDrive.team === 'us' : poss === 'us';
  const offTeam = isUs ? team : opp;
  const defTeam = isUs ? opp : team;
  const dir = isUs ? 1 : -1;

  const startLos = currentDrive?.los || los || 25;
  const endYards = currentDrive?.yards || 0;
  const endLos = Math.max(1, Math.min(99, startLos + endYards));
  const result = currentDrive?.result || null;
  const concepts = (currentDrive?.concepts || '').toLowerCase();

  const losX = 10 + startLos * 0.8;
  const endX = 10 + endLos * 0.8;

  // Determine play type
  const isRunPlay = /zone|power|run|draw|counter|stretch|trap/i.test(concepts) && !/play action/i.test(concepts);
  const isDeep = /verts|flood|play action|deep|post/i.test(concepts);
  let playType = 'pass';
  if (result === 'FG') playType = 'fg';
  else if (result === 'PUNT') playType = 'punt';
  else if (result === 'INT') playType = 'int';
  else if (result === 'FUM') playType = 'fum';
  else if (result === 'SAF') playType = 'safe';
  else if (isRunPlay) playType = 'run';
  else if (isDeep) playType = 'deep';

  let flashText = null, flashClass = '';
  if (result === 'TD') { flashText = 'TOUCHDOWN'; flashClass = 'sf-flash-td'; }
  else if (result === 'FG') { flashText = 'FIELD GOAL'; flashClass = 'sf-flash-fg'; }
  else if (result === 'INT') { flashText = 'INTERCEPTION'; flashClass = 'sf-flash-turn'; }
  else if (result === 'FUM') { flashText = 'FUMBLE'; flashClass = 'sf-flash-turn'; }
  else if (result === 'SAF') { flashText = 'SAFETY'; flashClass = 'sf-flash-safe'; }

  const ddText = !currentDrive ? 'KICKOFF' :
    result === 'TD' ? 'TOUCHDOWN' :
    result === 'FG' ? '4TH & GOAL' :
    result === 'INT' ? 'TURNOVER' :
    result === 'FUM' ? 'TURNOVER' :
    result === 'PUNT' ? '4TH DOWN' :
    result === 'SAF' ? 'BACKED UP' :
    result === 'TOD' ? 'TURNOVER ON DOWNS' :
    '1ST & 10';

  return (
    <div className="sf-wrap">
      {/* SVG field backdrop */}
      <SimFieldBackdrop teamL={team} teamR={opp} />

      {/* Animated action layer — key remounts on each drive for fresh animations */}
      <div className="sf-action" key={driveIndex}>
        {/* Line of scrimmage */}
        <div className="sf-los" style={{ left: `${losX}%` }} />

        {/* First down marker */}
        {currentDrive && result !== 'TD' && result !== 'FG' && (
          <div className="sf-fd" style={{ left: `${10 + Math.min(99, startLos + 10) * 0.8}%` }} />
        )}

        {/* Offensive players on LOS */}
        {[20, 22.5, 25, 27.5, 30].map((y, i) => (
          <div key={`ol${i}`} className="sf-dot sf-off sf-ol" style={{ left: `${losX}%`, top: `${y * 2}%`, animationDelay: `${i * 40}ms` }} />
        ))}

        {/* QB behind center */}
        <div className="sf-dot sf-off sf-qb" style={{ left: `${losX - dir * 4}%`, top: '50%' }}>
          <span className="sf-label">QB</span>
        </div>

        {/* RB */}
        {playType !== 'run' && (
          <div className="sf-dot sf-off sf-rb" style={{ left: `${losX - dir * 6}%`, top: '58%' }} />
        )}

        {/* Receivers */}
        <div className="sf-dot sf-off sf-wr sf-route-anim" style={{
          '--sx': `${losX}%`, '--sy': '16%',
          '--ex': `${losX + dir * 16}%`, '--ey': '12%',
        }} />
        <div className="sf-dot sf-off sf-wr sf-route-anim" style={{
          '--sx': `${losX}%`, '--sy': '84%',
          '--ex': `${losX + dir * 14}%`, '--ey': '88%',
        }} />
        <div className="sf-dot sf-off sf-slot sf-route-anim" style={{
          '--sx': `${losX - dir * 1}%`, '--sy': '32%',
          '--ex': `${losX + dir * 10}%`, '--ey': '36%',
        }} />

        {/* Primary mover — ball carrier */}
        <div className="sf-dot sf-off sf-mover sf-move-anim" style={{
          '--mx0': `${playType === 'run' ? losX - dir * 3 : losX}%`,
          '--my0': `${playType === 'run' ? 56 : 16}%`,
          '--mx1': `${endX}%`,
          '--my1': `${playType === 'run' ? 50 : 18}%`,
        }}>
          <div className="sf-mover-glow" />
        </div>

        {/* Defensive players */}
        {[21.5, 24, 26.5, 29].map((y, i) => (
          <div key={`dl${i}`} className="sf-dot sf-def sf-def-rush" style={{
            left: `${losX + dir * 1.5}%`, top: `${y * 2}%`,
            animationDelay: `${i * 50}ms`,
            '--tx': `${(endX - losX) * 0.3}%`,
          }} />
        ))}
        {[19, 25, 31].map((y, i) => (
          <div key={`lb${i}`} className="sf-dot sf-def sf-def-lb" style={{
            left: `${losX + dir * 5}%`, top: `${y * 2}%`,
            animationDelay: `${120 + i * 60}ms`,
            '--tx': `${(endX - losX) * 0.4}%`,
          }} />
        ))}
        {[12, 40].map((y, i) => (
          <div key={`cb${i}`} className="sf-dot sf-def sf-def-cb" style={{
            left: `${losX + dir * 2}%`, top: `${y * 2}%`,
            animationDelay: `${i * 40}ms`,
            '--tx': `${(endX - losX) * 0.35}%`,
          }} />
        ))}
        {/* Safeties deep */}
        {[16, 34].map((y, i) => (
          <div key={`s${i}`} className="sf-dot sf-def sf-def-s" style={{
            left: `${losX + dir * 12}%`, top: `${y * 2}%`,
            animationDelay: `${i * 50}ms`,
            '--tx': `${(endX - losX) * 0.25}%`,
          }} />
        ))}

        {/* Ball animation */}
        <div className={`sf-ball sf-ball-fly pt-${playType}`} style={{
          '--bx0': `${losX - dir * 4}%`,
          '--by0': '50%',
          '--bx1': `${endX}%`,
          '--by1': `${playType === 'run' ? 50 : 18}%`,
        }}>
          <div className="sf-ball-icon" />
        </div>

        {/* HUD overlay */}
        <div className="sf-hud">
          <span className="sf-hud-down">{ddText}</span>
          <span className="sf-hud-poss" style={{ background: offTeam.primary }}>
            {offTeam.abbr} BALL
          </span>
        </div>

        {/* Result flash */}
        {flashText && (
          <div className={`sf-flash ${flashClass}`}>
            <div className="sf-flash-text">{flashText}</div>
            {result === 'TD' && (
              <>
                <div className="sf-flash-sub">{offTeam.abbr} +7</div>
                <div className="sf-confetti">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} style={{
                      '--cx': `${(i * 137) % 100}%`,
                      '--cd': `${(i * 53) % 600}ms`,
                      '--cc': i % 3 === 0 ? 'var(--neon)' : i % 3 === 1 ? 'var(--hot)' : 'var(--chalk)',
                    }} />
                  ))}
                </div>
              </>
            )}
            {(result === 'INT' || result === 'FUM') && (
              <div className="sf-flash-sub">{defTeam.abbr} BALL</div>
            )}
            {result === 'FG' && (
              <div className="sf-flash-sub">{offTeam.abbr} +3</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SimFieldBackdrop = memo(function SimFieldBackdrop({ teamL, teamR }) {
  return (
    <svg className="sf-field-svg" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sfturf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0F2A18" />
          <stop offset="50%" stopColor="#15401F" />
          <stop offset="100%" stopColor="#0E2916" />
        </linearGradient>
        <pattern id="sfmow" width="6" height="50" patternUnits="userSpaceOnUse">
          <rect width="6" height="50" fill="url(#sfturf)" />
          <rect x="0" width="3" height="50" fill="rgba(255,255,255,0.025)" />
        </pattern>
        <radialGradient id="sfvig" cx="50%" cy="55%" r="70%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
        </radialGradient>
        <linearGradient id="sfezL" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={teamL.primary} stopOpacity="0.95" />
          <stop offset="100%" stopColor={teamL.primary} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="sfezR" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0%" stopColor={teamR.primary} stopOpacity="0.95" />
          <stop offset="100%" stopColor={teamR.primary} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="100" height="50" fill="url(#sfmow)" />
      <rect x="0" y="0" width="10" height="50" fill="url(#sfezL)" />
      <rect x="90" y="0" width="10" height="50" fill="url(#sfezR)" />

      <text x="5" y="26" textAnchor="middle" fontSize="2.3" fill="rgba(255,255,255,0.85)"
            fontFamily="var(--font-display)" letterSpacing="0.3" transform="rotate(-90 5 26)">
        {(teamL.name || '').toUpperCase()}
      </text>
      <text x="95" y="26" textAnchor="middle" fontSize="2.3" fill="rgba(255,255,255,0.85)"
            fontFamily="var(--font-display)" letterSpacing="0.3" transform="rotate(90 95 26)">
        {(teamR.name || '').toUpperCase()}
      </text>

      <line x1="10" y1="0" x2="10" y2="50" stroke="rgba(255,255,255,0.85)" strokeWidth="0.5" />
      <line x1="90" y1="0" x2="90" y2="50" stroke="rgba(255,255,255,0.85)" strokeWidth="0.5" />

      {Array.from({ length: 19 }).map((_, i) => {
        const yard = (i + 1) * 5;
        const x = 10 + yard * 0.8;
        const bold = yard % 10 === 0;
        return (
          <line key={yard} x1={x} y1="2" x2={x} y2="48"
                stroke={bold ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.20)'}
                strokeWidth={bold ? 0.22 : 0.14} />
        );
      })}
      <line x1="50" y1="0" x2="50" y2="50" stroke="rgba(255,255,255,0.75)" strokeWidth="0.32" />

      {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => {
        const x = 10 + (i + 1) * 8;
        return (
          <g key={i}>
            <text x={x} y="11" textAnchor="middle" fontSize="2.6" fill="rgba(255,255,255,0.78)"
                  fontFamily="var(--font-display)">{n}</text>
            <text x={x} y="42" textAnchor="middle" fontSize="2.6" fill="rgba(255,255,255,0.78)"
                  fontFamily="var(--font-display)" transform={`rotate(180 ${x} 41)`}>{n}</text>
          </g>
        );
      })}

      <line x1="0" y1="0.3" x2="100" y2="0.3" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
      <line x1="0" y1="49.7" x2="100" y2="49.7" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />

      <rect x="0" y="0" width="100" height="50" fill="url(#sfvig)" />
    </svg>
  );
});
