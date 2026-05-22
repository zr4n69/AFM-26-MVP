import { useLeague } from '../context/LeagueContext.jsx';
import { Topbar, ColorBlock, OvrPill, Avatar } from '../components/Chrome.jsx';

const AWARD_META = {
  seasonMvp:              { label: 'Season MVP',                icon: '★', color: 'var(--neon, #C7FF3E)' },
  offensivePlayerOfYear:  { label: 'Offensive Player of Year',  icon: '🏈', color: '#F2994A' },
  defensivePlayerOfYear:  { label: 'Defensive Player of Year',  icon: '🛡', color: '#56CCF2' },
  offensiveRookieOfYear:  { label: 'Off. Rookie of the Year',   icon: '🌟', color: '#F2C94C' },
  defensiveRookieOfYear:  { label: 'Def. Rookie of the Year',   icon: '🌟', color: '#9B51E0' },
};

// Mirror engine scoring for live award watch
function offScore(p) {
  const s = p._engine?.stats || {};
  return (s.passingYards || 0) + (s.rushingYards || 0) + (s.receivingYards || 0)
    + ((s.passingTouchdowns || 0) + (s.rushingTouchdowns || 0) + (s.receivingTouchdowns || 0)) * 50;
}
function defScore(p) {
  const s = p._engine?.stats || {};
  return (s.tackles || 0) * 2 + (s.tacklesForLoss || 0) * 5 + (s.sacks || 0) * 8
    + (s.interceptions || 0) * 12 + (s.passDeflections || 0) * 4
    + (s.puntDeflections || 0) * 10 + (s.kickDeflections || 0) * 10;
}
function mvpScore(p) {
  return (p.ovr || 0) + offScore(p) * 0.01 + defScore(p) * 0.01;
}

const OFF_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
const DEF_POSITIONS = ['EDGE', 'DL', 'DT', 'LB', 'CB', 'S'];
const ROOKIE_OFF_POS = ['QB', 'RB', 'WR', 'TE'];
const ROOKIE_DEF_POS = ['EDGE', 'DL', 'DT', 'LB', 'CB', 'S'];

function statLine(player) {
  const s = player._engine?.stats || {};
  const pos = player.pos;
  if (pos === 'QB')  return `${s.passingYards || 0} pass yds · ${s.passingTouchdowns || 0} TD · ${s.interceptionsThrown || 0} INT`;
  if (pos === 'RB')  return `${s.rushingYards || 0} rush yds · ${s.rushingTouchdowns || 0} TD`;
  if (pos === 'WR' || pos === 'TE') return `${s.receivingYards || 0} rec yds · ${s.receivingTouchdowns || 0} TD`;
  return `${s.tackles || 0} tkl · ${s.sacks || 0} sck · ${s.interceptions || 0} INT`;
}

