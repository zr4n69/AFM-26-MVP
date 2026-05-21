import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, Avatar, OvrPill, Stars, formatM } from '../components/Chrome.jsx';
import { estimateMarketSalary } from '@engine/simulation/free-agency.js';

export function ScreenContracts({ onNav }) {
  const { userTeam, actions, phase } = useLeague();
  const team = userTeam;
  const [extTarget, setExtTarget] = useState(null);
  const [extSalary, setExtSalary] = useState(3);
  const [extYears, setExtYears] = useState(3);
  const [extResult, setExtResult] = useState(null);
  if (!team) return null;

  const sorted = [...team.roster].sort((a, b) => b.cap - a.cap);
  const top10 = sorted.slice(0, 10);
  const eligible = team.roster
    .filter(p => p.years <= 2 && p.ovr >= 75)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 8);

  const groupCap = {};
  team.roster.forEach(p => {
    groupCap[p.group] = (groupCap[p.group] || 0) + p.cap;
  });
  const totalCap = Object.values(groupCap).reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      <Topbar
        crumb={`Team / ${team.city} ${team.name}`}
        title="Contracts & Cap"
        actions={
          <button className="btn" onClick={() => onNav('roster')}>Full Roster</button>
        }
      />
      <div className="page">
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Salary Cap</div>
            <div className="value">{formatM(team.cap)}</div>
            <div className="delta"><Stars n={Math.round(team.prestige)} /> · {team.prestige.toFixed(2)} prestige</div>
          </div>
          <div className="stat-tile">
            <div className="label">Active Cap Hit</div>
            <div className="value">{formatM(team.payroll)}</div>
            <div className="delta">{team.cap > 0 ? ((team.payroll / team.cap) * 100).toFixed(1) : '—'}% of cap used</div>
          </div>
          <div className="stat-tile">
            <div className="label">Cap Space</div>
            <div className="value" style={{ color: team.capSpace > 0 ? 'var(--pos)' : 'var(--neg)' }}>{formatM(team.capSpace)}</div>
            <div className="delta">After {team.roster.length}-man payroll</div>
          </div>
          <div className="stat-tile">
            <div className="label">Roster Size</div>
            <div className="value">{team.roster.length} <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/55</span></div>
          </div>
        </div>

        <div className="grid grid-3-2">
          <div className="card">
            <div className="card-h">
              <h2>Top Cap Hits</h2>
              <span className="right">{top10.length} of {team.roster.length}</span>
            </div>
            <div className="card-b tight">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Player</th><th>Pos</th><th>Age</th><th className="num">OVR</th>
                    <th className="num">Cap</th><th className="num">Salary</th>
                    <th className="num">Yrs</th><th className="num">Gtd</th><th>Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar player={p} team={team} size={26} />
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td className="mono">{p.pos}</td>
                      <td>{p.age}</td>
                      <td className="num"><OvrPill ovr={p.ovr} /></td>
                      <td className="num mono">{formatM(p.cap)}</td>
                      <td className="num mono">{formatM(p.salary)}</td>
                      <td className="num mono">{p.years}</td>
                      <td className="num mono">{formatM(p.guaranteed)}</td>
                      <td>
                        {p.bonusType ? (
                          <span className={`chip ${p.bonusPaid ? 'pos' : 'outline'}`} style={{ fontSize: 10 }}>
                            {p.bonusPaid ? 'Paid' : p.bonusType}
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
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
                      <span>{g}</span>
                      <span className="mono">{formatM(v)} <span className="muted">({((v / totalCap) * 100).toFixed(0)}%)</span></span>
                    </div>
                    <div className="bar"><span style={{ width: `${(v / totalCap) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-h">
                <h2>Extension-Eligible</h2>
                <span className="right">≤2 yrs left, OVR 75+</span>
              </div>
              <div className="card-b tight">
                {eligible.length === 0 && <div style={{ padding: 14 }} className="muted">No eligible players.</div>}
                {eligible.map(p => {
                  const market = estimateMarketSalary(p._engine) / 1_000_000;
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                      <Avatar player={p} team={team} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{p.pos} · {p.years}y left · {formatM(p.cap)}/yr · est. {formatM(market)}/yr</div>
                      </div>
                      <OvrPill ovr={p.ovr} />
                      <button className="btn" style={{ padding: '4px 12px', fontSize: 11 }}
                        onClick={() => { setExtTarget(p); setExtSalary(Math.round(market * 10) / 10); setExtYears(3); setExtResult(null); }}>
                        Extend
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-h"><h2>Contract Info</h2></div>
              <div className="card-b" style={{ fontSize: 13 }}>
                <p><strong>Extensions:</strong> Players with ≤2 years remaining and OVR 75+ are eligible for contract extensions any time.</p>
                <p><strong>Renegotiation:</strong> During the offseason, you can renegotiate any player's contract via the Roster screen.</p>
                <p className="muted" style={{ fontSize: 11 }}>Cap = Salary + prorated guaranteed money + bonus. Released players incur dead money from remaining guarantees.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Extension result banner */}
        {extResult && (
          <div className="card" style={{ marginTop: 14, borderColor: extResult.rejected ? 'var(--neg)' : undefined }}>
            <div className="card-b" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {extResult.rejected ? (
                <>
                  <span className="chip" style={{ fontSize: 11, background: 'var(--neg)', color: 'white' }}>REJECTED</span>
                  <span><strong>{extResult.name}</strong> — {extResult.reason}</span>
                </>
              ) : (
                <>
                  <span className="chip pos" style={{ fontSize: 11 }}>ACCEPTED</span>
                  <span><strong>{extResult.name}</strong> — {formatM(extResult.salary)}/yr for {extResult.years} years</span>
                </>
              )}
              <span style={{ flex: 1 }} />
              <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setExtResult(null)}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Extension modal */}
        {extTarget && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(14,17,22,0.45)', display: 'grid', placeItems: 'center' }}
            onClick={() => setExtTarget(null)}>
            <div className="card" style={{ width: 420, animation: 'fadeIn .15s ease-out' }} onClick={e => e.stopPropagation()}>
              <div className="card-h"><h2>Extend {extTarget.name}</h2></div>
              <div className="card-b">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 13 }}>
                  <span className="mono">{extTarget.pos}</span>
                  <span>Age {extTarget.age}</span>
                  <OvrPill ovr={extTarget.ovr} />
                  <span className="muted">Current: {formatM(extTarget.cap)}/yr · {extTarget.years}yr left</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>New Salary ($/yr in millions)</label>
                  <input type="range" min="0.8" max="25" step="0.1" value={extSalary} className="slider"
                    onChange={e => setExtSalary(+e.target.value)} />
                  <div className="mono" style={{ textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{formatM(extSalary)}/yr</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Contract Length</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(y => (
                      <span key={y} className={`chip ${extYears === y ? 'pos' : 'outline'}`}
                        style={{ cursor: 'pointer', padding: '4px 12px' }}
                        onClick={() => setExtYears(y)}>{y}yr</span>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 12, marginBottom: 16, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Total value</span>
                    <strong className="mono">{formatM(extSalary * extYears)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Guaranteed (~20%)</span>
                    <strong className="mono">{formatM(extSalary * extYears * 0.2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">New cap hit</span>
                    <strong className="mono dn">{formatM(extSalary + extSalary * extYears * 0.2 / extYears)}/yr</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setExtTarget(null)}>Cancel</button>
                  <button className="btn primary" onClick={() => {
                    try {
                      const salary = extSalary * 1_000_000;
                      const guaranteedAmount = Math.round(salary * extYears * 0.2);
                      const result = actions.extendContract(team.id, extTarget.id, {
                        salary,
                        yearsRemaining: extYears,
                        guaranteedAmount,
                        bonusAmount: 0,
                        bonusExpectation: null,
                        capHit: salary + Math.round(guaranteedAmount / extYears),
                      });
                      if (result?.rejected) {
                        setExtResult({ name: extTarget.name, rejected: true, reason: result.reason });
                      } else {
                        setExtResult({ name: extTarget.name, salary: extSalary, years: extYears });
                      }
                      setExtTarget(null);
                    } catch (err) {
                      alert(err.message);
                    }
                  }}>Extend Contract</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
