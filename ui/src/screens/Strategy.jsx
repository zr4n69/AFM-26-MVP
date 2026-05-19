import { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar } from '../components/Chrome.jsx';
import { OFFENSIVE_STARTERS, DEFENSIVE_STARTERS } from '@engine/data/constants.js';

const OFF_SYSTEMS = [
  { key: 'westCoast', name: 'West Coast', desc: 'Efficient short passing, timing routes, YAC, low volatility.' },
  { key: 'powerRun', name: 'Power Run', desc: 'Inside runs, gap schemes, clock control, physical identity.' },
  { key: 'spreadRpo', name: 'Spread RPO', desc: 'Spacing, option looks, QB mobility, faster tempo.' },
  { key: 'verticalAirRaid', name: 'Vertical Air Raid', desc: 'Deep passing, explosives, higher turnover/sack risk.' },
  { key: 'balancedPro', name: 'Balanced Pro', desc: 'Flexible mix, lower extremes, easier roster fit.' },
];

const DEF_SYSTEMS = [
  { key: 'fourThreeZone', name: '4-3 Zone', desc: 'Balanced front, zone coverage, stable vs run/pass.' },
  { key: 'threeFourPressure', name: '3-4 Pressure', desc: 'Blitz variety, sacks, negatives, higher coverage risk.' },
  { key: 'nickelMatch', name: 'Nickel Match', desc: 'Pass D, coverage flex, lighter box.' },
  { key: 'manBlitz', name: 'Man Blitz', desc: 'Aggressive pressure, INTs/sacks, vulnerable to explosives.' },
  { key: 'bendDontBreak', name: 'Bend Don\'t Break', desc: 'Limits explosives, allows yards, strong red-zone D.' },
];

const TENDENCY_DEFS = [
  { key: 'tempo', label: 'Tempo', left: 'Slow / Clock', right: 'Fast / No-huddle', min: 0, max: 100 },
  { key: 'aggression', label: 'Aggression', left: 'Conservative', right: 'Boom or bust', min: 0, max: 100 },
  { key: 'runPassLean', label: 'Run / Pass Lean', left: 'Run-heavy', right: 'Pass-heavy', min: -100, max: 100 },
  { key: 'deepPassing', label: 'Deep Passing', left: 'Short / underneath', right: 'Vertical shots', min: 0, max: 100 },
  { key: 'blitzRate', label: 'Blitz Rate', left: 'Drop 7+', right: 'Heavy pressure', min: 0, max: 100 },
  { key: 'coverageRisk', label: 'Coverage Risk', left: 'Safe / cushion', right: 'Aggressive / jump routes', min: 0, max: 100 },
];

export function ScreenStrategy() {
  const { userTeam, actions } = useLeague();
  const team = userTeam;
  if (!team) return null;

  const strat = team.strategy || {};
  const [off, setOff] = useState(strat.offensiveSystem || 'westCoast');
  const [def, setDef] = useState(strat.defensiveSystem || 'fourThreeZone');
  const [tendencies, setTendencies] = useState({ ...strat.tendencies });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setOff(strat.offensiveSystem || 'westCoast');
    setDef(strat.defensiveSystem || 'fourThreeZone');
    setTendencies({ ...strat.tendencies });
    setDirty(false);
  }, [team.id]);

  const setT = (key, val) => {
    setTendencies(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const apply = () => {
    try {
      actions.updateStrategy(team._engine?.id, {
        offensiveSystem: off,
        defensiveSystem: def,
        tendencies,
      });
      setDirty(false);
    } catch (e) {
      console.error('[updateStrategy]', e);
    }
  };

  const reset = () => {
    setOff(strat.offensiveSystem || 'westCoast');
    setDef(strat.defensiveSystem || 'fourThreeZone');
    setTendencies({ ...strat.tendencies });
    setDirty(false);
  };

  return (
    <>
      <Topbar
        crumb={`Team / ${team.city} ${team.name}`}
        title="Strategy"
        actions={
          <>
            <button className="btn" onClick={reset} disabled={!dirty}>Reset</button>
            <button className="btn primary" onClick={apply} disabled={!dirty}>Apply</button>
          </>
        }
      />
      <div className="page">
        <div className="section-h">
          <h2>Offensive System</h2>
          <span className="sub">Concept weights and play frequencies follow your choice.</span>
        </div>
        <div className="system-grid" style={{ marginBottom: 22 }}>
          {OFF_SYSTEMS.map(s => (
            <div
              key={s.key}
              className={`system-card ${off === s.key ? 'selected' : ''}`}
              onClick={() => { setOff(s.key); setDirty(true); }}
            >
              <div className="sys-name">{s.name}</div>
              <div className="sys-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="section-h">
          <h2>Defensive System</h2>
          <span className="sub">Front, coverage shell, and pressure tendencies.</span>
        </div>
        <div className="system-grid" style={{ marginBottom: 22 }}>
          {DEF_SYSTEMS.map(s => (
            <div
              key={s.key}
              className={`system-card ${def === s.key ? 'selected' : ''}`}
              onClick={() => { setDef(s.key); setDirty(true); }}
            >
              <div className="sys-name">{s.name}</div>
              <div className="sys-desc">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Personnel preview */}
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="card-h"><h2>Scheme Personnel</h2><span className="right">Starters on game day based on your selections</span></div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>Offense — {OFF_SYSTEMS.find(s => s.key === off)?.name}</div>
              {(() => {
                const scheme = OFFENSIVE_STARTERS[off] || OFFENSIVE_STARTERS.balancedPro;
                return ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'].filter(p => scheme[p] > 0).map(pos => {
                  const count = scheme[pos];
                  const available = team.roster.filter(p => p.pos === pos).length;
                  const short = available < count;
                  return (
                    <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
                      <span>{pos}</span>
                      <span>
                        <strong>{count}</strong>
                        <span className={short ? 'neg' : 'muted'} style={{ marginLeft: 6, fontSize: 11 }}>
                          {short ? `need ${count - available} more` : `${available} avail`}
                        </span>
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
            <div>
              <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 8 }}>Defense — {DEF_SYSTEMS.find(s => s.key === def)?.name}</div>
              {(() => {
                const scheme = DEFENSIVE_STARTERS[def] || DEFENSIVE_STARTERS.fourThreeZone;
                const posMap = { DL: 'DT' };
                return ['EDGE', 'DL', 'LB', 'CB', 'S'].filter(p => scheme[p] > 0).map(pos => {
                  const displayPos = posMap[pos] || pos;
                  const count = scheme[pos];
                  const available = team.roster.filter(p => p.pos === displayPos).length;
                  const short = available < count;
                  return (
                    <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
                      <span>{displayPos}</span>
                      <span>
                        <strong>{count}</strong>
                        <span className={short ? 'neg' : 'muted'} style={{ marginLeft: 6, fontSize: 11 }}>
                          {short ? `need ${count - available} more` : `${available} avail`}
                        </span>
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <div className="section-h"><h2>Tendencies</h2></div>
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-b">
            {TENDENCY_DEFS.map(t => (
              <div key={t.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{t.label}</strong>
                  <span className="mono muted">{tendencies[t.key] ?? 50}</span>
                </div>
                <input
                  type="range"
                  min={t.min}
                  max={t.max}
                  value={tendencies[t.key] ?? 50}
                  className="slider"
                  onChange={e => setT(t.key, +e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--ink-4)' }}>
                  <span>{t.left}</span><span>{t.right}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
