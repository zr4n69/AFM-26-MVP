import { useState } from 'react';
import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, Avatar, OvrPill } from '../components/Chrome.jsx';

const VOTES_PER_TEAM = 2;
const ELECTION_THRESHOLD = 4;

export function ScreenHallOfFame({ onNav }) {
  const { userTeam, teams, hallOfFame, season, phase, actions } = useLeague();

  const [myVotes, setMyVotes] = useState(() => {
    const existing = hallOfFame?.ballotsByTeamId?.[userTeam.id];
    return existing ? [...existing] : [];
  });
  const [submitted, setSubmitted] = useState(() =>
    !!(hallOfFame?.ballotsByTeamId?.[userTeam.id]?.length)
  );

  const eligible = (hallOfFame?.eligiblePlayers || []).map(p => {
    const lastTeam = teams.find(t => t.id === p.lastTeamId);
    const awards = (p.awards || []);
    const mvps = awards.filter(a => a.type === 'seasonMvp').length;
    const allPro1 = awards.filter(a => a.type === 'allPro' && a.team === 1).length;
    const allPro2 = awards.filter(a => a.type === 'allPro' && a.team === 2).length;
    const poy = awards.filter(a => ['offensivePlayerOfYear', 'defensivePlayerOfYear'].includes(a.type)).length;
    const roy = awards.filter(a => ['offensiveRookieOfYear', 'defensiveRookieOfYear'].includes(a.type)).length;

    const parts = [];
    if (mvps) parts.push(`MVP×${mvps}`);
    if (poy) parts.push(`POY×${poy}`);
    if (roy) parts.push('ROY');
    if (allPro1) parts.push(`${allPro1}× All-Pro 1st`);
    if (allPro2) parts.push(`${allPro2}× All-Pro 2nd`);

    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      pos: p.position,
      age: p.age,
      ovr: p.overall,
      lastTeam,
      careerYears: p.age - 21,
      awardSummary: parts.join(', ') || 'None',
      votes: hallOfFame?.voteTotals?.[p.id] || 0,
      inducted: (hallOfFame?.inductedPlayerIds || []).includes(p.id),
    };
  }).sort((a, b) => b.votes - a.votes || b.ovr - a.ovr);

  const historicalClasses = (hallOfFame?.history || []).slice().reverse();

  const toggleVote = (playerId) => {
    if (submitted) return;
    setMyVotes(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= VOTES_PER_TEAM) return prev;
      return [...prev, playerId];
    });
  };

  const handleCastVotes = () => {
    if (myVotes.length === 0) return;
    actions.castHofVotes(userTeam.id, myVotes);
    setSubmitted(true);
  };

  const hasEligible = eligible.length > 0;
  const totalVotes = Object.values(hallOfFame?.voteTotals || {}).reduce((s, v) => s + v, 0);
  const inductedCount = (hallOfFame?.inductedPlayerIds || []).length;

  return (
    <>
      <Topbar crumb="League / Hall of Fame" title="Hall of Fame" />
      <div className="page">

        {!hasEligible && historicalClasses.length === 0 ? (
          <div className="card">
            <div className="card-h"><h2>Hall of Fame</h2></div>
            <div className="card-b">
              <p className="muted">No players have retired yet. The Hall of Fame ballot appears during Season Review after retirements are processed.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-4" style={{ marginBottom: 18 }}>
              <div className="stat-tile">
                <div className="label">Class of S{season}</div>
                <div className="value">{inductedCount}</div>
                <div className="delta">Players inducted (≥{ELECTION_THRESHOLD} votes)</div>
              </div>
              <div className="stat-tile">
                <div className="label">Total Votes</div>
                <div className="value">{totalVotes}</div>
                <div className="delta">{VOTES_PER_TEAM} votes per team × {teams.length} teams</div>
              </div>
              <div className="stat-tile">
                <div className="label">Threshold</div>
                <div className="value">{ELECTION_THRESHOLD} votes</div>
                <div className="delta">From retiring pool only</div>
              </div>
              <div className="stat-tile">
                <div className="label">Your Votes</div>
                <div className="value">{myVotes.length} <span style={{ font: '700 14px var(--font-display)', color: 'var(--ink-4)' }}>/{VOTES_PER_TEAM}</span></div>
                <div className="delta">{submitted ? 'Submitted' : 'Not yet submitted'}</div>
              </div>
            </div>

            {/* Ballot */}
            {hasEligible && (
              <div className="card">
                <div className="card-h">
                  <h2>Season {season} Ballot</h2>
                  <span className="right">
                    {!submitted && myVotes.length > 0 && (
                      <button className="btn primary sm" onClick={handleCastVotes}>Cast Votes ({myVotes.length})</button>
                    )}
                    {submitted && <span className="chip pos">Votes Cast</span>}
                  </span>
                </div>
                <div className="card-b tight">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th>Player</th>
                        <th>Pos</th>
                        <th className="num">Yrs</th>
                        <th>Career Awards</th>
                        <th className="num">Votes</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligible.map(p => {
                        const checked = myVotes.includes(p.id);
                        return (
                          <tr key={p.id} style={p.inducted ? { background: 'var(--bg-2)' } : {}}>
                            <td>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={submitted || (!checked && myVotes.length >= VOTES_PER_TEAM)}
                                onChange={() => toggleVote(p.id)}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: 4, display: 'grid', placeItems: 'center',
                                  background: p.lastTeam
                                    ? `linear-gradient(135deg, ${p.lastTeam.primary} 0%, ${p.lastTeam.primary} 50%, ${p.lastTeam.secondary} 50%, ${p.lastTeam.secondary} 100%)`
                                    : 'var(--ink-6)',
                                  color: 'white', font: '700 12px var(--font-display)'
                                }}>
                                  {p.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                                  <div className="muted" style={{ fontSize: 11 }}>
                                    {p.lastTeam ? `Last team: ${p.lastTeam.city} ${p.lastTeam.name}` : 'Free Agent'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="mono"><strong>{p.pos}</strong></td>
                            <td className="num">{p.careerYears}</td>
                            <td className="muted" style={{ fontSize: 12 }}>{p.awardSummary}</td>
                            <td className="num mono"><strong>{p.votes}</strong></td>
                            <td>
                              {p.inducted
                                ? <span className="chip pos">Inducted</span>
                                : p.votes > 0
                                  ? <span className="chip outline">Falls short</span>
                                  : <span className="chip outline">—</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                      {eligible.length === 0 && (
                        <tr><td className="muted" colSpan={7}>No retiring players this season</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info cards */}
            <div className="grid grid-2" style={{ marginTop: 14 }}>
              <div className="card">
                <div className="card-h"><h2>Voting Considerations</h2></div>
                <div className="card-b" style={{ fontSize: 13 }}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Career awards &amp; statistics</li>
                    <li>Championships &amp; playoff success</li>
                    <li>Peak seasons &amp; longevity</li>
                    <li>Positional value &amp; franchise importance</li>
                    <li>Notable traits or storylines</li>
                  </ul>
                </div>
              </div>
              <div className="card">
                <div className="card-h"><h2>Induction Effects</h2></div>
                <div className="card-b" style={{ fontSize: 13 }}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Player legacy records</li>
                    <li>Franchise history &amp; prestige presentation</li>
                    <li>Long-term league storytelling</li>
                    <li><span className="muted">Does not directly change current roster strength.</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Historical classes */}
            {historicalClasses.length > 0 && (
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-h"><h2>Previous Classes</h2></div>
                <div className="card-b tight">
                  <table className="tbl">
                    <thead>
                      <tr><th>Season</th><th>Inducted</th><th className="num">Class Size</th></tr>
                    </thead>
                    <tbody>
                      {historicalClasses.map((cls, i) => (
                        <tr key={i}>
                          <td className="mono"><strong>S{cls.season}</strong></td>
                          <td className="muted" style={{ fontSize: 12 }}>{(cls.inducted || []).join(', ') || 'None'}</td>
                          <td className="num">{(cls.inducted || []).length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