function RaceRow({ rank, player, team, scoreFn, maxScore }) {
  if (!player || !team) return null;
  const score = scoreFn(player);
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft, rgba(255,255,255,0.06))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 20, fontSize: 11, fontWeight: 700, color: rank === 1 ? 'var(--neon)' : 'var(--ink-4)',
          fontFamily: 'var(--font-mono)', flexShrink: 0
        }}>{rank}</span>
        <ColorBlock team={team} size={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </div>
          <div className="muted" style={{ fontSize: 10 }}>{player.pos} · {team.abbr}</div>
        </div>
        <OvrPill ovr={player.ovr} />
      </div>
      <div style={{ marginTop: 5, fontSize: 10, color: 'var(--ink-3)', marginLeft: 30 }}>{statLine(player)}</div>
      <div style={{ marginTop: 4, marginLeft: 30, height: 3, background: 'var(--line-soft)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--neon)', borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function AwardWatchCard({ awardKey, candidates, scoreFn }) {
  const meta = AWARD_META[awardKey];
  if (!candidates || candidates.length === 0) return null;
  const maxScore = scoreFn(candidates[0]);

  return (
    <div className="card">
      <div className="card-h" style={{ gap: 8 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <h2 style={{ flex: 1 }}>{meta.label}</h2>
        <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          RACE
        </span>
      </div>
      <div className="card-b tight" style={{ padding: '4px 16px 8px' }}>
        {candidates.slice(0, 5).map((c, i) => (
          <RaceRow key={c.player.id} rank={i + 1} player={c.player} team={c.team} scoreFn={scoreFn} maxScore={maxScore} />
        ))}
      </div>
    </div>
  );
}

function WinnerCard({ awardKey, entry, findPlayer, findTeam }) {
  const meta = AWARD_META[awardKey];
  if (!entry) return null;
  const team = findTeam(entry.teamId);
  const player = findPlayer(entry.teamId, entry.playerId);
  if (!player || !team) return null;

  return (
    <div className="card" style={{ borderTop: `3px solid ${meta.color}` }}>
      <div className="card-h" style={{ gap: 8 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{meta.label}</h2>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: meta.color,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          background: `${meta.color}22`, padding: '2px 8px', borderRadius: 4
        }}>WINNER</span>
      </div>
      <div className="card-b" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar player={player} team={team} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>{player.name}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{player.pos} · {team.city} {team.name}</div>
          <div style={{ marginTop: 5, fontSize: 11, color: 'var(--ink-3)' }}>{statLine(player)}</div>
        </div>
        <OvrPill ovr={player.ovr} />
      </div>
    </div>
  );
}

export function ScreenAwards({ onNav }) {
  const { userTeam, teams, awards, phase } = useLeague();

  const hasAwards = awards?.regularSeasonProcessed && Object.keys(awards.winners || {}).length > 0;

  const findTeam  = (id) => teams.find(t => t.id === id);
  const findPlayer = (teamId, playerId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.roster?.find(p => p.id === playerId);
  };

  // Build live award-watch candidates from current stats
  const allPlayers = teams.flatMap(t => t.roster.map(p => ({ player: p, team: t })));

  const mvpCandidates = [...allPlayers]
    .filter(({ player: p }) => OFF_POSITIONS.includes(p.pos) || DEF_POSITIONS.includes(p.pos))
    .sort((a, b) => mvpScore(b.player) - mvpScore(a.player));

  const opyCandidates = [...allPlayers]
    .filter(({ player: p }) => OFF_POSITIONS.includes(p.pos))
    .sort((a, b) => offScore(b.player) - offScore(a.player));

  const dpyCandidates = [...allPlayers]
    .filter(({ player: p }) => DEF_POSITIONS.includes(p.pos))
    .sort((a, b) => defScore(b.player) - defScore(a.player));

  const rooOffCandidates = [...allPlayers]
    .filter(({ player: p }) => ROOKIE_OFF_POS.includes(p.pos) && p._engine?.rookie)
    .sort((a, b) => offScore(b.player) - offScore(a.player));

  const rooDefCandidates = [...allPlayers]
    .filter(({ player: p }) => ROOKIE_DEF_POS.includes(p.pos) && p._engine?.rookie)
    .sort((a, b) => defScore(b.player) - defScore(a.player));

  // Final award winners (post-season)
  const majorAwards = Object.entries(awards?.winners || {}).map(([key, entry]) => ({
    key, entry, meta: AWARD_META[key]
  })).filter(a => a.meta);

  const allProFirst  = awards?.allPro?.firstTeam  || [];
  const allProSecond = awards?.allPro?.secondTeam || [];
  const allProOffense = allProFirst.filter(a => ['QB','RB','WR','TE','OT','OG','C'].includes(a?.metadata?.position));
  const allProDefense = allProFirst.filter(a => ['EDGE','DL','LB','CB','S'].includes(a?.metadata?.position));
  const allPro2Off    = allProSecond.filter(a => ['QB','RB','WR','TE','OT','OG','C'].includes(a?.metadata?.position));
  const allPro2Def    = allProSecond.filter(a => ['EDGE','DL','LB','CB','S'].includes(a?.metadata?.position));

  function AllProTable({ entries, label }) {
    return (
      <div className="card">
        <div className="card-h"><h2>{label}</h2></div>
        <div className="card-b tight">
          <table className="tbl">
            <tbody>
              {entries.map((a, i) => {
                const team   = findTeam(a.teamId);
                const player = findPlayer(a.teamId, a.playerId);
                return (
                  <tr key={i}>
                    <td className="mono" style={{ width: 44, fontWeight: 700, color: 'var(--ink-3)' }}>{a.metadata?.position}</td>
                    <td><strong>{player?.name || '—'}</strong></td>
                    <td style={{ width: 26 }}><ColorBlock team={team} size={16} /></td>
                    <td className="num"><OvrPill ovr={player?.ovr} /></td>
                  </tr>
                );
              })}
              {entries.length === 0 && <tr><td className="muted" colSpan={4}>Not yet computed</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <Topbar crumb="League / Awards" title="Awards" pill={hasAwards ? 'Final' : 'Award Watch'} />
      <div className="page">

        {!hasAwards ? (
          <>
            {/* Live award watch during regular season */}
            <div className="section-h" style={{ marginBottom: 12 }}>
              <h2>Award Watch</h2>
              <span className="sub">Live race — updates after each simulated week</span>
            </div>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <AwardWatchCard awardKey="seasonMvp"             candidates={mvpCandidates}     scoreFn={p => mvpScore(p)} />
              <AwardWatchCard awardKey="offensivePlayerOfYear" candidates={opyCandidates}     scoreFn={p => offScore(p)} />
              <AwardWatchCard awardKey="defensivePlayerOfYear" candidates={dpyCandidates}     scoreFn={p => defScore(p)} />
              {rooOffCandidates.length > 0 && <AwardWatchCard awardKey="offensiveRookieOfYear" candidates={rooOffCandidates} scoreFn={p => offScore(p)} />}
              {rooDefCandidates.length > 0 && <AwardWatchCard awardKey="defensiveRookieOfYear" candidates={rooDefCandidates} scoreFn={p => defScore(p)} />}
            </div>

            <div className="card">
              <div className="card-h"><h2>How Awards Are Decided</h2></div>
              <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 18, fontSize: 13 }}>
                {[
                  { h: 'Production', b: 'Stats, efficiency, snap volume, clutch moments' },
                  { h: 'Context',    b: 'Team success, positional value, scheme fit' },
                  { h: 'Influence',  b: 'Pressure created, turnovers forced / prevented' },
                  { h: 'Value',      b: 'Awards raise contract & trade market value' },
                ].map(({ h, b }) => (
                  <div key={h}>
                    <div style={{ font: '700 10px var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', marginBottom: 5 }}>{h}</div>
                    <div style={{ color: 'var(--ink-2)', lineHeight: 1.4 }}>{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Final winners */}
            <div className="section-h" style={{ marginBottom: 12 }}>
              <h2>Major Awards</h2>
            </div>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              {majorAwards.map(a => (
                <WinnerCard key={a.key} awardKey={a.key} entry={a.entry} findPlayer={findPlayer} findTeam={findTeam} />
              ))}
            </div>

            {/* All-Pro teams */}
            <div className="section-h" style={{ marginBottom: 12 }}>
              <h2>All-Pro Teams</h2>
            </div>
            <div className="grid grid-2" style={{ marginBottom: 14 }}>
              <AllProTable entries={allProOffense} label="1st Team All-Pro · Offense" />
              <AllProTable entries={allProDefense} label="1st Team All-Pro · Defense" />
            </div>
            {(allPro2Off.length > 0 || allPro2Def.length > 0) && (
              <div className="grid grid-2" style={{ marginBottom: 24 }}>
                <AllProTable entries={allPro2Off} label="2nd Team All-Pro · Offense" />
                <AllProTable entries={allPro2Def} label="2nd Team All-Pro · Defense" />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
