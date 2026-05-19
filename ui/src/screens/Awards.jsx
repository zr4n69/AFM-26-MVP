import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill, Avatar } from '../components/Chrome.jsx';

const AWARD_LABELS = {
  seasonMvp: 'Season MVP',
  offensivePlayerOfYear: 'Offensive Player of the Year',
  defensivePlayerOfYear: 'Defensive Player of the Year',
  offensiveRookieOfYear: 'Off. Rookie of the Year',
  defensiveRookieOfYear: 'Def. Rookie of the Year',
};

export function ScreenAwards({ onNav }) {
  const { userTeam, teams, awards, phase } = useLeague();

  const hasAwards = awards?.regularSeasonProcessed && Object.keys(awards.winners || {}).length > 0;

  const findTeam = (id) => teams.find(t => t.id === id);
  const findPlayer = (teamId, playerId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.roster?.find(p => p.id === playerId);
  };

  // Major awards
  const majorAwards = Object.entries(awards?.winners || {}).map(([key, entry]) => {
    const team = findTeam(entry.teamId);
    const player = findPlayer(entry.teamId, entry.playerId);
    return { key, label: AWARD_LABELS[key] || key, team, player, entry };
  }).filter(a => a.player);

  // All-Pro
  const allProFirst = awards?.allPro?.firstTeam || [];
  const allProOffense = allProFirst.filter(a => ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'].includes(a?.metadata?.position));
  const allProDefense = allProFirst.filter(a => ['EDGE', 'DL', 'LB', 'CB', 'S'].includes(a?.metadata?.position));

  return (
    <>
      <Topbar crumb="League / Awards" title="Season Awards" />
      <div className="page">

        {!hasAwards ? (
          <div className="card">
            <div className="card-h"><h2>Award Watch</h2></div>
            <div className="card-b">
              <p className="muted">Awards are computed at end of regular season during Season Review. Check back after the final week.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Major Awards */}
            <div className="section-h" style={{ marginBottom: 12 }}><h2>Major Awards</h2></div>
            <div className="grid grid-3" style={{ marginBottom: 22 }}>
              {majorAwards.map(a => (
                <div className="card" key={a.key}>
                  <div className="card-h"><h2>{a.label}</h2></div>
                  <div className="card-b" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar player={a.player} team={a.team} size={56} />
                    <div style={{ flex: 1 }}>
                      <div style={{ font: '700 17px var(--font-display)' }}>{a.player.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{a.player.pos} · {a.team?.city} {a.team?.name}</div>
                      <div style={{ marginTop: 4 }}><OvrPill ovr={a.player.ovr} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* All-Pro */}
            <div className="grid grid-2">
              <div className="card">
                <div className="card-h"><h2>First Team All-Pro · Offense</h2></div>
                <div className="card-b tight">
                  <table className="tbl">
                    <tbody>
                      {allProOffense.map((a, i) => {
                        const team = findTeam(a.teamId);
                        const player = findPlayer(a.teamId, a.playerId);
                        return (
                          <tr key={i}>
                            <td className="mono" style={{ width: 50, fontWeight: 700 }}>{a.metadata?.position}</td>
                            <td><strong>{player?.name || a.playerId}</strong></td>
                            <td><ColorBlock team={team} size={16} /></td>
                            <td className="num"><OvrPill ovr={player?.ovr} /></td>
                          </tr>
                        );
                      })}
                      {allProOffense.length === 0 && <tr><td className="muted" colSpan={4}>Not yet computed</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <div className="card-h"><h2>First Team All-Pro · Defense</h2></div>
                <div className="card-b tight">
                  <table className="tbl">
                    <tbody>
                      {allProDefense.map((a, i) => {
                        const team = findTeam(a.teamId);
                        const player = findPlayer(a.teamId, a.playerId);
                        return (
                          <tr key={i}>
                            <td className="mono" style={{ width: 50, fontWeight: 700 }}>{a.metadata?.position}</td>
                            <td><strong>{player?.name || a.playerId}</strong></td>
                            <td><ColorBlock team={team} size={16} /></td>
                            <td className="num"><OvrPill ovr={player?.ovr} /></td>
                          </tr>
                        );
                      })}
                      {allProDefense.length === 0 && <tr><td className="muted" colSpan={4}>Not yet computed</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* How awards work */}
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-h"><h2>How Awards Are Decided</h2></div>
              <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, fontSize: 13 }}>
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Production</div>
                  Stats, efficiency, snap volume, clutch performance
                </div>
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Context</div>
                  Team success, positional value, scheme importance
                </div>
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Influence</div>
                  Pressure created, turnovers forced/prevented
                </div>
                <div>
                  <div style={{ font: '700 11px var(--font-display)', textTransform: 'uppercase', letterSpacing: 0.08, color: 'var(--ink-4)', marginBottom: 6 }}>Value Impact</div>
                  Awards raise contract & trade value
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
