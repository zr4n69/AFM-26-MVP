import { useState } from 'react';
import { useLeague } from '../context/league-context.js';
import { Topbar, ColorBlock, OvrPill } from '../components/Chrome.jsx';
import { formatM } from '../components/formatting.js';

const OFFENSIVE_SYSTEMS = [
  { id: 'westCoast', short: 'West Coast', note: 'Three-receiver personnel. Favors outside zone, mesh, stick, slants, flood, and screens.' },
  { id: 'powerRun', short: 'Power Run', note: 'Two backs and two tight ends. Favors inside runs, power, counters, and play action.' },
  { id: 'spreadRpo', short: 'Spread RPO', note: 'Three-receiver personnel. Favors outside zone, RPO glance, mesh, slants, screens, and QB option.' },
  { id: 'verticalAirRaid', short: 'Vertical Air Raid', note: 'Four receivers and no starting tight end. Favors four verticals and draw concepts.' },
  { id: 'balancedPro', short: 'Balanced Pro', note: 'Two receivers and one tight end. Mixes inside zone, counter, play action, stick, flood, and draw.' },
];

function nextMatchup(league, team, teams, week) {
  const fallback = teams.find(candidate => candidate.id !== team.id) || team;
  const scheduled = league?.schedule?.find(entry => entry.week === week);
  const engineId = team?._engine?.id;
  const game = scheduled?.games?.find(entry => entry.homeTeamId === engineId || entry.awayTeamId === engineId);
  if (!game) return { opponent: fallback, venue: 'Matchup pending', isHome: true };
  const isHome = game.homeTeamId === engineId;
  const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
  return {
    opponent: teams.find(candidate => candidate._engine?.id === opponentId) || fallback,
    venue: isHome ? 'Home field' : 'On the road',
    isHome,
  };
}

function TacticalSketch({ system }) {
  const routes = {
    westCoast: ['M116 190C122 156 152 141 214 143', 'M618 190C612 150 576 125 520 124', 'M370 270c-54-2-96-20-124-54'],
    powerRun: ['M370 270c-50-4-91-25-119-63', 'M116 190c8-34 26-54 58-62', 'M618 190c-4-30-20-49-49-58'],
    spreadRpo: ['M370 270c62-3 107-27 132-73', 'M116 190c26-9 58-9 96 2', 'M618 190c-14-58-52-93-116-103'],
    verticalAirRaid: ['M116 190C114 125 129 82 162 52', 'M618 190C620 124 605 80 572 48', 'M290 195c-6-58 6-101 38-130', 'M450 195c8-58-4-101-36-130'],
    balancedPro: ['M116 190c20-42 54-66 102-72', 'M618 190c-18-46-54-73-106-81', 'M370 270c48-4 84-24 108-61'],
  };
  return (
    <svg className="tactical-sketch" viewBox="0 0 720 330" role="img" aria-label="Offensive game plan sketch">
      <defs>
        <filter id="marker-soft"><feGaussianBlur stdDeviation="0.35" /></filter>
        <marker id="route-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6" className="route-arrowhead" /></marker>
      </defs>
      <path className="board-yard" d="M32 52H688M32 112H688M32 172H688M32 232H688M32 292H688" />
      <path className="board-hash" d="M170 42v20m0 40v20m0 40v20m0 40v20m0 40v20M550 42v20m0 40v20m0 40v20m0 40v20m0 40v20" />
      <g className="offense-markers">
        {[250, 290, 330, 370, 410, 450, 490].map(x => <circle key={x} cx={x} cy="205" r="10" />)}
        <circle cx="370" cy="247" r="11" /><circle cx="370" cy="282" r="10" />
        <circle cx="116" cy="202" r="10" /><circle cx="618" cy="202" r="10" />
      </g>
      <g className="defense-markers">
        {[250, 310, 370, 430, 490].map(x => <path key={x} d={`M${x - 9} 151l18 18m0-18l-18 18`} />)}
        <path d="M195 115l18 18m0-18l-18 18M515 115l18 18m0-18l-18 18M290 78l18 18m0-18l-18 18M430 78l18 18m0-18l-18 18" />
      </g>
      <g className="route-lines" filter="url(#marker-soft)">
        {(routes[system] || routes.balancedPro).map((path, index) => <path key={index} d={path} markerEnd="url(#route-arrowhead)" />)}
      </g>
    </svg>
  );
}

function PrepItem({ done, label, detail, onClick }) {
  return (
    <button className={`prep-item ${done ? 'done' : ''}`} onClick={onClick}>
      <span className="prep-check" aria-hidden="true">{done ? '✓' : ''}</span>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <span className="prep-arrow">›</span>
    </button>
  );
}

