import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock } from '../components/Chrome.jsx';

const CONFERENCES = ['West', 'East', 'North', 'South'];

export function ScreenStandings() {
  const { teams, userTeam, week, season } = useLeague();
  if (!userTeam) return null;

  return (
    <>
      <Topbar
        crumb="Game Week / Standings"
        title="Standings"
        pill={`After Wk ${week} · Season ${season}`}
      />
      <div className="page">
        <div className="grid grid-2" style={{ marginBottom: 18 }}>
          {CONFERENCES.map(conf => {
            const list = teams
              .filter(t => t.conf === conf)
              .sort((a, b) => b.pct - a.pct || b.diff - a.diff);
            return (
              <div className="card" key={conf}>
                <div className="card-h">
                  <h2>{conf} Division</h2>
                  <span className="right">{list.length} teams</span>
                </div>
                <div className="card-b tight">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 24 }}></th>
                        <th>Team</th>
                        <th className="num">W</th>
                        <th className="num">L</th>
                        <th className="num">PCT</th>
                        <th className="num">PF</th>
                        <th className="num">PA</th>
                        <th className="num">DIFF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((t, i) => (
                        <tr key={t.id} style={t.id === userTeam.id ? { background: 'var(--bg-2)' } : {}}>
                          <td className="mono muted" style={{ width: 24 }}>{i + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <ColorBlock team={t} size={18} />
                              <strong style={{ fontWeight: t.id === userTeam.id ? 700 : 500 }}>{t.city} {t.name}</strong>
                            </div>
                          </td>
                          <td className="num mono">{t.w}</td>
                          <td className="num mono">{t.l}</td>
                          <td className="num mono">{t.pct.toFixed(3).slice(1) || '.000'}</td>
                          <td className="num mono">{t.pf}</td>
                          <td className="num mono">{t.pa}</td>
                          <td className={`num mono ${t.diff > 0 ? 'up' : t.diff < 0 ? 'dn' : ''}`}>
                            {t.diff > 0 ? '+' : ''}{t.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <PlayoffProjection teams={teams} userTeam={userTeam} />
      </div>
    </>
  );
}

function PlayoffProjection({ teams, userTeam }) {
  const seeds = [...teams]
    .sort((a, b) => b.pct - a.pct || b.diff - a.diff)
    .slice(0, 6);

  const Box = ({ team, seed }) => {
    if (!team) return (
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-soft)', color: 'var(--ink-4)', fontSize: 13 }}>
        <span className="mono" style={{ width: 18, display: 'inline-block', fontSize: 11 }}>{seed}</span> TBD
      </div>
    );
    return (
      <div style={{
        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--line-soft)',
        background: team.id === userTeam.id ? 'var(--bg-2)' : 'var(--bg-1)',
        fontWeight: team.id === userTeam.id ? 700 : 500,
      }}>
        <span className="mono" style={{ width: 18, fontSize: 11, color: 'var(--ink-4)' }}>{seed}</span>
        <ColorBlock team={team} size={16} />
        <span style={{ flex: 1, fontSize: 13 }}>{team.name}</span>
        <span className="mono muted" style={{ fontSize: 11 }}>{team.w}-{team.l}</span>
      </div>
    );
  };

  const card = { border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'white', overflow: 'hidden' };

  return (
    <>
      <div className="section-h">
        <h2>Playoff Bracket Projection</h2>
        <span className="sub">Seeds 1–2 receive first-round byes · Top 6 by record</span>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36, alignItems: 'start' }}>
          <div>
            <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Wild-Card Round</div>
            <div style={card}><Box team={seeds[2]} seed="3" /><Box team={seeds[5]} seed="6" /></div>
            <div style={{ height: 16 }} />
            <div style={card}><Box team={seeds[3]} seed="4" /><Box team={seeds[4]} seed="5" /></div>
            <div style={{ marginTop: 20, font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Byes</div>
            <div style={card}><Box team={seeds[0]} seed="1" /><Box team={seeds[1]} seed="2" /></div>
          </div>
          <div>
            <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Semifinals</div>
            <div style={card}><Box team={seeds[0]} seed="1" /><Box team={null} seed="" /></div>
            <div style={{ height: 16 }} />
            <div style={card}><Box team={seeds[1]} seed="2" /><Box team={null} seed="" /></div>
          </div>
          <div>
            <div style={{ font: '700 11px var(--font-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>AFL Championship</div>
            <div style={{ ...card, borderColor: 'var(--accent)', borderWidth: 2 }}>
              <Box team={null} seed="" /><Box team={null} seed="" />
            </div>
            <div style={{ marginTop: 18, padding: 14, background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Champion</div>
              <div style={{ font: '700 16px var(--font-display)', marginTop: 4, color: 'var(--accent)' }}>TBD</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
