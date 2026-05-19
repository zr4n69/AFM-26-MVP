import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill, Stars, Avatar, InjBadge, formatM } from '../components/Chrome.jsx';

export function ScreenDashboard({ onNav }) {
  const { userTeam, teams, week, season } = useLeague();
  const team = userTeam;
  if (!team) return null;

  const confTeams = teams.filter(t => t.conf === team.conf).sort((a, b) => b.w - a.w);
  const injuries = team.roster.filter(p => p.injStatus).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
  const stars = [...team.roster].sort((a, b) => b.ovr - a.ovr).slice(0, 5);

  return (
    <>
      <Topbar
        crumb={`Team / ${team.city} ${team.name}`}
        title="Dashboard"
        pill={`Wk ${week + 1} · Season ${season}`}
        actions={
          <>
            <button className="btn" onClick={() => onNav('gameweek')}>Sim Week</button>
            <button className="btn primary" onClick={() => onNav('gameweek')}>Play Week {week + 1} →</button>
          </>
        }
      />
      <div className="page">
        {/* Stat tiles */}
        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Record</div>
            <div className="value">{team.w}–{team.l}</div>
            <div className="delta pos">{confTeams[0]?.id === team.id ? '1st' : `${confTeams.findIndex(t => t.id === team.id) + 1}${ordSuffix(confTeams.findIndex(t => t.id === team.id) + 1)}`} in {team.conf}</div>
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
            <div className="label">Team Morale</div>
            <div className="value">{team.morale}</div>
            <div className={`delta ${team.morale >= 65 ? 'pos' : team.morale <= 35 ? 'neg' : ''}`}>
              {team.morale >= 75 ? 'Energized' : team.morale >= 60 ? 'Confident' : team.morale >= 40 ? 'Neutral' : team.morale >= 25 ? 'Discouraged' : 'Deflated'}
            </div>
          </div>
        </div>

        {/* Two column */}
        <div className="grid grid-3-2">
          <div>
            {/* Team Leaders */}
            <div className="card">
              <div className="card-h">
                <h2>Team Leaders</h2>
                <span className="right" style={{ cursor: 'pointer' }} onClick={() => onNav('roster')}>Roster →</span>
              </div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th>Player</th><th>Pos</th><th className="num">OVR</th><th>Status</th><th className="num">Cap</th></tr></thead>
                  <tbody>
                    {stars.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar player={p} team={team} size={32} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              {p.traits[0] && <div className="muted" style={{ fontSize: 11 }}>{p.traits[0]}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="mono">{p.pos}</td>
                        <td className="num"><OvrPill ovr={p.ovr} /></td>
                        <td><InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></td>
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
            {/* Conference standings */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-h">
                <h2>{team.conf} Conference</h2>
                <span className="right" style={{ cursor: 'pointer' }} onClick={() => onNav('standings')}>Standings →</span>
              </div>
              <div className="card-b tight">
                <table className="tbl">
                  <thead><tr><th>Team</th><th className="num">W-L</th><th className="num">PF</th><th className="num">PA</th><th className="num">Diff</th></tr></thead>
                  <tbody>
                    {confTeams.map((t, i) => (
                      <tr key={t.id} style={t.id === team.id ? { background: 'var(--bg-2)' } : {}}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', width: 12 }}>{i + 1}</span>
                            <ColorBlock team={t} size={16} />
                            <span style={{ fontWeight: t.id === team.id ? 700 : 500 }}>{t.name}</span>
                          </div>
                        </td>
                        <td className="num mono">{t.w}-{t.l}</td>
                        <td className="num mono">{t.pf}</td>
                        <td className="num mono">{t.pa}</td>
                        <td className={`num mono ${t.diff > 0 ? 'up' : t.diff < 0 ? 'dn' : ''}`}>{t.diff > 0 ? '+' : ''}{t.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Storylines */}
            {team.storylines.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-h"><h2>Storylines</h2></div>
                <div className="card-b" style={{ fontSize: 13 }}>
                  {team.storylines.slice(-4).reverse().map((s, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: i < Math.min(team.storylines.length, 4) - 1 ? '1px solid var(--line-soft)' : 'none', color: 'var(--ink-2)' }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Injury Report */}
            <div className="card">
              <div className="card-h"><h2>Injury Report</h2><span className="right">{injuries.length} players</span></div>
              <div className="card-b tight">
                {injuries.length === 0 && <div style={{ padding: 14 }} className="muted">No injuries.</div>}
                {injuries.map(p => {
                  const health = p._engine?.health || {};
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                      <Avatar player={p} team={team} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name} <span className="muted" style={{ fontWeight: 400 }}>· {p.pos}</span></div>
                        {health.injury && (
                          <div className="muted" style={{ fontSize: 11 }}>{health.injury} · {health.weeksRemaining}wk remaining</div>
                        )}
                      </div>
                      <InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ordSuffix(n) {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}