function PlayerMagnet({ player, onClick }) {
  if (!player) return null;
  return (
    <button className="player-magnet" onClick={onClick} title={`Open ${player.name} in roster`}>
      <span className="magnet-pos">{player.pos}</span>
      <span className="magnet-name">{player.last?.toUpperCase() || player.name.toUpperCase()}</span>
      <OvrPill ovr={player.ovr} className="magnet-ovr" />
    </button>
  );
}

export function ScreenDashboard({ onNav }) {
  const { userTeam, teams, week, season, phase, draft, hallOfFame, offseasonEvents, training, actions } = useLeague();
  const team = userTeam;
  const currentSystem = team?.strategy?.offensiveSystem || 'balancedPro';
  const [selectedSystem, setSelectedSystem] = useState(currentSystem);

  if (!team) return null;

  const league = actions.getRawLeague();
  const isOffseason = phase === 'offseason';
  const freeAgencyComplete = !!offseasonEvents?.freeAgencyComplete;
  const draftComplete = draft?.status === 'completed';
  const hofEligible = hallOfFame?.eligiblePlayers || [];
  const hofComplete = hofEligible.length === 0 || !!hallOfFame?.ballotsByTeamId?.[team.id]?.length;
  const campComplete = !!training?.camp?.completed;
  const isPreseasonCamp = phase === 'preseason' && week === 0 && !campComplete;
  const canStartNextSeason = isOffseason && freeAgencyComplete && draftComplete && hofComplete;
  const matchup = nextMatchup(league, team, teams, week + 1);
  const opponent = matchup.opponent;
  const confTeams = teams.filter(candidate => candidate.conf === team.conf).sort((a, b) => b.w - a.w || b.diff - a.diff);
  const rank = Math.max(1, confTeams.findIndex(candidate => candidate.id === team.id) + 1);
  const injuries = team.roster.filter(player => player.injStatus).sort((a, b) => b.ovr - a.ovr);
  const stars = [...team.roster].sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  const selectedOption = OFFENSIVE_SYSTEMS.find(option => option.id === selectedSystem) || OFFENSIVE_SYSTEMS[4];
  const prepCleared = isOffseason
    ? [freeAgencyComplete, draftComplete, hofComplete].filter(Boolean).length
    : isPreseasonCamp ? (campComplete ? 3 : 2) : 1 + (injuries.length === 0 ? 1 : 0);
  const primaryAction = isOffseason
    ? { label: canStartNextSeason ? 'Open training camp' : 'Continue offseason', target: !freeAgencyComplete ? 'fa' : !draftComplete ? 'draft' : !hofComplete ? 'hof' : 'dashboard' }
    : isPreseasonCamp ? { label: 'Run training camp', target: 'training' } : { label: `Prepare Week ${week + 1}`, target: 'gameweek' };

  function runPrimaryAction() {
    if (isOffseason && canStartNextSeason) { actions.startNextSeason(); return; }
    onNav(primaryAction.target);
  }

  function applyOffensiveSystem() {
    if (selectedSystem === currentSystem) return;
    actions.updateStrategy(team._engine?.id, { offensiveSystem: selectedSystem });
  }

  return (
    <>
      <Topbar
        crumb={`Coach's office / ${team.city} ${team.name}`}
        title="Franchise HQ"
        pill={isOffseason ? `Offseason · Season ${season}` : isPreseasonCamp ? `Camp · Season ${season}` : `Week ${week + 1} · Season ${season}`}
        actions={<button className="btn primary hq-primary-action" onClick={runPrimaryAction}>{primaryAction.label} →</button>}
      />
      <main className="page hq-page" style={{ '--team-primary': team.primary, '--team-secondary': team.secondary }}>
        <section className="matchup-rail" aria-label="Next matchup">
          <div className="matchup-team our-team"><ColorBlock team={team} size={48} /><div><span>{team.city}</span><strong>{team.name}</strong></div></div>
          <div className="matchup-center"><span className="week-label">{isOffseason ? 'Front office calendar' : `Week ${week + 1} · ${matchup.venue}`}</span><b>{isOffseason ? 'Build the next roster' : matchup.isHome ? 'VS' : 'AT'}</b><small>{team.w}-{team.l} · {rank}{rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} {team.conf}</small></div>
          <div className="matchup-team opponent-team"><div><span>{opponent.city}</span><strong>{opponent.name}</strong></div><ColorBlock team={opponent} size={48} /></div>
        </section>

        <div className="office-workspace">
          <section className="gameplan-board">
            <div className="board-frame">
              <header className="board-heading">
                <div><span className="board-kicker">Offensive system · Current: {OFFENSIVE_SYSTEMS.find(option => option.id === currentSystem)?.short}</span><h2>{selectedOption.short}</h2></div>
                <button className="board-link" onClick={() => onNav('strategy')}>Open Strategy ↗</button>
              </header>
              <div className="board-canvas">
                <TacticalSketch system={selectedSystem} />
                <p className="coach-note">{selectedOption.note}</p>
                <div className="focus-selector" role="group" aria-label="Offensive system">
                  {OFFENSIVE_SYSTEMS.map(option => <button key={option.id} className={selectedSystem === option.id ? 'selected' : ''} onClick={() => setSelectedSystem(option.id)} aria-pressed={selectedSystem === option.id}><span>{selectedSystem === option.id ? '●' : '○'}</span>{option.short}</button>)}
                </div>
              </div>
              <footer className="marker-tray"><span className="marker marker-blue" /><span className="marker marker-red" /><span className="marker marker-black" /><span className="tray-label">OFFENSE / BLUE · DEFENSE / RED</span><button onClick={applyOffensiveSystem} disabled={selectedSystem === currentSystem}>{selectedSystem === currentSystem ? 'System active' : `Apply ${selectedOption.short}`}</button></footer>
            </div>
            <div className="magnet-rack">
              <div className="rack-label">Core personnel</div>
              {stars.map(player => <PlayerMagnet key={player.id} player={player} onClick={() => onNav('roster')} />)}
              <button className="rack-more" onClick={() => onNav('depth')}>Depth board →</button>
            </div>
          </section>

          <aside className="office-documents">
            <article className="scouting-sheet">
              <span className="binder-clip" aria-hidden="true" />
              <header><span>MATCHUP BREAKDOWN · WK {week + 1}</span><b>OPPONENT FILE</b></header>
              <div className="scout-team"><ColorBlock team={opponent} size={54} /><div><small>{opponent.city}</small><h3>{opponent.name}</h3><p>{opponent.w}-{opponent.l} · {opponent.conf}</p></div><div className="grade-stamp">{opponent.ovr >= 84 ? 'A' : opponent.ovr >= 78 ? 'B' : 'C'}<small>GRADE</small></div></div>
              <div className="scout-ratings"><span><b>{opponent.offRating}</b> OFF</span><span><b>{opponent.defRating}</b> DEF</span><span className="scout-overall"><OvrPill ovr={opponent.ovr} /> OVR</span></div>
              <div className="scout-insight"><span>TOP LINE</span><p>{opponent.defRating >= opponent.offRating ? 'Their defense sets the terms. Create width early and make the front run.' : 'Their offense carries them. Shorten the game and deny explosive downs.'}</p></div>
              <button className="paper-action" onClick={() => onNav('gameweek')}>Open matchup preview <span>↗</span></button>
            </article>

            <article className="prep-sheet">
              <header><span>Preparation</span><b>{isOffseason ? 'Front office board' : `${prepCleared} / 3 cleared`}</b></header>
              {isOffseason ? <>
                <PrepItem done={freeAgencyComplete} label="Free agency" detail={freeAgencyComplete ? 'Board closed' : 'Required'} onClick={() => onNav('fa')} />
                <PrepItem done={draftComplete} label="Draft room" detail={draftComplete ? 'Class signed' : 'Required'} onClick={() => onNav('draft')} />
                <PrepItem done={hofComplete} label="Hall ballot" detail={hofComplete ? 'Submitted' : 'Required'} onClick={() => onNav('hof')} />
              </> : isPreseasonCamp ? <>
                <PrepItem done={false} label="Training camp" detail="Required before Week 1" onClick={() => onNav('training')} />
                <PrepItem done label="Roster review" detail={`${team.roster.length} players`} onClick={() => onNav('roster')} />
                <PrepItem done label="Scheme install" detail="Systems carried forward" onClick={() => onNav('strategy')} />
              </> : <>
                <PrepItem done label="Review matchup" detail={`${team.abbr} vs ${opponent.abbr}`} onClick={() => onNav('gameweek')} />
                <PrepItem done={injuries.length === 0} label="Medical check" detail={injuries.length ? `${injuries.length} player${injuries.length === 1 ? '' : 's'} flagged` : 'No restrictions'} onClick={() => onNav('roster')} />
                <PrepItem done={!!team.strategy?.offensiveSystem} label="Review strategy" detail={`${OFFENSIVE_SYSTEMS.find(option => option.id === currentSystem)?.short} offense`} onClick={() => onNav('strategy')} />
              </>}
              <div className="prep-footer"><span>Cap room</span><b>{formatM(team.capSpace)}</b><span>Morale</span><b>{team.morale}</b></div>
            </article>
          </aside>
        </div>
      </main>
    </>
  );
}
