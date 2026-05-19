import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, Stars, OvrPill } from '../components/Chrome.jsx';
import { bridgeProspect } from '../data/bridge.js';

const POSITION_GROUPS = [
  { id: 'QB',   label: 'Quarterbacks' },
  { id: 'RB',   label: 'Running Backs' },
  { id: 'WR',   label: 'Wide Receivers' },
  { id: 'OL',   label: 'Offensive Line' },
  { id: 'EDGE', label: 'Edge Rushers' },
  { id: 'DT',   label: 'Defensive Tackles' },
  { id: 'LB',   label: 'Linebackers' },
  { id: 'CB',   label: 'Cornerbacks' },
  { id: 'S',    label: 'Safeties' },
];

const SCOUT_TIERS = [
  { level: 'surface',  cost: 2, label: 'Surface',  reveals: 'Exact OVR estimate' },
  { level: 'standard', cost: 4, label: 'Standard', reveals: 'OVR + hidden traits' },
  { level: 'deep',     cost: 6, label: 'Deep',     reveals: 'OVR + traits + potential stars' },
];

export function ScreenScouting({ onNav }) {
  const { userTeam, scouting, draftClass, actions, _engine } = useLeague();
  const league = _engine;

  const teamId = userTeam?.id;
  const currency = scouting?.currencyByTeamId?.[teamId] || 0;
  const revealed = scouting?.revealedGroupsByTeamId?.[teamId] || {};
  const [posFilter, setPosFilter] = useState('All');
  const [scoutResult, setScoutResult] = useState(null);

  function scoutGroup(group, spend) {
    try {
      actions.scoutGroup(teamId, group, spend);
      const newLevel = spend >= 5 ? 'deep' : spend >= 3 ? 'standard' : 'surface';
      setScoutResult({ group, level: newLevel });
    } catch (e) {
      alert(e.message);
    }
  }

  function nextTier(group) {
    const current = revealed[group];
    if (!current) return SCOUT_TIERS[0];
    if (current === 'surface') return SCOUT_TIERS[1];
    if (current === 'standard') return SCOUT_TIERS[2];
    return null; // already deep
  }

  // Bridge prospects with scouting data
  const prospects = draftClass
    .filter(p => !p.draftedByTeamId)
    .map(p => bridgeProspect(p, revealed))
    .sort((a, b) => a.projRank - b.projRank);

  const filteredProspects = posFilter === 'All'
    ? prospects
    : prospects.filter(p => {
        const groupMap = { OT: 'OL', OG: 'OL', C: 'OL', DL: 'DT', TE: 'WR' };
        return (groupMap[p.pos] || p.pos) === posFilter;
      });

  // Count user's picks
  const userPicks = (league.draft?.picks || []).filter(p => p.currentTeamId === teamId);

  const revealChip = (level) => {
    if (!level) return { text: 'Unscouted', cls: 'outline', color: 'var(--ink-4)' };
    if (level === 'surface') return { text: 'Surface', cls: '', color: '#B8860B' };
    if (level === 'standard') return { text: 'Standard', cls: '', color: '#2563EB' };
    return { text: 'Deep', cls: 'pos', color: '#7B2FF7' };
  };

  return (
    <>
      <Topbar crumb="Front Office / Scouting" title="Scouting" />
      <div className="page">

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <div className="stat-tile">
            <div className="label">Scouting Points</div>
            <div className="value">{currency}</div>
            <div className="delta">+2 earned per game week</div>
          </div>
          <div className="stat-tile">
            <div className="label">Groups Scouted</div>
            <div className="value">{Object.keys(revealed).length}<span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/{POSITION_GROUPS.length}</span></div>
            <div className="delta">{POSITION_GROUPS.length - Object.keys(revealed).length} remaining</div>
          </div>
          <div className="stat-tile">
            <div className="label">Draft Class</div>
            <div className="value">{draftClass.filter(p => !p.draftedByTeamId).length}</div>
            <div className="delta">Prospects available</div>
          </div>
          <div className="stat-tile">
            <div className="label">Your Picks</div>
            <div className="value">{userPicks.length}</div>
            <div className="delta">{userPicks.map(p => `R${p.round}`).join(', ') || 'None'}</div>
          </div>
        </div>

        {scoutResult && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-b" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="chip pos" style={{ fontSize: 11 }}>Scouted</span>
              <span><strong>{POSITION_GROUPS.find(g => g.id === scoutResult.group)?.label}</strong> revealed to <strong>{scoutResult.level}</strong> level</span>
              <span style={{ flex: 1 }} />
              <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setScoutResult(null)}>Dismiss</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          {/* Left — Scout by group */}
          <div className="card">
            <div className="card-h"><h2>Scout Position Groups</h2></div>
            <div className="card-b">
              {POSITION_GROUPS.map(pg => {
                const currentLevel = revealed[pg.id];
                const next = nextTier(pg.id);
                const chip = revealChip(currentLevel);
                return (
                  <div key={pg.id} style={{
                    padding: '10px 0', borderBottom: '1px solid var(--line-soft)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{pg.label}</div>
                      <span className={`chip ${chip.cls}`} style={{ fontSize: 10, marginTop: 4 }}>{chip.text}</span>
                    </div>
                    {next ? (
                      <button
                        className="btn primary"
                        style={{ padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
                        disabled={currency < next.cost}
                        onClick={() => scoutGroup(pg.id, next.cost)}
                        title={`Reveals: ${next.reveals}`}
                      >
                        {next.label} ({next.cost} pts)
                      </button>
                    ) : (
                      <span className="chip pos" style={{ fontSize: 10 }}>Fully Scouted</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Prospect table */}
          <div className="card">
            <div className="card-h">
              <h2>Prospects</h2>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                {['All', ...POSITION_GROUPS.map(g => g.id)].map(f => (
                  <span key={f} className={`chip ${posFilter === f ? 'pos' : 'outline'}`}
                    style={{ fontSize: 9, padding: '2px 6px', cursor: 'pointer' }}
                    onClick={() => setPosFilter(f)}>{f}</span>
                ))}
              </div>
            </div>
            <div className="card-b tight" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="num">Rk</th>
                    <th>Prospect</th>
                    <th>Pos</th>
                    <th>Age</th>
                    <th>Range</th>
                    <th className="num">Combine</th>
                    <th className="num">OVR</th>
                    <th>Traits</th>
                    <th>Pot</th>
                    <th>Intel</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.slice(0, 50).map(p => {
                    const rl = revealChip(p.revealLevel);
                    return (
                      <tr key={p.id}>
                        <td className="num mono">{p.projRank}</td>
                        <td><strong>{p.name}</strong></td>
                        <td className="mono">{p.pos}</td>
                        <td>{p.age}</td>
                        <td className="mono">{p.ratingRange[0]}-{p.ratingRange[1]}</td>
                        <td className="num mono" title={p.combine ? `Spd ${p.combine.speedScore} · Pwr ${p.combine.powerScore} · Agi ${p.combine.agilityScore}` : ''}>
                          {p.combine ? Math.round((p.combine.speedScore + p.combine.powerScore + p.combine.agilityScore) / 3) : '—'}
                        </td>
                        <td className="num">{p.ovr != null ? <OvrPill ovr={p.ovr} /> : <span className="muted">?</span>}</td>
                        <td className="muted" style={{ fontSize: 11 }}>
                          {p.traits ? (p.traits.length > 0 ? p.traits.map(t => t.name || t).slice(0, 2).join(', ') : 'None') : '—'}
                        </td>
                        <td>{p.potential != null ? <Stars n={p.potential} /> : <span className="muted">—</span>}</td>
                        <td><span className={`chip ${rl.cls}`} style={{ fontSize: 9 }}>{rl.text}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h2>Scouting Tiers</h2></div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {SCOUT_TIERS.map(t => (
              <div key={t.level}>
                <div style={{ font: '700 13px var(--font-display)', marginBottom: 6 }}>{t.label} — {t.cost} pts</div>
                <div className="muted" style={{ fontSize: 12 }}>{t.reveals}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
