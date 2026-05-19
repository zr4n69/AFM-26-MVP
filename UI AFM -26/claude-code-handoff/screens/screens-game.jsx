// AFM-26 — Screens (part 2): Game Week (live + recap), Standings, Leaders

const { useState: uS2, useEffect: uE2, useRef: uR2 } = React;
const A2 = () => window.AFL;

// =================== GAME WEEK / SIM ===================
// Two modes: "preview" -> live ticker -> "recap"
function ScreenGameWeek() {
  const [mode, setMode] = uS2('preview');  // preview | live | recap
  const [drives, setDrives] = uS2([]);
  const [score, setScore] = uS2({ us: 0, them: 0 });
  const [quarter, setQ] = uS2(1);
  const [clock, setClock] = uS2('15:00');
  const [los, setLos] = uS2(25);
  const [poss, setPoss] = uS2('us'); // us | them
  const [keyPlays, setKey] = uS2([]);
  const [paused, setPaused] = uS2(false);

  const team = A2().userTeam;
  const opp = A2().byId('SD');

  // generate scripted drive sequence
  const SCRIPT = uR2(buildDriveScript()).current;

  uE2(() => {
    if (mode !== 'live' || paused) return;
    let i = drives.length;
    if (i >= SCRIPT.length) { setMode('recap'); return; }
    const t = setTimeout(() => {
      const d = SCRIPT[i];
      setDrives(prev => [...prev, d]);
      setScore(prev => ({ us: prev.us + d.usDelta, them: prev.them + d.themDelta }));
      setQ(d.q);
      setClock(d.clock);
      setLos(d.endLos);
      setPoss(d.nextPoss);
      if (d.keyPlay) setKey(prev => [d.keyPlay, ...prev].slice(0, 8));
    }, 900);
    return () => clearTimeout(t);
  }, [mode, drives.length, paused]);

  function startSim() {
    setMode('live');
    setDrives([]);
    setScore({ us: 0, them: 0 });
    setQ(1); setClock('15:00'); setLos(25); setPoss('us'); setKey([]);
  }

  function skipToEnd() {
    setDrives(SCRIPT);
    let totalUs = 0, totalThem = 0;
    SCRIPT.forEach(d => { totalUs += d.usDelta; totalThem += d.themDelta; });
    setScore({ us: totalUs, them: totalThem });
    setMode('recap');
  }

  if (mode === 'preview') {
    return <GamePreview team={team} opp={opp} onStart={startSim} />;
  }
  if (mode === 'live') {
    return <GameLive team={team} opp={opp} drives={drives} score={score} quarter={quarter} clock={clock} los={los} poss={poss} keyPlays={keyPlays} paused={paused} onPause={() => setPaused(p => !p)} onSkip={skipToEnd} />;
  }
  return <GameRecap team={team} opp={opp} drives={drives} score={score} onReplay={startSim} />;
}

