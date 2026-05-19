import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, OvrPill, Stars, InjBadge } from '../components/Chrome.jsx';

const GROUPS = [
  { side: 'Offense', positions: ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'] },
  { side: 'Defense', positions: ['EDGE', 'DT', 'LB', 'CB', 'S'] },
  { side: 'Special Teams', positions: ['K', 'P'] },
];

const POS_MAP = { DT: 'DL' };

function formatScheme(key) {
  const map = {
    westCoast: 'West Coast', powerRun: 'Power Run', spreadRpo: 'Spread RPO',
    verticalAirRaid: 'Vertical Air Raid', balancedPro: 'Balanced Pro',
    fourThreeZone: '4-3 Zone', threeFourPressure: '3-4 Pressure',
    nickelMatch: 'Nickel Match', manBlitz: 'Man Blitz', bendDontBreak: "Bend Don't Break",
  };
  return map[key] || key || '—';
}

export function ScreenDepthChart({ onNav }) {
  const { userTeam, actions } = useLeague();
  const team = userTeam;
  if (!team) return null;

  function swapPlayers(pos, fromIdx, toIdx) {
    const enginePos = POS_MAP[pos] || pos;
    const currentIds = team._engine.depthChart[enginePos] || [];
    const newIds = [...currentIds];
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= newIds.length || toIdx >= newIds.length) return;
    [newIds[fromIdx], newIds[toIdx]] = [newIds[toIdx], newIds[fromIdx]];
    actions.setDepthChart(team.id, enginePos, newIds);
  }

  const schemeStarters = team.schemeStarters || {};
  const offStarters = team.offStarters || {};
  const defStarters = team.defStarters || {};

  // Total starters per side
  const offTotal = Object.entries(offStarters).reduce((s, [, v]) => s + v, 0);
  const defTotal = Object.entries(defStarters).reduce((s, [, v]) => s + v, 0);

  return (
    <>
      <Topbar
        crumb={`Team / ${team.city} ${team.name}`}
        title="Depth Chart"
        actions={
          <>
            <button className="btn" onClick={() => onNav('strategy')}>Edit Strategy</button>
            <button className="btn" onClick={() => onNav('roster')}>Full Roster</button>
          </>
        }
      />
      <div className="page">
        {/* Scheme summary */}
        <div className="grid grid-2" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Offensive Scheme</div>
            <div className="value" style={{ fontSize: 18 }}>{formatScheme(team.strategy?.offensiveSystem)}</div>
            <div className="delta">{offTotal} starters on offense</div>
          </div>
          <div className="stat-tile">
            <div className="label">Defensive Scheme</div>
            <div className="value" style={{ fontSize: 18 }}>{formatScheme(team.strategy?.defensiveSystem)}</div>
            <div className="delta">{defTotal} starters on defense</div>
          </div>
        </div>

        {GROUPS.map(g => {
          const isOff = g.side === 'Offense';
          const isDef = g.side === 'Defense';
          const sideStarters = isOff ? offStarters : isDef ? defStarters : {};

          return (
            <div key={g.side} style={{ marginBottom: 22 }}>
              <div className="section-h">
                <h2>{g.side}</h2>
                <span className="sub">
                  {isOff || isDef
                    ? `Starters set by ${isOff ? 'offensive' : 'defensive'} scheme`
                    : 'Sorted by OVR within each position'}
                </span>
              </div>
              <div className="card">
                <div className="card-b tight">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Pos</th>
                        <th style={{ width: 50 }} className="num">Start</th>
                        <th>Starter(s)</th>
                        <th>Backup(s)</th>
                        <th>Depth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.positions.map(pos => {
                        const enginePos = POS_MAP[pos] || pos;
                        const starterCount = (isOff || isDef) ? (sideStarters[enginePos] || 0) : (pos === 'K' || pos === 'P' ? 1 : 0);
                        const slots = team.roster
                          .filter(p => p.pos === pos)
                          .sort((a, b) => a.depth - b.depth || b.ovr - a.ovr);
                        const total = slots.length;

                        const sc = Math.max(1, starterCount);
                        const starters = slots.slice(0, sc);
                        const backups = slots.slice(sc, sc + sc);
                        const depthPlayers = slots.slice(sc + sc);

                        return (
                          <tr key={pos}>
                            <td className="mono"><strong>{pos}</strong></td>
                            <td className="num">
                              {starterCount > 0 && (
                                <span className="chip pos" style={{ fontSize: 10, padding: '1px 6px' }}>{starterCount}</span>
                              )}
                              {starterCount === 0 && <span className="muted">—</span>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {starters.map((p, i) => (
                                  <PlayerSlot key={p.id} player={p} highlight index={i} pos={pos} onSwap={swapPlayers} total={total} />
                                ))}
                                {starters.length === 0 && <span className="muted">—</span>}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {backups.map((p, i) => (
                                  <PlayerSlot key={p.id} player={p} index={sc + i} pos={pos} onSwap={swapPlayers} total={total} />
                                ))}
                                {backups.length === 0 && <span className="muted">—</span>}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {depthPlayers.map((p, i) => (
                                  <PlayerSlot key={p.id} player={p} dim index={sc + sc + i} pos={pos} onSwap={swapPlayers} total={total} />
                                ))}
                                {depthPlayers.length === 0 && <span className="muted">—</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {/* Scheme starter breakdown */}
        <div className="card">
          <div className="card-h"><h2>Scheme Starter Breakdown</h2><span className="right">How your strategy sets personnel</span></div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>
                {formatScheme(team.strategy?.offensiveSystem)} Offense
              </div>
              <div style={{ fontSize: 13 }}>
                {['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'].map(pos => {
                  const count = offStarters[pos] || 0;
                  if (count === 0) return null;
                  const available = team.roster.filter(p => p.pos === pos).length;
                  return (
                    <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <span>{pos}</span>
                      <span>
                        <strong>{count}</strong> starter{count > 1 ? 's' : ''}
                        <span className="muted" style={{ marginLeft: 8 }}>({available} on roster)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>
                {formatScheme(team.strategy?.defensiveSystem)} Defense
              </div>
              <div style={{ fontSize: 13 }}>
                {['EDGE', 'DL', 'LB', 'CB', 'S'].map(pos => {
                  const displayPos = pos === 'DL' ? 'DT' : pos;
                  const count = defStarters[pos] || 0;
                  if (count === 0) return null;
                  const available = team.roster.filter(p => p.pos === displayPos).length;
                  return (
                    <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                      <span>{displayPos}</span>
                      <span>
                        <strong>{count}</strong> starter{count > 1 ? 's' : ''}
                        <span className="muted" style={{ marginLeft: 8 }}>({available} on roster)</span>
                      </span>
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

function PlayerSlot({ player: p, highlight, dim, index, pos, onSwap, total }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      opacity: p.injStatus === 'O' || p.injStatus === 'Out' ? 0.45 : dim ? 0.65 : 1,
    }}>
      {onSwap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button
            className="btn"
            style={{ padding: '0 4px', fontSize: 9, lineHeight: '14px', minWidth: 0, visibility: index > 0 ? 'visible' : 'hidden' }}
            onClick={(e) => { e.stopPropagation(); onSwap(pos, index, index - 1); }}
            title="Promote"
          >▲</button>
          <button
            className="btn"
            style={{ padding: '0 4px', fontSize: 9, lineHeight: '14px', minWidth: 0, visibility: index < total - 1 ? 'visible' : 'hidden' }}
            onClick={(e) => { e.stopPropagation(); onSwap(pos, index, index + 1); }}
            title="Demote"
          >▼</button>
        </div>
      )}
      <OvrPill ovr={p.ovr} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: highlight ? 700 : 500, fontSize: 12 }}>{p.name}</div>
        <div className="muted" style={{ fontSize: 10 }}>
          {p.age}yo · <Stars n={p.potential} />
          {p.injStatus && <> · <InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></>}
        </div>
      </div>
    </div>
  );
}
