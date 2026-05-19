// AFM-26 — Screens (part 1): Dashboard, Roster, Depth Chart, Strategy, Contracts
// All screens read from window.AFL

const A = () => window.AFL;

// =================== DASHBOARD ===================
function ScreenDashboard({ onNav }) {
  const team = A().userTeam;
  const sched = A().SCHEDULE_LV;
  const next = sched.find(g => g.result === null);
  const opp = A().byId(next.opp);
  const last3 = sched.filter(g => g.result).slice(-3);
  const standings = A().TEAMS.filter(t => t.conf === 'West').sort((a, b) => b.w - a.w);
  const injuries = team.roster.filter(p => p.injStatus).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
  const stars = [...team.roster].sort((a, b) => b.ovr - a.ovr).slice(0, 5);

  return (
    <>
      <Topbar crumb="Team / Las Vegas Vipers" title="Dashboard" actions={
        <>
          <button className="btn">Sim Week</button>
          <button className="btn primary" onClick={() => onNav('gameweek')}>Play Week 9 →</button>
        </>
      }/>
      <div className="page">

        {/* Top stats row */}
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Record</div>
            <div className="value">{team.w}–{team.l}</div>
            <div className="delta pos">1st in West Conf · 2 game lead</div>
          </div>
          <div className="stat-tile">
            <div className="label">Team Rating</div>
            <div className="value">{team.ovr}</div>
            <div className="delta">OFF {team.offRating} · DEF {team.defRating}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Cap Space</div>
            <div className="value">{formatM(team.capSpace)}</div>
            <div className="delta">{formatM(team.payroll)} payroll · {formatM(team.cap)} cap</div>
          </div>
          <div className="stat-tile">
            <div className="label">Prestige</div>
            <div className="value" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {team.prestige.toFixed(2)}
              <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>★</span>
            </div>
            <div className="delta"><Stars n={Math.round(team.prestige)} /> · cap +{((team.prestige - 1) * 12.5).toFixed(1)}M</div>
          </div>
        </div>

        {/* Two column main */}
        <div className="grid grid-3-2">
          <div>
            {/* Next game */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h">
                <h2>Next Game · Week 9</h2>
                <span className="right">Sunday · 1:00 PM · Home</span>
              </div>
              <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center' }}>
                {/* Us */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <ColorBlock team={team} size={56} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ font: '700 18px var(--font-display)', lineHeight: 1.15 }}>{team.city} {team.name}</div>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.2 }}>{team.w}–{team.l} · OVR {team.ovr}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', font: '700 20px var(--font-display)', color: 'var(--ink-4)' }}>VS</div>
                {/* Them */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div style={{ font: '700 18px var(--font-display)', lineHeight: 1.15 }}>{opp.city} {opp.name}</div>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.2 }}>{opp.w}–{opp.l} · OVR {opp.ovr}</div>
                  </div>
                  <ColorBlock team={opp} size={56} />
                </div>
              </div>
              <div className="card-b" style={{ borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 18, fontSize: 12 }}>
                <div><span className="muted">Spread</span> <strong className="mono">{team.name} −3.5</strong></div>
                <div><span className="muted">Total</span> <strong className="mono">44.5</strong></div>
                <div><span className="muted">Their offense</span> <strong>vs your D</strong> · slight edge {team.name}</div>
                <div style={{ marginLeft: 'auto' }}><button className="btn">Game Plan</button> <button className="btn primary" onClick={() => onNav('gameweek')}>Play →</button></div>
              </div>
            </div>

            {/* Recent results */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Recent Results</h2><span className="right" onClick={() => onNav('standings')} style={{ cursor: 'pointer' }}>Schedule →</span></div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th>Wk</th><th>Opponent</th><th>Result</th><th className="num">Score</th><th>Top Performer</th></tr></thead>
                  <tbody>
                    {last3.reverse().map(g => {
                      const o = A().byId(g.opp);
                      return (
                        <tr key={g.wk}>
                          <td className="mono">W{g.wk}</td>
                          <td>{g.home ? 'vs' : '@'} <TeamBlock team={o} size={18} /></td>
                          <td><span className={`badge ${g.result === 'W' ? 'win' : 'loss'}`}>{g.result}</span></td>
                          <td className="num mono">{g.us}–{g.them}</td>
                          <td className="muted" style={{ fontSize: 12 }}>{['Bryce Calloway 287 yds, 3 TD','Kendrick Pickett 124 yds, 2 TD','Micah Spence 2.5 sacks, FF'][last3.indexOf(g)]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stars */}
            <div className="card">
              <div className="card-h"><h2>Team Leaders</h2><span className="right" onClick={() => onNav('roster')} style={{ cursor: 'pointer' }}>Roster →</span></div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th>Player</th><th>Pos</th><th className="num">OVR</th><th>Status</th><th>This Year</th><th className="num">Cap</th></tr></thead>
                  <tbody>
                    {stars.map(p => (
                      <tr key={p.id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar player={p} team={team} size={32} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            {p.traits[0] && <div className="muted" style={{ fontSize: 11 }}>{p.traits[0]}</div>}
                          </div>
                        </div></td>
                        <td className="mono">{p.pos}</td>
                        <td className="num"><OvrPill ovr={p.ovr} /></td>
                        <td><InjBadge status={p.injStatus} /></td>
                        <td className="muted" style={{ fontSize: 12 }}>{leaderLine(p)}</td>
                        <td className="num mono">{formatM(p.cap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div>
            {/* Standings glance */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>West Conference</h2><span className="right" onClick={() => onNav('standings')} style={{ cursor: 'pointer' }}>Standings →</span></div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th>Team</th><th className="num">W-L</th><th className="num">PF</th><th className="num">PA</th><th className="num">Diff</th></tr></thead>
                  <tbody>
                    {standings.map((t, i) => (
                      <tr key={t.id} style={t.id === team.id ? { background: 'var(--bg-2)' } : {}}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', width: 12 }}>{i + 1}</span>
                          <ColorBlock team={t} size={16} /> <span style={{ fontWeight: t.id === team.id ? 700 : 500 }}>{t.name}</span>
                        </div></td>
                        <td className="num mono">{t.w}-{t.l}</td>
                        <td className="num mono">{t.pf}</td>
                        <td className="num mono">{t.pa}</td>
                        <td className={`num mono ${t.diff > 0 ? 'up' : 'dn'}`}>{t.diff > 0 ? '+' : ''}{t.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Injuries */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Injury Report</h2><span className="right">{injuries.length} players</span></div>
              <div className="card-b tight">
                {injuries.length === 0 && <div style={{ padding: 14 }} className="muted">No injuries.</div>}
                {injuries.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                    <Avatar player={p} team={team} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name} <span className="muted" style={{ fontWeight: 400 }}>· {p.pos}</span></div>
                      <div className="muted" style={{ fontSize: 11 }}>{['Hamstring','Ankle','Concussion protocol','Shoulder','Knee — week-to-week','Foot'][injuries.indexOf(p) % 6]}</div>
                    </div>
                    <InjBadge status={p.injStatus} />
                  </div>
                ))}
              </div>
            </div>

            {/* News */}
            <div className="card">
              <div className="card-h"><h2>Around the League</h2></div>
              <div className="card-b tight">
                {A().NEWS.map((n, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span className="chip outline" style={{ fontSize: 10, padding: '1px 6px' }}>{n.type.replace('-', ' ')}</span>
                      <span className="muted" style={{ fontSize: 11 }}>Wk {n.wk}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function leaderLine(p) {
  // fake season line that fits the position
  if (p.pos === 'QB') return `2,289 yds · 18 TD · 6 INT`;
  if (p.pos === 'RB') return `921 yds · 6 TD · 4.7 ypc`;
  if (p.pos === 'WR' || p.pos === 'TE') return `54 rec · 921 yds · 7 TD`;
  if (p.pos === 'EDGE' || p.pos === 'DT') return `11.5 sk · 14 TFL · 2 FF`;
  if (p.pos === 'LB') return `69 tk · 4 TFL · 2 sk · 1 INT`;
  if (p.pos === 'CB' || p.pos === 'S') return `41 tk · 4 INT · 9 PD`;
  if (p.pos === 'K' || p.pos === 'P') return `18/19 FG · 4/4 50+`;
  return '—';
}

// =================== ROSTER ===================
function ScreenRoster({ onSelect }) {
  const team = A().userTeam;
  const [filter, setFilter] = useState('All');
  const [sortKey, setSortKey] = useState('ovr');
  const filters = ['All', 'Offense', 'Defense', 'Special Teams', 'Injured'];
  const offPos = ['QB','RB','WR','TE','LT','LG','C','RG','RT'];
  const defPos = ['EDGE','DT','LB','CB','S'];
  const stPos = ['K','P','LS'];

  let roster = [...team.roster];
  if (filter === 'Offense') roster = roster.filter(p => offPos.includes(p.pos));
  if (filter === 'Defense') roster = roster.filter(p => defPos.includes(p.pos));
  if (filter === 'Special Teams') roster = roster.filter(p => stPos.includes(p.pos));
  if (filter === 'Injured') roster = roster.filter(p => p.injStatus);

  roster.sort((a, b) => {
    if (sortKey === 'ovr') return b.ovr - a.ovr;
    if (sortKey === 'age') return a.age - b.age;
    if (sortKey === 'cap') return b.cap - a.cap;
    if (sortKey === 'pos') return a.pos.localeCompare(b.pos);
    return 0;
  });

  return (
    <>
      <Topbar crumb="Team / Las Vegas Vipers" title="Roster" actions={
        <>
          <button className="btn">Position Changes</button>
          <button className="btn">Release Player</button>
          <button className="btn primary">Sign Free Agent</button>
        </>
      } />
      <div className="page">
        {/* Summary */}
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile"><div className="label">Roster Size</div><div className="value">{team.roster.length} <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/55</span></div><div className="delta">All position minimums met</div></div>
          <div className="stat-tile"><div className="label">Avg Age</div><div className="value">{(team.roster.reduce((s, p) => s + p.age, 0) / team.roster.length).toFixed(1)}</div><div className="delta">Veteran-leaning</div></div>
          <div className="stat-tile"><div className="label">Top OVR</div><div className="value">{Math.max(...team.roster.map(p => p.ovr))}</div><div className="delta">{team.roster.find(p => p.ovr === Math.max(...team.roster.map(x => x.ovr))).name}</div></div>
          <div className="stat-tile"><div className="label">Cap Hit</div><div className="value">{formatM(team.payroll)}</div><div className="delta pos">{formatM(team.capSpace)} space</div></div>
        </div>

        {/* Filter bar */}
        <div className="card">
          <div className="card-h" style={{ gap: 16 }}>
            <div className="tabs" style={{ border: 'none', margin: 0 }}>
              {filters.map(f => (
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
              <thead><tr>
                <th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">OVR</th><th>Pot</th>
                <th>Status</th><th>Fatigue</th><th>Traits</th>
                <th className="num">Yrs</th><th className="num">Cap</th><th />
              </tr></thead>
              <tbody>
                {roster.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onSelect && onSelect(p)}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar player={p} team={team} size={30} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{p.depth === 0 ? 'Starter' : p.depth === 1 ? 'Backup' : 'Depth'}</div>
                      </div>
                    </div></td>
                    <td className="mono"><strong>{p.pos}</strong></td>
                    <td className="num">{p.age}</td>
                    <td className="num"><OvrPill ovr={p.ovr} /></td>
                    <td><Stars n={p.potential} /></td>
                    <td><InjBadge status={p.injStatus} /></td>
                    <td><FatigueBar value={p.fatigue} /></td>
                    <td className="muted" style={{ fontSize: 11 }}>{p.traits.join(' · ') || '—'}</td>
                    <td className="num mono">{p.years}</td>
                    <td className="num mono">{formatM(p.cap)}</td>
                    <td><span className="muted">›</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== DEPTH CHART ===================
function ScreenDepth() {
  const team = A().userTeam;
  const groups = [
    { side: 'Offense', positions: ['QB','RB','WR','TE','LT','LG','C','RG','RT'] },
    { side: 'Defense', positions: ['EDGE','DT','LB','CB','S'] },
    { side: 'Special', positions: ['K','P','LS'] },
  ];
  return (
    <>
      <Topbar crumb="Team / Las Vegas Vipers" title="Depth Chart" actions={
        <><button className="btn">Reset to Auto</button><button className="btn primary">Save Changes</button></>
      } />
      <div className="page">
        {groups.map(g => (
          <div key={g.side} style={{ marginBottom: 22 }}>
            <div className="section-h"><h2>{g.side}</h2><span className="sub">Drag to reorder · Players grayed when injured</span></div>
            <div className="card">
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th style={{ width: 60 }}>Pos</th><th>Starter</th><th>Backup</th><th>3rd</th><th>4th</th><th>5th</th></tr></thead>
                  <tbody>
                    {g.positions.map(pos => {
                      const slots = team.roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr);
                      return (
                        <tr key={pos}>
                          <td className="mono"><strong>{pos}</strong></td>
                          {[0,1,2,3,4].map(i => {
                            const p = slots[i];
                            if (!p) return <td key={i} className="muted">—</td>;
                            return (
                              <td key={i} style={{ opacity: p.injStatus === 'O' ? 0.5 : 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <OvrPill ovr={p.ovr} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                                    <div className="muted" style={{ fontSize: 10 }}>
                                      {p.age}yo · <Stars n={p.potential} /> {p.injStatus && <InjBadge status={p.injStatus} />}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =================== STRATEGY ===================
function ScreenStrategy() {
  const [off, setOff] = useState('West Coast');
  const [def, setDef] = useState('4-3 Zone');
  const [tendencies, setTen] = useState({
    tempo: 50, aggression: 60, runPass: 45, deepPass: 50, blitz: 40, coverageRisk: 35,
  });
  const setT = (k, v) => setTen({ ...tendencies, [k]: v });

  const offSystems = [
    { name: 'West Coast',     desc: 'Efficient short passing, timing routes, YAC, low volatility.' },
    { name: 'Power Run',      desc: 'Inside runs, gap schemes, clock control, physical identity.' },
    { name: 'Spread RPO',     desc: 'Spacing, option looks, QB mobility, faster tempo.' },
    { name: 'Vertical Air Raid', desc: 'Deep passing, explosives, higher turnover/sack risk.' },
    { name: 'Balanced Pro',   desc: 'Flexible mix, lower extremes, easier roster fit.' },
  ];
  const defSystems = [
    { name: '4-3 Zone',           desc: 'Balanced front, zone coverage, stable vs run/pass.' },
    { name: '3-4 Pressure',       desc: 'Blitz variety, sacks, negatives, higher coverage risk.' },
    { name: 'Nickel Match',       desc: 'Pass D, coverage flex, lighter box.' },
    { name: 'Man Blitz',          desc: 'Aggressive pressure, INTs/sacks, vulnerable to explosives.' },
    { name: 'Bend But Do Not Break', desc: 'Limits explosives, allows yards, strong red-zone D.' },
  ];

  const slider = (key, label, leftLabel, rightLabel) => (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        <span className="mono muted">{tendencies[key]}</span>
      </div>
      <input type="range" min="0" max="100" value={tendencies[key]} className="slider" onChange={e => setT(key, +e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--ink-4)' }}>
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
    </div>
  );

  return (
    <>
      <Topbar crumb="Team / Las Vegas Vipers" title="Strategy" actions={
        <><button className="btn">Reset</button><button className="btn primary">Apply</button></>
      } />
      <div className="page">

        {/* Off systems */}
        <div className="section-h"><h2>Offensive System</h2><span className="sub">Concept weights and play frequencies follow your choice.</span></div>
        <div className="system-grid" style={{ marginBottom: 22 }}>
          {offSystems.map(s => (
            <div key={s.name} className={`system-card ${off === s.name ? 'selected' : ''}`} onClick={() => setOff(s.name)}>
              <div className="sys-name">{s.name}</div>
              <div className="sys-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Def systems */}
        <div className="section-h"><h2>Defensive System</h2><span className="sub">Front, coverage shell, and pressure tendencies.</span></div>
        <div className="system-grid" style={{ marginBottom: 22 }}>
          {defSystems.map(s => (
            <div key={s.name} className={`system-card ${def === s.name ? 'selected' : ''}`} onClick={() => setDef(s.name)}>
              <div className="sys-name">{s.name}</div>
              <div className="sys-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-h"><h2>Tendencies</h2></div>
            <div className="card-b">
              {slider('tempo', 'Tempo', 'Slow / Clock', 'Fast / No-huddle')}
              {slider('aggression', 'Aggression', 'Conservative', 'Boom or bust')}
              {slider('runPass', 'Run / Pass Lean', 'Run-heavy', 'Pass-heavy')}
              {slider('deepPass', 'Deep Passing', 'Short / underneath', 'Vertical shots')}
              {slider('blitz', 'Blitz Rate', 'Drop 7+', 'Heavy pressure')}
              {slider('coverageRisk', 'Coverage Risk', 'Safe / cushion', 'Aggressive / jump routes')}
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Concept Library</h2><span className="right">Weighted by system + tendencies</span></div>
              <div className="card-b">
                <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 6 }}>Offense</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {[
                    ['Inside zone', 22],['Outside zone', 14],['Power run', 8],['Counter', 6],['RPO glance', 10],
                    ['Play action', 9],['Mesh', 7],['Stick', 6],['Slants', 5],['Four verticals', 4],
                    ['Flood', 3],['Screen', 4],['Draw', 1],['QB option', 1],
                  ].map(([n, w]) => (
                    <span key={n} className="chip outline" style={{ fontSize: 11 }}>
                      {n} <span className="mono muted" style={{ marginLeft: 4 }}>{w}%</span>
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 6 }}>Defense</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    ['Cover 2', 18],['Cover 3', 22],['Match zone', 16],['Cover 4', 8],['Man', 12],
                    ['Fire zone blitz', 6],['Edge blitz', 5],['Double A-gap', 3],['Sim pressure', 4],['Run blitz', 3],['Spy', 2],['Prevent', 1],
                  ].map(([n, w]) => (
                    <span key={n} className="chip outline" style={{ fontSize: 11 }}>
                      {n} <span className="mono muted" style={{ marginLeft: 4 }}>{w}%</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h2>Scheme Fit</h2></div>
              <div className="card-b">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 10, columnGap: 12, fontSize: 13 }}>
                  <div>QB1 fit ({off})</div><div className="mono" style={{ textAlign: 'right' }}>87 / 100 <span className="up">●</span></div>
                  <div>OL fit (Power Run elements)</div><div className="mono" style={{ textAlign: 'right' }}>74 / 100 <span style={{ color: 'var(--warn)' }}>●</span></div>
                  <div>WR corps fit</div><div className="mono" style={{ textAlign: 'right' }}>91 / 100 <span className="up">●</span></div>
                  <div>EDGE fit ({def})</div><div className="mono" style={{ textAlign: 'right' }}>82 / 100 <span className="up">●</span></div>
                  <div>Secondary fit</div><div className="mono" style={{ textAlign: 'right' }}>68 / 100 <span style={{ color: 'var(--warn)' }}>●</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== CONTRACTS / CAP ===================
function ScreenContracts() {
  const team = A().userTeam;
  const sorted = [...team.roster].sort((a, b) => b.cap - a.cap);
  const top10 = sorted.slice(0, 10);
  const eligible = team.roster.filter(p => p.years <= 2 && p.ovr >= 75).sort((a, b) => b.ovr - a.ovr).slice(0, 6);

  // build group cap distribution
  const groupCap = {};
  team.roster.forEach(p => {
    const g = p.group;
    groupCap[g] = (groupCap[g] || 0) + p.cap;
  });
  const totalCap = Object.values(groupCap).reduce((a, b) => a + b, 0);

  return (
    <>
      <Topbar crumb="Team / Las Vegas Vipers" title="Contracts & Cap" actions={
        <><button className="btn">Project Next Year</button><button className="btn primary">Negotiate Extension</button></>
      } />
      <div className="page">
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile"><div className="label">Salary Cap</div><div className="value">{formatM(team.cap)}</div><div className="delta"><Stars n={Math.round(team.prestige)} /> · {team.prestige.toFixed(2)} prestige</div></div>
          <div className="stat-tile"><div className="label">Active Cap Hit</div><div className="value">{formatM(team.payroll)}</div><div className="delta">{((team.payroll / team.cap) * 100).toFixed(1)}% of cap used</div></div>
          <div className="stat-tile"><div className="label">Cap Space</div><div className="value" style={{ color: team.capSpace > 0 ? 'var(--pos)' : 'var(--neg)' }}>{formatM(team.capSpace)}</div><div className="delta">After 55-man payroll</div></div>
          <div className="stat-tile"><div className="label">Dead Money</div><div className="value">$2.4M</div><div className="delta">From P. Lawson release</div></div>
        </div>

        <div className="grid grid-3-2">
          <div className="card">
            <div className="card-h"><h2>Top Cap Hits</h2><span className="right">{top10.length} of {team.roster.length}</span></div>
            <div className="card-b tight">
              <table className="tbl">
                <thead><tr><th>Player</th><th>Pos</th><th>Age</th><th className="num">OVR</th><th className="num">Cap</th><th className="num">Salary</th><th className="num">Yrs</th><th className="num">Gtd</th><th>Bonus</th></tr></thead>
                <tbody>
                  {top10.map(p => (
                    <tr key={p.id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar player={p} team={team} size={26} /><strong>{p.name}</strong></div></td>
                      <td className="mono">{p.pos}</td>
                      <td>{p.age}</td>
                      <td className="num"><OvrPill ovr={p.ovr} /></td>
                      <td className="num mono">{formatM(p.cap)}</td>
                      <td className="num mono">{formatM(p.salary)}</td>
                      <td className="num mono">{p.years}</td>
                      <td className="num mono">{formatM(p.guaranteed)}</td>
                      <td className="muted" style={{ fontSize: 11 }}>{['Reach playoffs','Top defense','—','Win division','Make Pro Bowl','—','—','Reach playoffs','—','—'][top10.indexOf(p)]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Cap Allocation</h2></div>
              <div className="card-b">
                {Object.entries(groupCap).sort((a, b) => b[1] - a[1]).map(([g, v]) => (
                  <div key={g} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{g}</span><span className="mono">{formatM(v)} <span className="muted">({((v / totalCap) * 100).toFixed(0)}%)</span></span>
                    </div>
                    <div className="bar"><span style={{ width: `${(v / totalCap) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h2>Extension-Eligible</h2><span className="right">≤2 yrs left, OVR 75+</span></div>
              <div className="card-b tight">
                {eligible.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                    <Avatar player={p} team={team} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{p.pos} · {p.years}y left · {formatM(p.cap)}/yr</div>
                    </div>
                    <OvrPill ovr={p.ovr} />
                    <button className="btn">Extend</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ScreenDashboard, ScreenRoster, ScreenDepth, ScreenStrategy, ScreenContracts, leaderLine });
