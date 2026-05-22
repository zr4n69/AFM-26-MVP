import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill } from '../components/Chrome.jsx';

// ── stat categories ──────────────────────────────────────────────────────────
const PLAYER_STATS = [
  { key: 'passYds',  label: 'Passing Yards',    positions: ['QB'],                       stat: 'passingYards' },
  { key: 'passTds',  label: 'Passing TDs',       positions: ['QB'],                       stat: 'passingTouchdowns' },
  { key: 'rushYds',  label: 'Rushing Yards',     positions: ['RB', 'QB'],                 stat: 'rushingYards' },
  { key: 'recYds',   label: 'Receiving Yards',   positions: ['WR', 'TE'],                 stat: 'receivingYards' },
  { key: 'sacks',    label: 'Sacks',             positions: ['EDGE', 'DT', 'DL', 'LB'],  stat: 'sacks' },
  { key: 'ints',     label: 'Interceptions',     positions: ['CB', 'S', 'LB'],            stat: 'interceptions' },
  { key: 'tackles',  label: 'Tackles',           positions: ['LB', 'CB', 'S', 'DL', 'DT', 'EDGE'], stat: 'tackles' },
  { key: 'recTds',   label: 'Receiving TDs',     positions: ['WR', 'TE', 'RB'],           stat: 'receivingTouchdowns' },
];

const OVR_CATS = [
  { key: 'qb',   label: 'Quarterbacks',   positions: ['QB'] },
  { key: 'rb',   label: 'Running Backs',  positions: ['RB'] },
  { key: 'wr',   label: 'Receivers',      positions: ['WR', 'TE'] },
  { key: 'edge', label: 'Pass Rushers',   positions: ['EDGE', 'DL', 'DT'] },
  { key: 'cov',  label: 'Coverage',       positions: ['CB', 'S'] },
  { key: 'lb',   label: 'Linebackers',    positions: ['LB'] },
];

// ── team stat derivations ────────────────────────────────────────────────────
function computeTeamStats(teams, gamesPlayed) {
  const gp = Math.max(1, gamesPlayed);
  return teams.map(t => {
    const r = t._engine?.roster || [];
    const sum = key => r.reduce((acc, p) => acc + (p.stats?.[key] || 0), 0);

    const passYds  = sum('passingYards');
    const rushYds  = sum('rushingYards');
    const sacks    = sum('sacks');
    const intFor   = sum('interceptions');   // INTs made by defense
    const pf       = (t.pf  || 0);
    const pa       = (t.pa  || 0);

    return {
      ...t,
      // offense
      passYdsPg:  passYds  / gp,
      rushYdsPg:  rushYds  / gp,
      offYdsPg:   (passYds + rushYds) / gp,
      ptsPg:      pf / gp,
      // defense (from opposing offense — approximate from opponent PF/PA & own def stats)
      sacksTotal: sacks,
      intTotal:   intFor,
      ptaAllPg:   pa / gp,
      // raw
      pf, pa,
    };
  });
}

