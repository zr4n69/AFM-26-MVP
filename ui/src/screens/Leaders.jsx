import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill } from '../components/Chrome.jsx';

const STAT_CATEGORIES = [
  { key: 'passYds', label: 'Passing Yards', positions: ['QB'], stat: 'passingYards' },
  { key: 'passTds', label: 'Passing TDs', positions: ['QB'], stat: 'passingTouchdowns' },
  { key: 'rushYds', label: 'Rushing Yards', positions: ['RB', 'QB'], stat: 'rushingYards' },
  { key: 'recYds', label: 'Receiving Yards', positions: ['WR', 'TE'], stat: 'receivingYards' },
  { key: 'sacks', label: 'Sacks', positions: ['EDGE', 'DT', 'LB'], stat: 'sacks' },
  { key: 'ints', label: 'Interceptions', positions: ['CB', 'S', 'LB'], stat: 'interceptions' },
];

const RATING_CATEGORIES = [
  { key: 'qb', label: 'Top Quarterbacks', positions: ['QB'] },
  { key: 'rb', label: 'Top Running Backs', positions: ['RB'] },
  { key: 'wr', label: 'Top Receivers', positions: ['WR', 'TE'] },
  { key: 'pass', label: 'Top Pass Rushers', positions: ['EDGE', 'DT'] },
  { key: 'cov', label: 'Top Coverage', positions: ['CB', 'S'] },
  { key: 'lb', label: 'Top Linebackers', positions: ['LB'] },
];

function getStatVal(player, statKey, mode) {
  const stats = mode === 'career' ? (player.careerStats || {}) : (player._engine?.stats || {});
  return stats[statKey] || 0;
}

export function ScreenLeaders() {
  const { teams, week, season } = useLeague();
  const [mode, setMode] = useState('season');

  const allPlayers = teams.flatMap(t =>
    t.roster.map(p => ({ ...p, team: t }))
  );

  const isStatMode = mode === 'season' || mode === 'career';
  const categories = isStatMode ? STAT_CATEGORIES : RATING_CATEGORIES;

  return (
    <>
      <Topbar
        crumb="Game Week / League Leaders"
        title="League Leaders"
        pill={`Season ${season} · Wk ${week}`}
      />
      <div className="page">
        <div className="tabs" style={{ marginBottom: 18 }}>
          {[['season', 'Season Stats'], ['career', 'Career Stats'], ['rating', 'By OVR']].map(([k, label]) => (
            <div key={k} className={`tab ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{label}</div>
          ))}
        </div>

        <div className="grid grid-3">
          {categories.map(cat => {
            let list;
            if (isStatMode) {
              list = allPlayers
                .filter(p => cat.positions.includes(p.pos))
                .map(p => ({ ...p, statVal: getStatVal(p, cat.stat, mode) }))
                .sort((a, b) => b.statVal - a.statVal)
                .slice(0, 8);
            } else {
              list = allPlayers
                .filter(p => cat.positions.includes(p.pos))
                .sort((a, b) => b.ovr - a.ovr)
                .slice(0, 8);
            }

            const maxVal = isStatMode
              ? (list[0]?.statVal || 1)
              : (list[0]?.ovr || 1);

            return (
              <div className="card" key={cat.key}>
                <div className="card-h">
                  <h2>{cat.label}</h2>
                  <span className="right">{isStatMode ? (mode === 'career' ? 'Career' : 'This Season') : 'By OVR'}</span>
                </div>
                <div className="card-b tight">
                  {list.map((p, i) => (
                    <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="mono" style={{ width: 16, color: 'var(--ink-4)', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                        <ColorBlock team={p.team} size={16} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{p.pos} · {p.team.abbr} · Age {p.age}</div>
                        </div>
                        {isStatMode ? (
                          <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{p.statVal.toLocaleString()}</span>
                        ) : (
                          <OvrPill ovr={p.ovr} />
                        )}
                      </div>
                      <div className="bar" style={{ marginTop: 6 }}>
                        <span style={{ width: `${((isStatMode ? p.statVal : p.ovr) / maxVal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <div style={{ padding: 14 }} className="muted">No data yet.</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
