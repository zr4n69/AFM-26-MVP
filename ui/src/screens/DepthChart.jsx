import { useLeague } from '../context/league-context.js';
import { Topbar, Avatar, OvrPill, Stars, InjBadge } from '../components/Chrome.jsx';

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
        <div className="grid grid-2 depth-scheme-summary">
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
            <section key={g.side} className="depth-unit-section">
              <div className="section-h">
                <h2>{g.side}</h2>
                <span className="sub">
                  {isOff || isDef
                    ? `Starters set by ${isOff ? 'offensive' : 'defensive'} scheme`
                    : 'Sorted by OVR within each position'}
                </span>
              </div>
              <div className="depth-board">
                <div className="depth-board-head" aria-hidden="true">
                  <span>Position</span><span>First unit</span><span>Second unit</span><span>Reserve</span>
                </div>
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

                  const tiers = [
                    { label: 'First unit', players: starters, offset: 0, highlight: true },
                    { label: 'Second unit', players: backups, offset: sc },
                    { label: 'Reserve', players: depthPlayers, offset: sc + sc, dim: true },
                  ];

                  return (
                    <div className="depth-position-row" key={pos}>
                      <div className="depth-position-meta">
                        <strong>{pos}</strong>
                        <span>{starterCount > 0 ? `${starterCount} starter${starterCount > 1 ? 's' : ''}` : 'Rotation'}</span>
                      </div>
                      {tiers.map(tier => (
                        <div className="depth-tier" key={tier.label}>
                          <span className="depth-tier-label">{tier.label}</span>
                          <div className="depth-tier-players">
                            {tier.players.map((p, i) => (
                              <PlayerSlot
                                key={p.id}
                                player={p}
                                team={team}
                                highlight={tier.highlight}
                                dim={tier.dim}
                                index={tier.offset + i}
                                pos={pos}
                                onSwap={swapPlayers}
                                total={total}
                              />
                            ))}
                            {tier.players.length === 0 && <span className="depth-empty">No player</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Scheme starter breakdown */}
        <div className="card">
          <div className="card-h"><h2>Scheme Starter Breakdown</h2><span className="right">How your strategy sets personnel</span></div>
          <div className="card-b depth-scheme-breakdown">
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

function PlayerSlot({ player: p, team, highlight, dim, index, pos, onSwap, total }) {
  const unavailable = p.injStatus === 'O' || p.injStatus === 'Out';
  return (
    <div className={`depth-player-slot${highlight ? ' starter' : ''}${dim ? ' reserve' : ''}${unavailable ? ' unavailable' : ''}`}>
      {onSwap && (
        <div className="depth-order-controls">
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onSwap(pos, index, index - 1); }}
            title={`Promote ${p.name}`}
            aria-label={`Promote ${p.name}`}
          >▲</button>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={(e) => { e.stopPropagation(); onSwap(pos, index, index + 1); }}
            title={`Demote ${p.name}`}
            aria-label={`Demote ${p.name}`}
          >▼</button>
        </div>
      )}
      <Avatar player={p} team={team} size={highlight ? 32 : 28} />
      <OvrPill ovr={p.ovr} />
      <div className="depth-player-copy">
        <strong>{p.name}</strong>
        <div className="depth-player-meta">
          {p.age}yo · <Stars n={p.potential} />
          {p.injStatus && <> · <InjBadge status={p.injStatus} weeksRemaining={p._engine?.health?.weeksRemaining} /></>}
        </div>
      </div>
    </div>
  );
}
