// AFM-26 — Screens (part 3): Scouting, Draft, Free Agency, Trades, Training, Awards, Hall of Fame

const A3 = () => window.AFL;
const { useState: uS3 } = React;

// =================== SCOUTING ===================
function ScreenScouting() {
  const [budget, setBudget] = uS3(40);
  const [groups, setGroups] = uS3({
    'QB': 100, 'RB': 0, 'WR': 60, 'OL': 20, 'EDGE': 80, 'DT': 0, 'LB': 0, 'CB': 40, 'S': 0,
  });
  const total = Object.values(groups).reduce((s, v) => s + v, 0);

  const positionGroups = [
    { id: 'QB',   label: 'Quarterbacks',   note: 'Need: long-term QB2 / future QB1' },
    { id: 'RB',   label: 'Running Backs',  note: 'Need: change-of-pace back' },
    { id: 'WR',   label: 'Wide Receivers', note: 'Need: outside X-receiver' },
    { id: 'OL',   label: 'Offensive Line', note: 'Need: developmental tackle' },
    { id: 'EDGE', label: 'Edge Rushers',   note: 'Strength: complement to Spence' },
    { id: 'DT',   label: 'Defensive Tackles', note: '' },
    { id: 'LB',   label: 'Linebackers',    note: '' },
    { id: 'CB',   label: 'Cornerbacks',    note: 'Need: outside CB' },
    { id: 'S',    label: 'Safeties',       note: '' },
  ];

  return (
    <>
      <Topbar crumb="Front Office / Scouting" title="Scouting" actions={
        <><button className="btn">Reset</button><button className="btn primary">Apply Allocation →</button></>
      } />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile"><div className="label">Scouting Pts</div><div className="value">{budget}</div><div className="delta">+10 earned this week</div></div>
          <div className="stat-tile"><div className="label">Pts allocated</div><div className="value">{Math.min(total, 100)}<span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/100</span></div><div className="delta">{Math.max(0, 100 - total)} unspent</div></div>
          <div className="stat-tile"><div className="label">Class Size</div><div className="value">160</div><div className="delta">5 rounds · 80 drafted · 80 UDFA pool</div></div>
          <div className="stat-tile"><div className="label">Your Picks</div><div className="value">5</div><div className="delta">R1 #6, R2 #6, R3 #6, R4 #6, R5 #6</div></div>
        </div>

        <div className="grid grid-2-3">
          <div className="card">
            <div className="card-h"><h2>Allocate Scouting</h2><span className="right">Spend points by position group</span></div>
            <div className="card-b">
              {positionGroups.map(pg => (
                <div key={pg.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <strong>{pg.label}</strong>
                      <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>{pg.note}</span>
                    </div>
                    <span className="mono">{groups[pg.id]} pts</span>
                  </div>
                  <input type="range" min="0" max="100" step="20" value={groups[pg.id]} className="slider"
                    onChange={e => setGroups({ ...groups, [pg.id]: +e.target.value })} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                    <span>None</span><span>Light</span><span>Standard</span><span>Heavy</span><span>Saturated</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h2>Draft Class — Top 10 of 160</h2><span className="right">Scouted reveals exact ratings & traits</span></div>
            <div className="card-b tight">
              <table className="tbl">
                <thead><tr><th className="num">Rk</th><th>Prospect</th><th>Pos</th><th>Age</th><th>College</th><th>Proj</th><th>OVR</th><th>Pot</th><th>Status</th></tr></thead>
                <tbody>
                  {A3().DRAFT_CLASS.map(p => (
                    <tr key={p.rk}>
                      <td className="num mono">{p.rk}</td>
                      <td><strong>{p.name}</strong></td>
                      <td className="mono">{p.pos}</td>
                      <td>{p.age}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{p.college}</td>
                      <td className="mono">{p.proj}</td>
                      <td className="mono">{p.ovr}</td>
                      <td>{p.scouted ? <Stars n={p.stars} /> : <span className="muted">— ★</span>}</td>
                      <td>{p.scouted ? <span className="chip pos" style={{ fontSize: 10 }}>Scouted</span> : <span className="chip outline" style={{ fontSize: 10 }}>Hidden</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h2>What scouting reveals</h2></div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>Visible without scouting</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)' }}>
                <li>Name, position, age, college</li>
                <li>Rating range (e.g. 80–86)</li>
                <li>Combine results</li>
                <li>Expected draft slot</li>
              </ul>
            </div>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>Revealed by scouting (per group)</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-2)' }}>
                <li>Exact OVR, detailed attributes</li>
                <li>Hidden traits (positive and negative)</li>
                <li>Player potential (1–5 stars)</li>
                <li>Combine ranking, full scheme fit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== DRAFT ===================
function ScreenDraft() {
  const team = A3().userTeam;
  const teams = A3().TEAMS;
  const draftOrder = [...teams].sort((a, b) => a.w - b.w || a.diff - b.diff);
  const userIdx = draftOrder.findIndex(t => t.id === team.id);

  const rookieScale = [
    { pick: 1, salary: 25.0 }, { pick: 5, salary: 18.5 }, { pick: 10, salary: 12.0 },
    { pick: 16, salary: 8.0 }, { pick: 32, salary: 5.0 }, { pick: 48, salary: 3.5 },
    { pick: 64, salary: 2.5 }, { pick: 80, salary: 1.5 },
  ];

  return (
    <>
      <Topbar crumb="Front Office / Draft" title="2027 AFL Draft" actions={
        <><button className="btn">Big Board</button><button className="btn primary">Run Mock Draft</button></>
      } />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile"><div className="label">Round</div><div className="value">1 <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/5</span></div><div className="delta">160 talents · 80 drafted</div></div>
          <div className="stat-tile"><div className="label">Your Pick</div><div className="value">R1 #{userIdx + 1}</div><div className="delta">{['On the clock soon','Picks in {t}'][0]}</div></div>
          <div className="stat-tile"><div className="label">Elite Talents</div><div className="value">8</div><div className="delta">Min 3, max 16 per class</div></div>
          <div className="stat-tile"><div className="label">Rookie Pool</div><div className="value">$32.5M</div><div className="delta">Across 5 picks</div></div>
        </div>

        <div className="grid grid-3-2">
          <div className="card">
            <div className="card-h"><h2>Round 1 Order</h2><span className="right">Worst record picks first</span></div>
            <div className="card-b tight">
              <table className="tbl">
                <thead><tr><th className="num">Pick</th><th>Team</th><th className="num">Record</th><th>Need</th><th className="num">Slot $</th></tr></thead>
                <tbody>
                  {draftOrder.map((t, i) => (
                    <tr key={t.id} style={t.id === team.id ? { background: 'var(--bg-2)', fontWeight: 600 } : {}}>
                      <td className="num mono">{i + 1}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ColorBlock team={t} size={16} /> {t.city} {t.name}</div></td>
                      <td className="num mono">{t.w}-{t.l}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{['QB','EDGE','WR','LT','CB','LB','S','OL','DT','TE','EDGE','WR','C','CB','RB','EDGE'][i]}</td>
                      <td className="num mono">${(25 - i * 0.95).toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Rookie Contract Scale</h2></div>
              <div className="card-b">
                {rookieScale.map(rs => (
                  <div key={rs.pick} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
                    <span className="mono">Pick #{rs.pick}</span>
                    <span><span className="muted">starts at</span> <strong className="mono">${rs.salary}M</strong>/yr</span>
                  </div>
                ))}
                <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>R5 #16 minimum: $1.5M · Length follows 1–7 year contract rules.</div>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h2>Draft Logic</h2></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <div style={{ marginBottom: 10 }}>Teams weigh:</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)' }}>
                  <li>Best player available</li>
                  <li>Roster need</li>
                  <li>Scheme / playstyle synergy</li>
                  <li>Scouting confidence</li>
                  <li>Combine + college production</li>
                </ul>
                <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>CPU teams have ~75% of class scouted with bias toward needs.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== FREE AGENCY ===================
function ScreenFA() {
  const team = A3().userTeam;
  const FA = A3().FREE_AGENTS;
  const [filter, setFilter] = uS3('All');

  return (
    <>
      <Topbar crumb="Front Office / Free Agency" title="Free Agency" actions={
        <><button className="btn">Watchlist</button><button className="btn primary">Open Negotiation</button></>
      } />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile"><div className="label">Cap Space</div><div className="value">{formatM(team.capSpace)}</div><div className="delta">Available to spend</div></div>
          <div className="stat-tile"><div className="label">Roster Spots</div><div className="value">{55 - team.roster.length}<span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/55</span></div><div className="delta">Active limit · No practice squad</div></div>
          <div className="stat-tile"><div className="label">Free Agents</div><div className="value">142</div><div className="delta">In current pool</div></div>
          <div className="stat-tile"><div className="label">Position Needs</div><div className="value">3</div><div className="delta">CB, WR, OL depth</div></div>
        </div>

        <div className="card">
          <div className="card-h">
            <div className="tabs" style={{ border: 'none', margin: 0 }}>
              {['All', 'Offense', 'Defense', 'ST', 'Watchlist'].map(f => (
                <div key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ borderBottom: 'none', paddingBottom: 8 }}>{f}</div>
              ))}
            </div>
          </div>
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th>Player</th><th>Pos</th><th className="num">Age</th><th className="num">OVR</th><th>Last Team</th><th className="num">Asking</th><th className="num">Yrs Wanted</th><th>Note</th><th></th></tr></thead>
              <tbody>
                {FA.map(p => (
                  <tr key={p.name}>
                    <td><strong>{p.name}</strong></td>
                    <td className="mono"><strong>{p.pos}</strong></td>
                    <td className="num">{p.age}</td>
                    <td className="num"><OvrPill ovr={p.ovr} /></td>
                    <td className="muted" style={{ fontSize: 12 }}>{['DET','PHI','MIN','MIA','HOU','PHI','BOS','ATL','NYC','SAC'][FA.indexOf(p)]}</td>
                    <td className="num mono">{formatM(p.ask)}/yr</td>
                    <td className="num mono">{p.yrs}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{[
                      'Coming off 8-sack year', 'Veteran leadership', 'Slot CB skillset', 'Hands of stone trait',
                      'Run-stuffing LB', 'Block-first TE', 'Fragile trait', 'Ball Hawk', 'Iron Prime', 'Backup role',
                    ][FA.indexOf(p)]}</td>
                    <td><button className="btn">Offer →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="card-h"><h2>How Negotiations Work</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li>Offer salary, years, and guaranteed money</li>
                <li>Optionally attach contract bonuses tied to expectations (championship, playoffs, division, top offense/defense, stat thresholds, awards)</li>
                <li>Player accepts, counters, or walks based on market value, cap fit, role, and competing offers</li>
                <li>Released players, expired-contract players, and undrafted rookies populate the pool</li>
              </ol>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>In-Season vs Offseason</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <p><strong>Now (Week 9):</strong> short-term needs only — injury replacements, depth fixes. Most quality free agents will wait.</p>
              <p><strong>Offseason wave:</strong> expired contracts processed, teams release players to clear cap, large pool of available talent including former starters.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== TRADES ===================
function ScreenTrades() {
  const team = A3().userTeam;

  return (
    <>
      <Topbar crumb="Front Office / Trade Center" title="Trade Center" actions={
        <><button className="btn">My Proposals</button><button className="btn primary">New Trade</button></>
      } />
      <div className="page">

        {/* Trade window status */}
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--neg)', borderWidth: 1, background: '#FFF5F5' }}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--neg)' }} />
            <div style={{ flex: 1 }}>
              <strong>Trade window is closed.</strong>
              <span className="muted" style={{ marginLeft: 8 }}>Trades are allowed during the offseason and during regular-season Weeks 1–4. Resumes in offseason.</span>
            </div>
            <button className="btn">Mock a trade →</button>
          </div>
        </div>

        <div className="grid grid-2-3">
          <div className="card">
            <div className="card-h"><h2>Build a Trade</h2><span className="right">Mock mode</span></div>
            <div className="card-b">
              <div className="grid grid-2" style={{ gap: 16 }}>
                {/* Us */}
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>You give</div>
                  <div style={{ border: '1px dashed var(--line)', borderRadius: 6, padding: 12, minHeight: 220 }}>
                    <TradeChip name="WR Cooper Whitfield" detail="Age 28 · OVR 79 · 2y/$10.4M" />
                    <TradeChip name="2027 R3 Pick" detail="Projected #38" />
                    <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--ink-4)', fontSize: 12 }}>+ add player or pick</div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Cap impact this year</span>
                    <strong className="mono up">+{formatM(5.2)}</strong>
                  </div>
                </div>
                {/* Them */}
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>You get from <span style={{ color: 'var(--ink-2)' }}>CLE Foundry</span></div>
                  <div style={{ border: '1px dashed var(--line)', borderRadius: 6, padding: 12, minHeight: 220 }}>
                    <TradeChip name="LB Bobby Pickens" detail="Age 31 · OVR 82 · 1y/$8.0M" highlight />
                    <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--ink-4)', fontSize: 12 }}>+ add player or pick</div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Cap impact this year</span>
                    <strong className="mono dn">−{formatM(2.8)}</strong>
                  </div>
                </div>
              </div>

              <hr className="sep" />

              <div className="grid grid-3" style={{ gap: 14 }}>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08 }}>Trade Value</div>
                  <div style={{ font: '700 22px var(--font-display)', marginTop: 2 }}>184 ↔ 196</div>
                  <div className="up" style={{ fontSize: 12 }}>+12 in CLE's favor</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08 }}>CPU Likelihood</div>
                  <div style={{ font: '700 22px var(--font-display)', marginTop: 2 }}>Likely</div>
                  <div className="muted" style={{ fontSize: 12 }}>CLE rebuilding · seeks picks</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08 }}>Action</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <button className="btn">Cancel</button>
                    <button className="btn primary" disabled>Window closed</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>Trade Window</h2></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><span className="chip outline">Offseason</span> <span className="muted">Open</span></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><span className="chip outline">Wks 1–4</span> <span className="muted">Open</span></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}><span className="chip" style={{ background: '#FCD9D9', color: '#7C1A1A' }}>Wks 5–10</span> <strong>Closed (now)</strong></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="chip outline">Playoffs</span> <span className="muted">Closed</span></div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h"><h2>CPU Urgency Triggers</h2></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Missing required-position starter</li>
                  <li>Scheme-critical player gap</li>
                  <li>Backup behind injury-prone star</li>
                  <li>Need to reduce cap deficit</li>
                  <li>Contender adding production</li>
                  <li>Rebuilder collecting picks / youth</li>
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-h"><h2>Recent League Trades</h2></div>
              <div className="card-b tight">
                {[
                  { from: 'MIN', to: 'NO', deal: 'WR D. Sermon for 2027 R4' },
                  { from: 'CLE', to: 'BOS', deal: 'CB E. Lawson for R5 + R6' },
                  { from: 'SAC', to: 'PHI', deal: 'EDGE T. Pollard for OL B. Caldwell' },
                ].map((t, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ColorBlock team={A3().byId(t.from)} size={14} /> <span className="mono">{t.from}</span>
                      <span style={{ color: 'var(--ink-4)' }}>→</span>
                      <ColorBlock team={A3().byId(t.to)} size={14} /> <span className="mono">{t.to}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>{t.deal}</div>
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
function TradeChip({ name, detail, highlight }) {
  return (
    <div style={{
      padding: '10px 12px', marginBottom: 8,
      background: highlight ? 'var(--accent-soft)' : 'var(--bg-2)',
      border: '1px solid ' + (highlight ? 'var(--accent)' : 'var(--line)'),
      borderRadius: 4, fontSize: 13,
      display: 'flex', justifyContent: 'space-between',
    }}>
      <strong>{name}</strong>
      <span className="muted" style={{ fontSize: 12 }}>{detail}</span>
    </div>
  );
}

// =================== TRAINING ===================
function ScreenTraining() {
  const team = A3().userTeam;
  const focus = team.roster.filter(p => p.potential >= 3 && p.age <= 27).sort((a, b) => b.potential - a.potential).slice(0, 8);
  const [picked, setPicked] = uS3([focus[0]?.id, focus[1]?.id, focus[3]?.id]);
  const [intensity, setIntensity] = uS3({ [focus[0]?.id]: 'Standard', [focus[1]?.id]: 'Aggressive', [focus[3]?.id]: 'Light' });

  function toggle(id) {
    if (picked.includes(id)) setPicked(picked.filter(p => p !== id));
    else if (picked.length < 5) setPicked([...picked, id]);
  }

  return (
    <>
      <Topbar crumb="Team / Training" title="Training" actions={
        <><button className="btn">View History</button><button className="btn primary">Run Session</button></>
      } />
      <div className="page">

        {/* Training mode */}
        <div className="grid grid-3" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="card-h"><h2>Current Window</h2></div>
            <div className="card-b">
              <div className="chip pos" style={{ marginBottom: 8 }}>Regular-Season Training · Window 3 of 3</div>
              <div style={{ font: '700 16px var(--font-display)', marginBottom: 4 }}>Available after Week 9</div>
              <div className="muted" style={{ fontSize: 12 }}>5 focused players · smaller gains than camp · fatigue-aware</div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>Camp Schedule</h2></div>
            <div className="card-b">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Training Camp</span><span className="muted">3 days · postseason</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>In-season W3</span><span className="muted">Used ✓</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>In-season W6</span><span className="muted">Used ✓</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>In-season W9</span><strong>Now</strong></div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>Intensity Effects</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Light</span><span className="muted">Inj 1–3% · Gain low</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Standard</span><span className="muted">Inj 3–6% · Gain mid</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Aggressive</span><span className="muted">Inj 6–10% · Gain high</span></div>
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Modified by age, fatigue, durability, and history.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2>Focus Training — choose up to 5</h2><span className="right">{picked.length}/5 selected</span></div>
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th></th><th>Player</th><th>Pos</th><th>Age</th><th className="num">OVR</th><th>Pot</th><th>Headroom</th><th>Intensity</th><th>Inj Risk</th><th>Expected Gain</th></tr></thead>
              <tbody>
                {focus.map(p => {
                  const checked = picked.includes(p.id);
                  const room = p.ceiling - p.ovr;
                  const ints = intensity[p.id] || 'Standard';
                  const risk = ints === 'Light' ? '2%' : ints === 'Standard' ? '5%' : '8%';
                  const gain = ints === 'Light' ? '+0–1' : ints === 'Standard' ? '+1–2' : '+1–3';
                  return (
                    <tr key={p.id} style={checked ? { background: 'var(--bg-2)' } : {}}>
                      <td><input type="checkbox" checked={checked} onChange={() => toggle(p.id)} /></td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar player={p} team={team} size={26} /><strong>{p.name}</strong></div></td>
                      <td className="mono">{p.pos}</td>
                      <td>{p.age}</td>
                      <td className="num"><OvrPill ovr={p.ovr} /></td>
                      <td><Stars n={p.potential} /></td>
                      <td className="mono">+{room}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {['Light','Standard','Aggressive'].map(it => (
                            <span key={it} className={`chip ${ints === it ? 'pos' : 'outline'}`} style={{ fontSize: 10, padding: '2px 8px', cursor: 'pointer' }}
                              onClick={() => setIntensity({ ...intensity, [p.id]: it })}>{it}</span>
                          ))}
                        </div>
                      </td>
                      <td className="mono">{risk}</td>
                      <td className="mono">{gain}</td>
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
              <div><strong>4–5★ potential</strong>: up to <span className="mono">+3</span> in training camp</div>
              <div><strong>1–3★ potential</strong>: up to <span className="mono">+2</span> in training camp</div>
              <div className="muted">Smaller gains in regular-season windows · age-based decline still applies (31+ = -1/yr, 35+ = -2.5/yr)</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== AWARDS ===================
function ScreenAwards() {
  const T = id => A3().byId(id);
  const allPro1Off = [
    { pos: 'QB',  name: 'Aaron Whitfield', team: 'NYC', stat: '4,012 yds · 38 TD · 9 INT' },
    { pos: 'RB',  name: 'Najee Walker',    team: 'CHI', stat: '1,422 yds · 14 TD · 4.9 ypc' },
    { pos: 'WR',  name: 'Davante Wallace', team: 'NYC', stat: '92 rec · 1,388 yds · 11 TD' },
    { pos: 'WR',  name: 'Stefon Curtis',   team: 'LV',  stat: '78 rec · 1,201 yds · 9 TD' },
    { pos: 'TE',  name: 'Travis Bracey',   team: 'BOS', stat: '64 rec · 821 yds · 8 TD' },
    { pos: 'LT',  name: 'Penei Vaughn',    team: 'NYC', stat: '0 sacks allowed · 96 PB' },
    { pos: 'LG',  name: 'Quenton Sanders', team: 'CHI', stat: '94 RB · Pro Bowl repeat' },
    { pos: 'C',   name: 'Frank Linsley',   team: 'BOS', stat: '92 RB · 95 PB' },
    { pos: 'RG',  name: 'Vita Holcomb',    team: 'LV',  stat: '93 RB · 92 PB' },
    { pos: 'RT',  name: 'Tristan Akins',   team: 'MIA', stat: '91 PB · 1 sk allowed' },
  ];
  const allPro1Def = [
    { pos: 'EDGE', name: 'Micah Spence',  team: 'LV',  stat: '18.5 sk · 24 TFL · 4 FF' },
    { pos: 'EDGE', name: 'TJ Givens',     team: 'CHI', stat: '15.5 sk · 19 TFL · 3 FF' },
    { pos: 'DT',   name: 'Quinnen Bracey',team: 'BOS', stat: '11 sk · 22 TFL · 1 FF' },
    { pos: 'DT',   name: 'Jeffery Bryant',team: 'NYC', stat: '8 sk · 18 TFL · 41 tk' },
    { pos: 'LB',   name: 'Roquan Ferrell',team: 'BOS', stat: '124 tk · 6 sk · 4 INT' },
    { pos: 'LB',   name: 'Fred Beasley',  team: 'HOU', stat: '142 tk · 9 TFL · 2 INT' },
    { pos: 'CB',   name: 'Patrick Murray',team: 'NYC', stat: '8 INT · 22 PD · 2 TD' },
    { pos: 'CB',   name: 'Devon Westbrook',team:'LV',  stat: '6 INT · 18 PD' },
    { pos: 'S',    name: 'Jalen Brockman',team: 'CHI', stat: '7 INT · 14 PD · 88 tk' },
    { pos: 'S',    name: 'Quincy Faulk',  team: 'PHI', stat: '6 INT · 12 PD · 78 tk' },
  ];

  const majors = [
    { award: 'Season MVP',                  winner: 'Aaron Whitfield', team: 'NYC', pos: 'QB',   note: '4,012 / 38 TD / 9 INT · 7-1 entering Wk 9' },
    { award: 'Offensive Player of the Year',winner: 'Najee Walker',    team: 'CHI', pos: 'RB',   note: '1,422 yds · 14 TD · 4.9 ypc' },
    { award: 'Defensive Player of the Year',winner: 'Micah Spence',    team: 'LV',  pos: 'EDGE', note: '18.5 sk · 24 TFL · 4 FF · Clutch trait' },
    { award: 'Off. Rookie of the Year',     winner: 'Otis Penny',      team: 'PHI', pos: 'RB',   note: '1,041 yds · 8 TD as a 5★ R1 pick' },
    { award: 'Def. Rookie of the Year',     winner: 'Tariq Riggins',   team: 'CLE', pos: 'EDGE', note: '9 sk · 14 TFL — leads all rookies' },
  ];

  return (
    <>
      <Topbar crumb="League / Awards" title="Season Awards" actions={
        <><button className="btn">Export to PDF</button><button className="btn primary">Award Watch</button></>
      } />
      <div className="page">

        {/* Major awards */}
        <div className="section-h"><h2>Major Awards</h2><span className="sub">Calculated at end of regular season · before championship</span></div>
        <div className="grid grid-3" style={{ marginBottom: 22 }}>
          {majors.map(m => {
            const team = T(m.team);
            return (
              <div className="card" key={m.award}>
                <div className="card-h"><h2>{m.award}</h2></div>
                <div className="card-b" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 4, display: 'grid', placeItems: 'center',
                    background: `linear-gradient(135deg, ${team.primary} 0%, ${team.primary} 50%, ${team.secondary} 50%, ${team.secondary} 100%)`,
                    color: 'white', font: '700 18px var(--font-display)', flex: '0 0 auto',
                  }}>{m.winner.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: '700 17px var(--font-display)' }}>{m.winner}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{m.pos} · {team.city} {team.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>{m.note}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* All-Pro */}
        <div className="grid grid-2">
          <div className="card">
            <div className="card-h"><h2>First Team All-Pro · Offense</h2></div>
            <div className="card-b tight">
              <table className="tbl">
                <tbody>
                  {allPro1Off.map(p => (
                    <tr key={p.pos + p.name}>
                      <td className="mono" style={{ width: 50, fontWeight: 700 }}>{p.pos}</td>
                      <td><strong>{p.name}</strong></td>
                      <td><ColorBlock team={T(p.team)} size={16} /></td>
                      <td className="muted" style={{ fontSize: 12 }}>{p.stat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>First Team All-Pro · Defense</h2></div>
            <div className="card-b tight">
              <table className="tbl">
                <tbody>
                  {allPro1Def.map(p => (
                    <tr key={p.pos + p.name}>
                      <td className="mono" style={{ width: 50, fontWeight: 700 }}>{p.pos}</td>
                      <td><strong>{p.name}</strong></td>
                      <td><ColorBlock team={T(p.team)} size={16} /></td>
                      <td className="muted" style={{ fontSize: 12 }}>{p.stat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Eval criteria */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h2>How Awards Are Decided</h2></div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, fontSize: 13 }}>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Production</div>
              Stats · Efficiency · Snap volume · Clutch performance
            </div>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Context</div>
              Team success · Positional value · Scheme importance · Role difficulty
            </div>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Influence</div>
              Pressure created · Double-teams drawn · Turnovers forced/prevented
            </div>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Value Impact</div>
              Awards raise contract & trade value · Diminishing returns when stacked · Recent &gt; old
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =================== HALL OF FAME ===================
function ScreenHoF() {
  const ballot = [
    { name: 'Marcus Linwood',  pos: 'QB',   yrs: 14, awards: 'MVP×2, OPOY, 6× All-Pro 1st', champs: 2, votes: 9, in: true,  team: 'NYC' },
    { name: 'Roy Mosley',      pos: 'EDGE', yrs: 12, awards: 'DPOY×2, 5× All-Pro 1st', champs: 1, votes: 7, in: true,  team: 'CHI' },
    { name: 'Patrick Tomlinson', pos: 'WR', yrs: 13, awards: 'OPOY, 4× All-Pro 1st', champs: 1, votes: 5, in: true,  team: 'BOS' },
    { name: 'Devin Sayers',    pos: 'CB',   yrs: 11, awards: 'DPOY, 4× All-Pro 1st', champs: 0, votes: 6, in: true,  team: 'PHI' },
    { name: 'Anthony Faulk',   pos: 'LB',   yrs: 12, awards: '3× All-Pro 1st, 2× 2nd', champs: 1, votes: 4, in: true,  team: 'LV' },
    { name: 'Trey Conklin',    pos: 'LT',   yrs: 13, awards: '3× All-Pro 1st', champs: 1, votes: 3, in: false, team: 'BOS' },
    { name: 'Jermaine Worthy', pos: 'S',    yrs: 11, awards: '2× All-Pro 1st, ROY', champs: 0, votes: 2, in: false, team: 'MIA' },
    { name: 'Cooper Pearson',  pos: 'K',    yrs: 17, awards: 'All-Pro 1st, longevity', champs: 1, votes: 2, in: false, team: 'NYC' },
  ];

  return (
    <>
      <Topbar crumb="League / Hall of Fame" title="Hall of Fame" actions={
        <><button className="btn">Cast My Votes</button><button className="btn primary">View Inductees</button></>
      } />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile"><div className="label">Class of '26</div><div className="value">5</div><div className="delta">Players inducted (≥4 votes)</div></div>
          <div className="stat-tile"><div className="label">Total Votes</div><div className="value">32</div><div className="delta">2 votes per team × 16 teams</div></div>
          <div className="stat-tile"><div className="label">Threshold</div><div className="value">4 votes</div><div className="delta">From retiring pool only</div></div>
          <div className="stat-tile"><div className="label">Your Votes</div><div className="value">2 <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/2</span></div><div className="delta">Linwood, Worthy</div></div>
        </div>

        <div className="card">
          <div className="card-h"><h2>2026 Ballot</h2><span className="right">Retiring players only</span></div>
          <div className="card-b tight">
            <table className="tbl">
              <thead><tr><th>Player</th><th>Pos</th><th className="num">Yrs</th><th>Career Awards</th><th className="num">Champ</th><th className="num">Votes</th><th>Outcome</th></tr></thead>
              <tbody>
                {ballot.map(b => {
                  const t = A3().byId(b.team);
                  return (
                    <tr key={b.name} style={b.in ? { background: 'var(--bg-2)' } : {}}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 4, display: 'grid', placeItems: 'center',
                          background: `linear-gradient(135deg, ${t.primary} 0%, ${t.primary} 50%, ${t.secondary} 50%, ${t.secondary} 100%)`,
                          color: 'white', font: '700 12px var(--font-display)' }}>{b.name.split(' ').map(s => s[0]).slice(0, 2).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{b.name}</div>
                          <div className="muted" style={{ fontSize: 11 }}>Last team: {t.city} {t.name}</div>
                        </div>
                      </div></td>
                      <td className="mono"><strong>{b.pos}</strong></td>
                      <td className="num">{b.yrs}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{b.awards}</td>
                      <td className="num mono">{b.champs}</td>
                      <td className="num mono"><strong>{b.votes}</strong></td>
                      <td>{b.in ? <span className="chip pos">Inducted</span> : <span className="chip outline">Falls short</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="card-h"><h2>Voting Considerations</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Career awards · Career statistics</li>
                <li>Championships · Playoff success</li>
                <li>Peak seasons · Longevity</li>
                <li>Positional value · Franchise importance</li>
                <li>Notable traits or storylines</li>
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2>Induction Effects</h2></div>
            <div className="card-b" style={{ fontSize: 13 }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Player legacy records</li>
                <li>Franchise history & prestige presentation</li>
                <li>Long-term league storytelling</li>
                <li><span className="muted">Does not directly change current roster strength.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ScreenScouting, ScreenDraft, ScreenFA, ScreenTrades, ScreenTraining, ScreenAwards, ScreenHoF });
