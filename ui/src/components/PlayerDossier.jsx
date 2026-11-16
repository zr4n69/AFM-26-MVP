import { Avatar, InjBadge, TraitBadge } from './Chrome.jsx';
import { formatM } from './formatting.js';

const AWARD_NAMES = { mvp: 'MVP', opoy: 'Offensive Player of the Year', dpoy: 'Defensive Player of the Year', offensiveROY: 'Offensive Rookie of the Year', defensiveROY: 'Defensive Rookie of the Year', firstTeamAllPro: 'First Team All-Pro', secondTeamAllPro: 'Second Team All-Pro' };
const STAT_NAMES = { passingYards: 'Pass Yds', passingTouchdowns: 'Pass TD', interceptions: 'INT', rushingYards: 'Rush Yds', rushingTouchdowns: 'Rush TD', receivingYards: 'Rec Yds', receivingTouchdowns: 'Rec TD', receptions: 'Rec', sacks: 'Sacks', tackles: 'Tackles', forcedFumbles: 'FF' };

function ratingColor(value) {
  if (value >= 90) return '#9c7628'; if (value >= 80) return '#3d7555'; if (value >= 70) return '#317da0'; if (value >= 60) return '#747b76'; return '#a44842';
}

export function PlayerDossier({ player, team, prospect = false, onClose, primaryAction, primaryLabel, secondaryAction, secondaryLabel, trackingStartSeason }) {
  if (!player) return null;
  const engine = prospect ? {} : (player._engine || {});
  const traits = player.traits;
  const attrs = prospect ? {} : (player.attrs || engine.ratings || {});
  const seasonStats = engine.stats || player.stats || {};
  const careerStats = player.careerStats || engine.careerStats || {};
  const awards = engine.awards || [];
  const championships = engine.championships || [];
  const origin = engine.origin;
  const ovr = player.ovr;
  const potential = player.potential;
  const statEntries = Object.entries(seasonStats).filter(([, value]) => typeof value === 'number' && value > 0);
  const careerEntries = Object.entries(careerStats).filter(([, value]) => typeof value === 'number' && value > 0);
  return <div className="player-dossier-overlay" onClick={onClose}>
    <article className="player-dossier shared-player-dossier" style={{ '--dossier-primary': team?.primary || '#253b36', '--dossier-secondary': team?.secondary || '#d8d2c3' }} onClick={e => e.stopPropagation()}>
      <header className="player-dossier-header">
        {team?.logo && <img className="player-dossier-team-mark" src={team.logo} alt="" />}
        <div className="player-dossier-kicker">{prospect ? 'Draft evaluation file' : `Personnel file${team ? ` · ${team.city} ${team.name}` : ''}`}</div>
        <button className="player-dossier-close" onClick={onClose}>×</button>
        <Avatar player={player} team={team} size={82} />
        <div className="player-dossier-identity"><h2>{player.name}</h2><p>{player.pos} · Age {player.age}{prospect ? ` · ${player.college || 'College prospect'}` : ''}</p><div className="player-dossier-trait-strip">{traits ? (traits.length ? traits.map(t => <TraitBadge key={t.name || t} trait={t.name || t} />) : <span>No special traits</span>) : <span>Traits not scouted · ?</span>}</div></div>
        <div className="player-dossier-score" style={{ '--overall-color': ratingColor(ovr || 0) }}><div className="player-overall-hero"><span>OVR</span><strong>{ovr ?? `${player.ratingRange?.[0] ?? '?'}–${player.ratingRange?.[1] ?? '?'}`}</strong><i>{ovr == null ? 'Projected range' : 'Overall grade'}</i></div><div className="player-potential-hero"><span>Potential ceiling</span><div className="player-potential-meter">{Array.from({ length: 5 }, (_, i) => <i className={potential != null && i < potential ? 'filled' : ''} key={i} />)}</div><b>{potential != null ? `${potential} / 5` : '? / 5'}</b></div></div>
      </header>
      <div className="player-dossier-body">
        <aside className="player-dossier-sidebar">
          {prospect ? <><section><h3>Known production</h3><p>{player.collegeProduction ? `${player.collegeProduction.games || 0} college games${player.collegeProduction.allConference ? ' · All-Conference' : ''}${player.collegeProduction.awards?.length ? ` · ${player.collegeProduction.awards.join(', ')}` : ''}` : player.college || 'College production filed with league scouting.'}</p></section><section><h3>Combine card</h3><dl className="player-contract-grid">{Object.entries(player.combine || {}).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl></section></> : <section><h3>Contract sheet</h3><dl className="player-contract-grid"><div><dt>Salary</dt><dd>{formatM(player.salary || 0)}<small>/yr</small></dd></div><div><dt>Cap hit</dt><dd>{formatM(player.cap || 0)}<small>/yr</small></dd></div><div><dt>Years left</dt><dd>{player.years ?? 0}</dd></div><div><dt>Status</dt><dd><InjBadge status={player.injStatus} /></dd></div></dl></section>}
          <section><h3>Career file</h3><p>{origin?.type === 'draft' ? `Drafted Round ${origin.round}, Pick ${origin.overallPick || '—'} · Season ${origin.season}` : origin?.type === 'undrafted' ? `Undrafted free agent · Season ${origin.season}` : 'Pre-career player'}</p>{trackingStartSeason && <small>Achievements tracked since Season {trackingStartSeason}</small>}</section>
        </aside>
        <main className="player-dossier-evaluation">
          {prospect && <section><div className="player-dossier-section-head"><h3>Scouting status</h3><span>{player.revealLevel || 'Unscouted'}</span></div><p className="player-dossier-empty">{!player.revealLevel ? 'Overall remains a projected range. Traits and potential are unknown.' : player.revealLevel === 'surface' ? 'Estimated overall unlocked. Traits and potential remain unknown.' : player.revealLevel === 'standard' ? 'Estimated overall and traits unlocked. Potential remains unknown.' : 'Full available scouting report unlocked.'}</p></section>}
          {!!Object.keys(attrs).length && <section><div className="player-dossier-section-head"><h3>Scouting grades</h3><span>{Object.keys(attrs).length} attributes</span></div><div className="player-rating-grid">{Object.entries(attrs).map(([key, value]) => <div className="player-rating" key={key} style={{ '--rating-color': ratingColor(value) }}><span>{key.replace(/([A-Z])/g, ' $1')}</span><b>{value}</b><i><em style={{ width: `${value}%` }} /></i></div>)}</div></section>}
          {!!statEntries.length && <section><div className="player-dossier-section-head"><h3>Season production</h3><span>Current</span></div><div className="player-stat-grid">{statEntries.map(([key, value]) => <div key={key}><b>{value.toLocaleString()}</b><span>{STAT_NAMES[key] || key}</span></div>)}</div></section>}
          {!!careerEntries.length && <section><div className="player-dossier-section-head"><h3>Career production</h3><span>All seasons</span></div><div className="player-stat-grid">{careerEntries.map(([key, value]) => <div key={key}><b>{value.toLocaleString()}</b><span>{STAT_NAMES[key] || key}</span></div>)}</div></section>}
          <section><div className="player-dossier-section-head"><h3>Achievements</h3><span>{awards.length + championships.length} recorded</span></div><div className="player-awards">{awards.map((award, i) => <span key={i}>{AWARD_NAMES[award.awardType] || award.awardType || award.type || award} {award.season ? `(S${award.season})` : ''}</span>)}{championships.map((ring, i) => <span key={`ring-${i}`}>League Champion (S{ring.season})</span>)}{!awards.length && !championships.length && <em>No recorded honors yet.</em>}</div></section>
        </main>
      </div>
      <footer className="player-dossier-footer"><div>{secondaryAction && <button className="btn" onClick={secondaryAction}>{secondaryLabel}</button>}</div><div>{primaryAction && <button className="btn primary" onClick={primaryAction}>{primaryLabel}</button>}<button className="btn" onClick={onClose}>Close file</button></div></footer>
    </article>
  </div>;
}