// ── shared sub-components ────────────────────────────────────────────────────
function PlayerRow({ rank, player, isStatMode, statVal, maxVal }) {
  const displayVal = isStatMode ? statVal : player.ovr;
  const max        = isStatMode ? maxVal  : (maxVal || 99);
  const pct        = max > 0 ? (displayVal / max) * 100 : 0;

  return (
    <div style={{ padding: '9px 16px', borderBottom: '1px solid var(--line-soft, rgba(255,255,255,0.06))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="mono" style={{ width: 16, color: rank === 1 ? 'var(--neon)' : 'var(--ink-4)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{rank}</span>
        <ColorBlock team={player.team} size={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
          <div className="muted" style={{ fontSize: 11 }}>{player.pos} · {player.team.abbr} · Age {player.age}</div>
        </div>
        {isStatMode
          ? <span className="mono" style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{displayVal.toLocaleString()}</span>
          : <OvrPill ovr={player.ovr} />
        }
      </div>
      <div className="bar" style={{ marginTop: 6 }}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TeamStatRow({ rank, team, value, max, unit = '', userTeamId, colored = false }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const isUser = team.id === userTeamId;
  const display = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--line-soft)',
      background: isUser ? 'rgba(199,255,62,0.05)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="mono" style={{ width: 16, fontSize: 11, fontWeight: 700, color: rank === 1 ? 'var(--neon)' : 'var(--ink-4)', flexShrink: 0 }}>{rank}</span>
        <ColorBlock team={team} size={16} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: isUser ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {team.abbr} <span className="muted" style={{ fontWeight: 400 }}>{team.name}</span>
        </div>
        <span className="mono" style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {display}{unit}
        </span>
      </div>
      <div className="bar" style={{ marginTop: 5 }}>
        <span style={{ width: `${pct}%`, background: colored ? team.primary || 'var(--neon)' : undefined }} />
      </div>
    </div>
  );
}

function TeamRankCard({ title, teams, statKey, unit = '', ascending = false, userTeamId }) {
  const sorted = [...teams].sort((a, b) =>
    ascending ? a[statKey] - b[statKey] : b[statKey] - a[statKey]
  );
  const max = ascending ? sorted[0][statKey] : sorted[0][statKey];

  return (
    <div className="card">
      <div className="card-h">
        <h2>{title}</h2>
        <span className="right muted" style={{ fontSize: 10 }}>{ascending ? 'lower = better' : 'higher = better'}</span>
      </div>
      <div className="card-b tight">
        {sorted.map((t, i) => (
          <TeamStatRow
            key={t.id}
            rank={i + 1}
            team={t}
            value={t[statKey]}
            max={max}
            unit={unit}
            userTeamId={userTeamId}
            colored
          />
        ))}
      </div>
    </div>
  );
}

// ── main screen ──────────────────────────────────────────────────────────────
export function ScreenLeaders() {
  const { teams, userTeam, week, season } = useLeague();
  const [mode, setMode] = useState('season');

  const gamesPlayed = week || 0;
  const allPlayers  = teams.flatMap(t => t.roster.map(p => ({ ...p, team: t })));
  const teamStats   = computeTeamStats(teams, gamesPlayed);

  const isStatMode = mode === 'season' || mode === 'career';
  const categories = isStatMode ? PLAYER_STATS : OVR_CATS;

  function getStatVal(player, statKey) {
    const stats = mode === 'career'
      ? (player._engine?.careerStats || {})
      : (player._engine?.stats || {});
    return stats[statKey] || 0;
  }

  const tabs = [
    ['season', 'Season Stats'],
    ['career', 'Career Stats'],
    ['rating', 'By Rating'],
    ['team',   'Team Stats'],
  ];

  return (
    <>
      <Topbar
        crumb="Game Week / League Leaders"
        title="League Leaders"
        pill={`Season ${season} · Wk ${week}`}
      />
      <div className="page">

        <div className="tabs" style={{ marginBottom: 18 }}>
          {tabs.map(([k, label]) => (
            <div key={k} className={`tab ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>
              {label}
            </div>
          ))}
        </div>

        {/* ── player stats / rating tabs ── */}
        {mode !== 'team' && (
          <div className="grid grid-3">
            {categories.map(cat => {
              const list = isStatMode
                ? allPlayers
                    .filter(p => cat.positions.includes(p.pos))
                    .map(p => ({ ...p, statVal: getStatVal(p, cat.stat) }))
                    .sort((a, b) => b.statVal - a.statVal)
                    .slice(0, 8)
                : allPlayers
                    .filter(p => cat.positions.includes(p.pos))
                    .sort((a, b) => b.ovr - a.ovr)
                    .slice(0, 8);

              const maxVal = isStatMode
                ? (list[0]?.statVal || 1)
                : (list[0]?.ovr || 99);

              return (
                <div className="card" key={cat.key}>
                  <div className="card-h">
                    <h2>{cat.label}</h2>
                    <span className="right muted" style={{ fontSize: 10 }}>
                      {isStatMode ? (mode === 'career' ? 'Career' : 'Season') : 'OVR'}
                    </span>
                  </div>
                  <div className="card-b tight" style={{ padding: 0 }}>
                    {list.map((p, i) => (
                      <PlayerRow
                        key={p.id}
                        rank={i + 1}
                        player={p}
                        isStatMode={isStatMode}
                        statVal={isStatMode ? p.statVal : p.ovr}
                        maxVal={maxVal}
                      />
                    ))}
                    {list.length === 0 && (
                      <div style={{ padding: 14 }} className="muted">No data yet — stats accumulate as games are played.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── team stats tab ── */}
        {mode === 'team' && (
          <>
            {/* Summary row for user's team */}
            {userTeam && (() => {
              const ut = teamStats.find(t => t.id === userTeam.id);
              if (!ut) return null;
              const offRank = [...teamStats].sort((a, b) => b.offYdsPg - a.offYdsPg).findIndex(t => t.id === ut.id) + 1;
              const defRank = [...teamStats].sort((a, b) => a.ptaAllPg - b.ptaAllPg).findIndex(t => t.id === ut.id) + 1;
              return (
                <div className="card" style={{ marginBottom: 20, borderTop: '3px solid var(--neon)' }}>
                  <div className="card-h"><h2>Your Team Snapshot — {ut.city} {ut.name}</h2></div>
                  <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 14 }}>
                    {[
                      { label: 'Off Rank',   value: `#${offRank}`,               sub: 'total yards/gm' },
                      { label: 'Pass Yds/G', value: ut.passYdsPg.toFixed(1),     sub: 'avg per game' },
                      { label: 'Rush Yds/G', value: ut.rushYdsPg.toFixed(1),     sub: 'avg per game' },
                      { label: 'Pts/Game',   value: ut.ptsPg.toFixed(1),         sub: 'scored' },
                      { label: 'Def Rank',   value: `#${defRank}`,               sub: 'pts allowed/gm' },
                      { label: 'Pts Alwd/G', value: ut.ptaAllPg.toFixed(1),      sub: 'avg per game' },
                      { label: 'Sacks',      value: ut.sacksTotal,               sub: 'total this season' },
                      { label: 'INTs Made',  value: ut.intTotal,                  sub: 'total this season' },
                    ].map(({ label, value, sub }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ font: '700 20px var(--font-display)', color: 'var(--chalk)' }}>{value}</div>
                        <div style={{ font: '700 10px var(--font-stamp)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--neon)', marginTop: 2 }}>{label}</div>
                        <div className="muted" style={{ fontSize: 10, marginTop: 1 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Offense rankings */}
            <div className="section-h" style={{ marginBottom: 12 }}>
              <h2>Offense Rankings</h2>
              <span className="sub">Per game averages · Season {season}</span>
            </div>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <TeamRankCard title="Total Offense (Yds/Gm)"    teams={teamStats} statKey="offYdsPg"  unit=""  userTeamId={userTeam?.id} />
              <TeamRankCard title="Passing Yards / Game"       teams={teamStats} statKey="passYdsPg" unit=""  userTeamId={userTeam?.id} />
              <TeamRankCard title="Rushing Yards / Game"       teams={teamStats} statKey="rushYdsPg" unit=""  userTeamId={userTeam?.id} />
              <TeamRankCard title="Points Scored / Game"       teams={teamStats} statKey="ptsPg"     unit=""  userTeamId={userTeam?.id} />
            </div>

            {/* Defense rankings */}
            <div className="section-h" style={{ marginBottom: 12 }}>
              <h2>Defense Rankings</h2>
              <span className="sub">Lower points allowed = better</span>
            </div>
            <div className="grid grid-3">
              <TeamRankCard title="Points Allowed / Game"  teams={teamStats} statKey="ptaAllPg"   unit=""  userTeamId={userTeam?.id} ascending />
              <TeamRankCard title="Sacks (Total)"          teams={teamStats} statKey="sacksTotal" unit=""  userTeamId={userTeam?.id} />
              <TeamRankCard title="Interceptions (Total)"  teams={teamStats} statKey="intTotal"   unit=""  userTeamId={userTeam?.id} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