function GamePreview({ team, opp, onStart }) {
  const advantages = [
    { side: 'OFF', label: 'Bryce Calloway vs SD secondary', us: true, note: 'WR corps fits West Coast vs match zone' },
    { side: 'OFF', label: 'OL pass protection', us: false, note: 'SD generates 3rd-most pressures' },
    { side: 'DEF', label: 'Spence vs LT Conklin', us: true, note: '11.5 sk leader vs questionable LT' },
    { side: 'DEF', label: 'Coverage on TE Otton', us: false, note: 'TE produces 64 yds/g' },
    { side: 'ST',  label: 'Field position', us: true, note: 'Net punt +6.4 advantage' },
  ];
  return (
    <>
      <Topbar crumb="Game Week / Week 9" title={`${team.name} vs ${opp.name}`} actions={
        <><button className="btn">Game Plan</button><button className="btn primary" onClick={onStart}>Start Sim →</button></>
      } />
      <div className="page">

        {/* Matchup banner */}
        <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            background: `linear-gradient(90deg, ${team.primary} 0%, ${team.primary} 35%, white 50%, ${opp.primary} 65%, ${opp.primary} 100%)`,
            color: 'white', padding: '28px 32px', alignItems: 'center', gap: 24,
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.85, textTransform: 'uppercase' }}>Home · {team.w}-{team.l}</div>
              <div style={{ font: '700 32px var(--font-display)', marginTop: 4 }}>{team.city}</div>
              <div style={{ font: '700 32px var(--font-display)', lineHeight: 1 }}>{team.name}</div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>OVR {team.ovr} · OFF {team.offRating} · DEF {team.defRating}</div>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--ink-2)' }}>
              <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', letterSpacing: '0.1em' }}>WEEK 9 · SUN 1:00</div>
              <div style={{ font: '700 56px var(--font-display)', color: 'var(--ink-1)', lineHeight: 1, margin: '6px 0' }}>VS</div>
              <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)' }}>SPREAD LV −3.5 · O/U 44.5</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', opacity: 0.85, textTransform: 'uppercase' }}>Away · {opp.w}-{opp.l}</div>
              <div style={{ font: '700 32px var(--font-display)', marginTop: 4 }}>{opp.city}</div>
              <div style={{ font: '700 32px var(--font-display)', lineHeight: 1 }}>{opp.name}</div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>OVR {opp.ovr} · OFF {opp.offRating} · DEF {opp.defRating}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-2-3">
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Your Strategy</h2><span className="right">Edit on Strategy →</span></div>
              <div className="card-b">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div><div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06 }}>Offense</div><div style={{ fontWeight: 700 }}>West Coast</div></div>
                  <div><div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06 }}>Defense</div><div style={{ fontWeight: 700 }}>4-3 Zone</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, columnGap: 12, fontSize: 13 }}>
                  <span>Tempo</span><span className="mono">50</span>
                  <span>Aggression</span><span className="mono">60</span>
                  <span>Run / Pass lean</span><span className="mono">45</span>
                  <span>Deep passing</span><span className="mono">50</span>
                  <span>Blitz rate</span><span className="mono">40</span>
                  <span>Coverage risk</span><span className="mono">35</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h2>Inactives</h2></div>
              <div className="card-b tight">
                {team.roster.filter(p => p.injStatus === 'O').slice(0, 4).map(p => (
                  <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar player={p} team={team} size={26} />
                    <div style={{ flex: 1 }}><strong>{p.name}</strong> <span className="muted">· {p.pos}</span></div>
                    <InjBadge status="O" />
                  </div>
                ))}
                {team.roster.filter(p => p.injStatus === 'O').length === 0 && <div style={{ padding: 16 }} className="muted">All starters available.</div>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h2>Matchup Edges</h2><span className="right">Pre-snap projections</span></div>
            <div className="card-b tight">
              <table className="tbl">
                <thead><tr><th>Side</th><th>Matchup</th><th>Edge</th><th>Note</th></tr></thead>
                <tbody>
                  {advantages.map((a, i) => (
                    <tr key={i}>
                      <td className="mono"><strong>{a.side}</strong></td>
                      <td>{a.label}</td>
                      <td><span className={`badge ${a.us ? 'win' : 'loss'}`}>{a.us ? team.abbr : opp.abbr}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{a.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GameLive({ team, opp, drives, score, quarter, clock, los, poss, keyPlays, paused, onPause, onSkip }) {
  return (
    <>
      <Topbar crumb="Game Week / Live" title="Live · Week 9" actions={
        <>
          <button className="btn" onClick={onPause}>{paused ? 'Resume' : 'Pause'}</button>
          <button className="btn" onClick={onSkip}>Skip to End</button>
        </>
      } />
      <div className="page">

        {/* Scoreboard */}
        <div className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ background: 'var(--ink-1)', color: 'white', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '20px 28px', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ColorBlock team={team} size={48} />
              <div>
                <div style={{ font: '700 20px var(--font-display)' }}>{team.abbr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{team.name}</div>
              </div>
              <div style={{ font: '700 64px var(--font-display)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{score.us}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 11px var(--font-mono)', letterSpacing: '0.12em', opacity: 0.6 }}>Q{quarter} · {clock}</div>
              <div style={{ display: 'inline-flex', gap: 4, marginTop: 8 }}>
                {[1,2,3,4].map(q => <div key={q} style={{ width: 8, height: 8, borderRadius: 99, background: q <= quarter ? 'var(--accent)' : 'rgba(255,255,255,0.18)' }} />)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>{poss === 'us' ? '◀ ' : ''}{poss === 'us' ? team.abbr : opp.abbr} ball · {poss === 'us' ? '' : '▶'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
              <div style={{ font: '700 64px var(--font-display)', marginRight: 'auto', fontVariantNumeric: 'tabular-nums' }}>{score.them}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ font: '700 20px var(--font-display)' }}>{opp.abbr}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{opp.name}</div>
              </div>
              <ColorBlock team={opp} size={48} />
            </div>
          </div>
          {/* field strip */}
          <div style={{ padding: 14 }}>
            <FieldDiagram losYard={los} possessionLeft={poss === 'us'} />
          </div>
        </div>

        <div className="grid grid-3-2">
          {/* Drive log */}
          <div className="card">
            <div className="card-h"><h2>Drive Log</h2><span className="right">{drives.length} drives</span></div>
            <div className="card-b tight" style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>#</th><th>Team</th><th>Q</th><th>Plays</th><th>Yds</th><th>Time</th><th>Result</th><th className="num">Score</th></tr></thead>
                <tbody>
                  {[...drives].reverse().map((d, i) => {
                    const isUs = d.team === 'us';
                    return (
                      <tr key={drives.length - i} style={{ animation: 'fadeIn 0.3s' }}>
                        <td className="mono">{drives.length - i}</td>
                        <td><ColorBlock team={isUs ? team : opp} size={14} /> <span className="mono" style={{ marginLeft: 6 }}>{isUs ? team.abbr : opp.abbr}</span></td>
                        <td className="mono">Q{d.q}</td>
                        <td className="num mono">{d.plays}</td>
                        <td className="num mono">{d.yards}</td>
                        <td className="mono">{d.time}</td>
                        <td><span className={`chip ${d.result === 'TD' ? 'pos' : 'outline'}`} style={{ fontSize: 11 }}>{d.result}</span></td>
                        <td className="num mono">{d.scoreUs}–{d.scoreThem}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key plays ticker */}
          <div className="card">
            <div className="card-h"><h2>Key Plays</h2><span className="right" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--neg)', animation: 'pulse 1.4s infinite' }} />LIVE</span></div>
            <div className="card-b tight">
              {keyPlays.length === 0 && <div style={{ padding: 16 }} className="muted">Game is starting…</div>}
              {keyPlays.map((kp, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', animation: 'fadeIn 0.3s' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span className="chip outline" style={{ fontSize: 10 }}>{kp.tag}</span>
                    <span className="muted" style={{ fontSize: 11 }}>Q{kp.q} · {kp.clock}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{kp.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </>
  );
}

function GameRecap({ team, opp, drives, score, onReplay }) {
  // build aggregated stats
  const usDrives = drives.filter(d => d.team === 'us');
  const themDrives = drives.filter(d => d.team === 'them');
  const totalsUs = aggregateStats(usDrives);
  const totalsThem = aggregateStats(themDrives);

  // top performers
  const topUs = [
    { name: 'Bryce Calloway', pos: 'QB', line: '24/34, 287 yds, 3 TD, 0 INT' },
    { name: 'Kendrick Pickett', pos: 'RB', line: '21 car, 104 yds, 1 TD · 4 rec, 32 yds' },
    { name: 'Stefon Curtis', pos: 'WR', line: '7 rec, 112 yds, 1 TD' },
    { name: 'Micah Spence', pos: 'EDGE', line: '6 tk · 2.5 sk · 1 FF' },
    { name: 'Devon Westbrook', pos: 'CB', line: '4 tk · 1 INT · 2 PD' },
  ];
  const topThem = [
    { name: 'J. Pearson', pos: 'QB', line: '21/35, 224 yds, 1 TD, 2 INT' },
    { name: 'A. Edmonds', pos: 'RB', line: '13 car, 64 yds' },
    { name: 'A. Sutton',  pos: 'WR', line: '5 rec, 78 yds' },
    { name: 'J. Ridley',  pos: 'EDGE', line: '5 tk · 1 sk' },
  ];

  return (
    <>
      <Topbar crumb="Game Week / Final" title={`Final · Week 9`} actions={
        <><button className="btn" onClick={onReplay}>Replay</button><button className="btn primary">Continue to Week 10 →</button></>
      } />
      <div className="page">

        {/* Final scoreboard */}
        <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '24px 32px', gap: 24, background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ColorBlock team={team} size={56} />
              <div>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08 }}>{team.city}</div>
                <div style={{ font: '700 26px var(--font-display)' }}>{team.name}</div>
              </div>
              <div style={{ font: '700 80px var(--font-display)', marginLeft: 'auto', color: score.us > score.them ? 'var(--ink-1)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>{score.us}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '700 11px var(--font-mono)', letterSpacing: '0.12em', color: 'var(--ink-4)' }}>FINAL</div>
              <div className="chip pos" style={{ marginTop: 8 }}>{score.us > score.them ? 'W' : 'L'} · {score.us > score.them ? `+${score.us - score.them}` : score.us - score.them}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
              <div style={{ font: '700 80px var(--font-display)', marginRight: 'auto', color: score.them > score.us ? 'var(--ink-1)' : 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>{score.them}</div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08 }}>{opp.city}</div>
                <div style={{ font: '700 26px var(--font-display)' }}>{opp.name}</div>
              </div>
              <ColorBlock team={opp} size={56} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid var(--line-soft)', padding: '12px 32px', gap: 12, fontSize: 13 }}>
            <div className="muted">Quarter</div>
            <div className="mono"><strong>Q1</strong></div><div className="mono"><strong>Q2</strong></div><div className="mono"><strong>Q3</strong></div><div className="mono"><strong>Q4</strong></div>
            <div className="mono" style={{ textAlign: 'right' }}><strong>T</strong></div><div></div>
            <div>{team.abbr}</div>
            <div className="mono">7</div><div className="mono">10</div><div className="mono">3</div><div className="mono">{score.us - 20}</div><div className="mono" style={{ textAlign: 'right' }}><strong>{score.us}</strong></div><div></div>
            <div>{opp.abbr}</div>
            <div className="mono">3</div><div className="mono">7</div><div className="mono">7</div><div className="mono">{score.them - 17}</div><div className="mono" style={{ textAlign: 'right' }}><strong>{score.them}</strong></div><div></div>
          </div>
        </div>

        <div className="grid grid-2">
          {/* Box score totals */}
          <div className="card">
            <div className="card-h"><h2>Team Stats</h2></div>
            <div className="card-b">
              <table className="tbl">
                <thead><tr><th></th><th className="num">{team.abbr}</th><th className="num">{opp.abbr}</th></tr></thead>
                <tbody>
                  {[
                    ['Total yards', totalsUs.yards, totalsThem.yards],
                    ['Pass yards', 287, 224],
                    ['Rush yards', 142, 86],
                    ['1st downs', 23, 17],
                    ['3rd down', '8/14 (57%)', '4/13 (31%)'],
                    ['Red zone', '3/4 (75%)', '1/3 (33%)'],
                    ['Sacks taken', 1, 4],
                    ['Turnovers', 0, 3],
                    ['Penalties', '5 / 42', '8 / 71'],
                    ['Time of poss.', '32:18', '27:42'],
                  ].map(([k, a, b]) => (
                    <tr key={k}><td>{k}</td><td className="num mono">{a}</td><td className="num mono">{b}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top performers */}
          <div className="card">
            <div className="card-h"><h2>Top Performers</h2></div>
            <div className="card-b tight">
              <div style={{ padding: '10px 16px', background: 'var(--bg-2)', fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600 }}>{team.city} {team.name}</div>
              {topUs.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', width: 32 }}>{p.pos}</span>
                  <strong style={{ flex: 1 }}>{p.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{p.line}</span>
                </div>
              ))}
              <div style={{ padding: '10px 16px', background: 'var(--bg-2)', fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600, marginTop: 4 }}>{opp.city} {opp.name}</div>
              {topThem.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', width: 32 }}>{p.pos}</span>
                  <strong style={{ flex: 1 }}>{p.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{p.line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drive summaries */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h2>Drive Chart</h2><span className="right">{drives.length} drives</span></div>
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th>#</th><th>Team</th><th>Q</th><th>Start</th><th className="num">Plays</th><th className="num">Yds</th><th>Time</th><th>Concept emphasis</th><th>Result</th><th className="num">Score</th></tr></thead>
              <tbody>
                {drives.map((d, i) => {
                  const isUs = d.team === 'us';
                  return (
                    <tr key={i}>
                      <td className="mono">{i + 1}</td>
                      <td><ColorBlock team={isUs ? team : opp} size={14} /> <span className="mono" style={{ marginLeft: 6 }}>{isUs ? team.abbr : opp.abbr}</span></td>
                      <td className="mono">Q{d.q}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{d.start}</td>
                      <td className="num mono">{d.plays}</td>
                      <td className="num mono">{d.yards}</td>
                      <td className="mono">{d.time}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{d.concepts}</td>
                      <td><span className={`chip ${d.result === 'TD' ? 'pos' : 'outline'}`} style={{ fontSize: 11 }}>{d.result}</span></td>
                      <td className="num mono">{d.scoreUs}–{d.scoreThem}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Injuries from game */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h2>Game Injuries</h2></div>
          <div className="card-b tight">
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line-soft)' }}>
              <span className="badge q">Q</span>
              <strong>Stefon Curtis</strong> <span className="muted">· WR · LV</span>
              <span style={{ flex: 1 }} />
              <span className="muted" style={{ fontSize: 12 }}>Hamstring tightness · re-evaluate Wed</span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge d">D</span>
              <strong>Liam Conklin</strong> <span className="muted">· LT · SD</span>
              <span style={{ flex: 1 }} />
              <span className="muted" style={{ fontSize: 12 }}>Ankle · 1-2 weeks</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function aggregateStats(drives) {
  return {
    yards: drives.reduce((s, d) => s + d.yards, 0),
    drives: drives.length,
  };
}

// Build a 24-drive script for the game
function buildDriveScript() {
  const out = [];
  let scoreUs = 0, scoreThem = 0;
  // ordering of drives + outcomes; us scores 27-24
  const seq = [
    { team: 'us',   q:1, plays: 9,  yards: 65, time: '4:32', start: 'Own 25', concepts: 'Inside zone · Mesh · Slants', result: 'TD',   pts: 7,  next: 'them' },
    { team: 'them', q:1, plays: 8,  yards: 41, time: '3:48', start: 'Own 22', concepts: 'Power run · Stick',         result: 'FG',   pts: 3,  next: 'us'   },
    { team: 'us',   q:1, plays: 4,  yards: 12, time: '1:55', start: 'Own 32', concepts: 'Outside zone',              result: 'PUNT', pts: 0,  next: 'them' },
    { team: 'them', q:2, plays: 11, yards: 72, time: '5:14', start: 'Own 18', concepts: 'Play action · Four verts',  result: 'TD',   pts: 7,  next: 'us'   },
    { team: 'us',   q:2, plays: 10, yards: 75, time: '4:42', start: 'Own 25', concepts: 'Mesh · Stick · Slants',     result: 'TD',   pts: 7,  next: 'them' },
    { team: 'them', q:2, plays: 5,  yards: -3, time: '2:08', start: 'Own 30', concepts: 'Power run',                 result: 'PUNT', pts: 0,  next: 'us'   },
    { team: 'us',   q:2, plays: 7,  yards: 38, time: '1:34', start: 'Own 38', concepts: 'Slants · Screen',           result: 'FG',   pts: 3,  next: 'them' },
    { team: 'them', q:3, plays: 6,  yards: 24, time: '3:01', start: 'Own 25', concepts: 'Inside zone',               result: 'PUNT', pts: 0,  next: 'us'   },
    { team: 'us',   q:3, plays: 9,  yards: 47, time: '4:18', start: 'Own 28', concepts: 'Mesh · RPO glance',         result: 'FG',   pts: 3,  next: 'them' },
    { team: 'them', q:3, plays: 8,  yards: 78, time: '4:11', start: 'Own 22', concepts: 'Four verts · Flood',        result: 'TD',   pts: 7,  next: 'us'   },
    { team: 'us',   q:3, plays: 3,  yards: 6,  time: '1:22', start: 'Own 25', concepts: 'Inside zone',               result: 'PUNT', pts: 0,  next: 'them' },
    { team: 'them', q:4, plays: 6,  yards: 18, time: '2:54', start: 'Own 35', concepts: 'Power run · Stick',         result: 'INT',  pts: 0,  next: 'us'   },
    { team: 'us',   q:4, plays: 5,  yards: 32, time: '2:08', start: 'Opp 47', concepts: 'Play action',               result: 'FG',   pts: 3,  next: 'them' },
    { team: 'them', q:4, plays: 9,  yards: 68, time: '4:12', start: 'Own 25', concepts: 'Four verts',                result: 'TD',   pts: 7,  next: 'us'   },
    { team: 'us',   q:4, plays: 12, yards: 78, time: '4:48', start: 'Own 22', concepts: 'Mesh · Slants · Screen',    result: 'TD',   pts: 7,  next: 'them' },
    { team: 'them', q:4, plays: 4,  yards: 12, time: '0:38', start: 'Own 25', concepts: 'Four verts',                result: 'INT',  pts: 0,  next: 'us'   },
  ];
  let endLos = 25;
  let clock = '15:00';
  seq.forEach((s, i) => {
    if (s.team === 'us') scoreUs += s.pts; else scoreThem += s.pts;
    endLos = s.team === 'us' ? Math.min(95, 25 + s.yards * 0.6) : Math.max(5, 75 - s.yards * 0.6);
    // step the clock (not perfectly accurate, but readable)
    clock = ['15:00','11:32','7:44','5:49','12:30','7:48','5:40','4:06','9:52','5:34','1:23','13:30','10:36','8:28','4:16','0:38'][i] || '0:00';
    let usDelta = s.team === 'us' ? s.pts : 0;
    let themDelta = s.team === 'them' ? s.pts : 0;

    let keyPlay = null;
    if (s.result === 'TD' && s.team === 'us') {
      keyPlay = { tag: 'TD', q: s.q, clock, text: `Calloway finds Curtis on a slant for ${s.yards >= 40 ? 38 : 14}-yd touchdown.` };
    } else if (s.result === 'TD' && s.team === 'them') {
      keyPlay = { tag: 'TD', q: s.q, clock, text: `Pearson hits Sutton on a deep flood for ${s.yards >= 60 ? 42 : 18}-yd score.` };
    } else if (s.result === 'INT') {
      keyPlay = { tag: 'TURNOVER', q: s.q, clock, text: `Westbrook jumps the route — INT, returns 14 yards.` };
    } else if (s.result === 'FG') {
      keyPlay = { tag: 'FG', q: s.q, clock, text: `${s.team === 'us' ? 'Engram' : 'Folk'} drills a ${30 + Math.floor(s.yards / 3)}-yard field goal.` };
    }

    out.push({
      ...s,
      clock,
      endLos,
      scoreUs, scoreThem,
      usDelta, themDelta,
      nextPoss: s.next,
      keyPlay,
    });
  });
  return out;
}

// =================== STANDINGS ===================
function ScreenStandings() {
  const teams = A2().TEAMS;
  const conferences = ['East', 'North', 'South', 'West'];
  const sched = A2().SCHEDULE_LV;
  const team = A2().userTeam;

  return (
    <>
      <Topbar crumb="Game Week / Standings" title="Standings" actions={
        <><button className="btn">Tiebreakers</button><button className="btn primary">Playoff Picture →</button></>
      } />
      <div className="page">

        <div className="grid grid-2" style={{ marginBottom: 18 }}>
          {conferences.map(c => {
            const list = teams.filter(t => t.conf === c).sort((a, b) => b.w - a.w);
            return (
              <div className="card" key={c}>
                <div className="card-h"><h2>{c} Conference</h2><span className="right">Top 3 advance · Best 6 overall in playoffs</span></div>
                <div className="card-b tight">
                  <table className="tbl">
                    <thead><tr><th></th><th>Team</th><th className="num">W</th><th className="num">L</th><th className="num">PCT</th><th className="num">PF</th><th className="num">PA</th><th className="num">DIFF</th><th>Streak</th></tr></thead>
                    <tbody>
                      {list.map((t, i) => (
                        <tr key={t.id} style={t.id === team.id ? { background: 'var(--bg-2)' } : {}}>
                          <td className="mono muted" style={{ width: 24 }}>{i + 1}</td>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ColorBlock team={t} size={18} /> <strong>{t.city} {t.name}</strong></div></td>
                          <td className="num mono">{t.w}</td>
                          <td className="num mono">{t.l}</td>
                          <td className="num mono">{t.pct.toFixed(3).slice(1)}</td>
                          <td className="num mono">{t.pf}</td>
                          <td className="num mono">{t.pa}</td>
                          <td className={`num mono ${t.diff > 0 ? 'up' : 'dn'}`}>{t.diff > 0 ? '+' : ''}{t.diff}</td>
                          <td className="mono"><span className={`chip ${t.id === 'CHI' || t.id === 'NYC' || t.id === 'LV' ? 'pos' : 'outline'}`} style={{ fontSize: 10 }}>{['W3','W2','W4','L1','L2','W1'][i]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playoff bracket */}
        <div className="section-h"><h2>Playoff Bracket Projection</h2><span className="sub">Seeds 1–2 receive first-round byes · Top 6 by record (tiebreakers: H2H, Conf, PF, Diff)</span></div>
        <PlayoffBracket />

        {/* User schedule */}
        <div className="section-h"><h2>Your Schedule</h2></div>
        <div className="card">
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th>Wk</th><th>Opponent</th><th>Loc</th><th>Result</th><th className="num">Score</th><th>Notes</th></tr></thead>
              <tbody>
                {sched.map(g => {
                  const o = A2().byId(g.opp);
                  return (
                    <tr key={g.wk} style={g.result === null ? { background: 'var(--bg-2)' } : {}}>
                      <td className="mono">W{g.wk}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ColorBlock team={o} size={18} /> <strong>{o.city} {o.name}</strong></div></td>
                      <td className="muted">{g.home ? 'Home' : 'Away'}</td>
                      <td>{g.result ? <span className={`badge ${g.result === 'W' ? 'win' : 'loss'}`}>{g.result}</span> : <span className="chip pos" style={{ fontSize: 11 }}>UPCOMING</span>}</td>
                      <td className="num mono">{g.result ? `${g.us}–${g.them}` : '—'}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{g.result === null ? 'This week · −3.5 favored' : ''}</td>
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

function PlayoffBracket() {
  const teams = A2().TEAMS;
  // Best 6 by record overall
  const seeds = [...teams].sort((a, b) => b.pct - a.pct || b.diff - a.diff).slice(0, 6);
  const T = i => seeds[i];

  const Box = ({ team, seed, score, won }) => team ? (
    <div style={{
      padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
      background: won === false ? 'var(--bg-2)' : 'var(--bg-1)',
      borderBottom: '1px solid var(--line-soft)',
      opacity: won === false ? 0.55 : 1,
      fontWeight: won === true ? 700 : 500,
    }}>
      <span className="mono" style={{ width: 18, fontSize: 11, color: 'var(--ink-4)' }}>{seed}</span>
      <ColorBlock team={team} size={16} />
      <span style={{ flex: 1, fontSize: 13 }}>{team.name}</span>
      {score != null && <span className="mono">{score}</span>}
    </div>
  ) : null;

  const card = { border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'white' };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36, alignItems: 'center' }}>
        {/* Round 1 */}
        <div>
          <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 10 }}>Wild-Card Round</div>
          <div style={card}><Box team={T(2)} seed="3" /><Box team={T(5)} seed="6" /></div>
          <div style={{ height: 24 }} />
          <div style={card}><Box team={T(3)} seed="4" /><Box team={T(4)} seed="5" /></div>
          <div style={{ marginTop: 24, font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.1 }}>Byes</div>
          <div style={card}><Box team={T(0)} seed="1" /><Box team={T(1)} seed="2" /></div>
        </div>
        {/* Semis */}
        <div>
          <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 10 }}>Conference Semis</div>
          <div style={card}><Box team={T(0)} seed="1" /><Box team={null} seed="" /></div>
          <div style={{ height: 24 }} />
          <div style={card}><Box team={T(1)} seed="2" /><Box team={null} seed="" /></div>
        </div>
        {/* Final */}
        <div>
          <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.1, marginBottom: 10 }}>AFL Championship</div>
          <div style={{ ...card, borderColor: 'var(--accent)', borderWidth: 2 }}><Box team={null} seed="" /><Box team={null} seed="" /></div>
          <div style={{ marginTop: 18, padding: 14, background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.1 }}>Champion</div>
            <div style={{ font: '700 16px var(--font-display)', marginTop: 4, color: 'var(--accent)' }}>TBD</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================== LEADERS ===================
function ScreenLeaders() {
  const groups = [
    { key: 'passYds', label: 'Passing Yards', unit: 'yds' },
    { key: 'rushYds', label: 'Rushing Yards', unit: 'yds' },
    { key: 'recYds',  label: 'Receiving Yards', unit: 'yds' },
    { key: 'sacks',   label: 'Sacks', unit: '' },
    { key: 'ints',    label: 'Interceptions', unit: '' },
    { key: 'tackles', label: 'Tackles', unit: '' },
  ];
  return (
    <>
      <Topbar crumb="Game Week / League Leaders" title="League Leaders" />
      <div className="page">
        <div className="grid grid-3" style={{ marginBottom: 18 }}>
          {groups.map(g => {
            const list = A2().LEADERS[g.key];
            const max = list[0].val;
            return (
              <div className="card" key={g.key}>
                <div className="card-h"><h2>{g.label}</h2><span className="right">Through Wk 8</span></div>
                <div className="card-b tight">
                  {list.map((l, i) => {
                    const t = A2().byId(l.team);
                    return (
                      <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="mono" style={{ width: 16, color: 'var(--ink-4)', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                          <ColorBlock team={t} size={16} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                            <div className="muted" style={{ fontSize: 11 }}>{l.pos} · {t.abbr}</div>
                          </div>
                          <strong className="mono">{l.val}{g.unit && ` ${g.unit}`}</strong>
                        </div>
                        <div className="bar" style={{ marginTop: 6 }}><span style={{ width: `${(l.val / max) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ScreenGameWeek, ScreenStandings, ScreenLeaders });
