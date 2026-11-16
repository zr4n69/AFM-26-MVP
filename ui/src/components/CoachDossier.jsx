import { useMemo, useState } from 'react';
import { useLeague } from '../context/league-context.js';
import { CoachPortrait } from './Chrome.jsx';

function pct(wins, losses, ties = 0) {
  const games = wins + losses + ties;
  return games ? ((wins + ties * .5) / games).toFixed(3).replace(/^0/, '') : '.000';
}

export function CoachDossier({ onClose }) {
  const { coach, userTeam, teams, season, actions } = useLeague();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({ firstName: coach?.firstName || '', lastName: coach?.lastName || '', portraitIndex: coach?.portraitIndex || 0 }));
  const ledger = useMemo(() => coach?.seasonLedger || [], [coach?.seasonLedger]);
  const totals = useMemo(() => ledger.reduce((sum, entry) => ({
    wins: sum.wins + entry.wins, losses: sum.losses + entry.losses, ties: sum.ties + (entry.ties || 0),
    playoffWins: sum.playoffWins + (entry.playoffWins || 0), playoffLosses: sum.playoffLosses + (entry.playoffLosses || 0)
  }), { wins: 0, losses: 0, ties: 0, playoffWins: 0, playoffLosses: 0 }), [ledger]);
  const rank = [...teams].sort((a, b) => b.w - a.w || b.diff - a.diff).findIndex(team => team.id === userTeam.id) + 1;
  const championships = ledger.filter(entry => entry.champion).length;
  const best = [...ledger].sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))[0];
  const honors = coach?.honors || [];
  const office = coach?.frontOffice || {};

  function saveIdentity() {
    actions.updateCoachIdentity({ firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), portraitIndex: draft.portraitIndex });
    setEditing(false);
  }

  return (
    <div className="player-dossier-overlay coach-dossier-overlay" onClick={onClose}>
      <article className="coach-dossier" style={{ '--dossier-primary': userTeam.primary, '--dossier-secondary': userTeam.secondary }} onClick={e => e.stopPropagation()}>
        <header className="coach-dossier-header">
          <button className="player-dossier-close" onClick={onClose} aria-label="Close coach dossier">×</button>
          <CoachPortrait team={userTeam} coach={editing ? draft : coach} portraitIndex={editing ? draft.portraitIndex : coach?.portraitIndex} size={112} />
          <div><span>Career command file · Season {season}</span><h2>{coach?.firstName} {coach?.lastName}</h2><p>{coach?.title || 'Head Coach & General Manager'} · {userTeam.city} {userTeam.name}</p></div>
          <button className="btn" onClick={() => setEditing(value => !value)}>{editing ? 'Cancel edit' : 'Edit identity'}</button>
        </header>

        {editing && <section className="coach-edit-panel">
          <label>First name<input value={draft.firstName} onChange={e => setDraft({ ...draft, firstName: e.target.value })} /></label>
          <label>Surname<input value={draft.lastName} onChange={e => setDraft({ ...draft, lastName: e.target.value })} /></label>
          <div className="coach-edit-portraits">{Array.from({ length: 16 }, (_, index) => <button type="button" className={draft.portraitIndex === index ? 'selected' : ''} key={index} onClick={() => setDraft({ ...draft, portraitIndex: index })}><CoachPortrait team={userTeam} portraitIndex={index} size={52} /></button>)}</div>
          <button className="btn primary" disabled={!draft.firstName.trim() || !draft.lastName.trim()} onClick={saveIdentity}>Save identity</button>
        </section>}

        <div className="coach-dossier-body">
          <section className="coach-stat-block current"><div className="player-dossier-section-head"><h3>Current season</h3><span>Live</span></div><div className="coach-stat-grid">
            <div><b>{userTeam.w}-{userTeam.l}{userTeam.tie ? `-${userTeam.tie}` : ''}</b><span>Record</span></div><div><b>{userTeam.diff > 0 ? '+' : ''}{userTeam.diff}</b><span>Point diff.</span></div><div><b>#{rank || '—'}</b><span>League standing</span></div><div><b>{userTeam.w + userTeam.l ? (userTeam.w > userTeam.l ? 'Winning' : 'Grinding') : 'Opening'}</b><span>Season status</span></div>
          </div></section>
          <section className="coach-stat-block"><div className="player-dossier-section-head"><h3>Career record</h3><span>Tracked since S{coach?.trackingStartSeason || 1}</span></div><div className="coach-stat-grid">
            <div><b>{totals.wins}-{totals.losses}{totals.ties ? `-${totals.ties}` : ''}</b><span>Regular season</span></div><div><b>{pct(totals.wins, totals.losses, totals.ties)}</b><span>Win percentage</span></div><div><b>{totals.playoffWins}-{totals.playoffLosses}</b><span>Playoffs</span></div><div><b>{championships}</b><span>Championships</span></div><div><b>{ledger.filter(e => e.playoffWins + e.playoffLosses > 0).length}</b><span>Playoff berths</span></div><div><b>{best ? `${best.wins}-${best.losses}` : '—'}</b><span>Best season</span></div>
          </div></section>
          <section className="coach-stat-block"><div className="player-dossier-section-head"><h3>Front-office legacy</h3><span>Transactions</span></div><div className="coach-stat-grid compact">
            <div><b>{office.draftSelections || 0}</b><span>Draft picks</span></div><div><b>{office.firstRoundPicks || 0}</b><span>First-rounders</span></div><div><b>{office.tradesCompleted || 0}</b><span>Trades</span></div><div><b>{office.freeAgentSignings || 0}</b><span>FA signings</span></div>
          </div><div className="coach-identities"><span><small>Offense</small>{userTeam.strategy?.offensiveSystem || '—'}</span><span><small>Defense</small>{userTeam.strategy?.defensiveSystem || '—'}</span></div></section>
          <section className="coach-stat-block"><div className="player-dossier-section-head"><h3>Honors & milestones</h3><span>{honors.length} league honors</span></div><div className="player-awards">
            {honors.map((honor, index) => <span key={`${honor.type}-${index}`}>{honor.type === 'coachOfYear' ? 'Coach of the Year' : 'Turnaround Coach'} (S{honor.season})</span>)}
            {totals.wins >= 1 && <span>First career win</span>}{totals.wins >= 50 && <span>50 career wins</span>}{ledger.some(e => e.playoffWins + e.playoffLosses > 0) && <span>First playoff berth</span>}{championships > 0 && <span>First championship</span>}
            {!honors.length && totals.wins < 1 && <em>Career milestones will be filed here.</em>}
          </div></section>
          <section className="coach-stat-block ledger"><div className="player-dossier-section-head"><h3>Season ledger</h3><span>{ledger.length} completed</span></div>
            {ledger.length ? <div className="coach-ledger">{[...ledger].reverse().map(entry => <div key={entry.season}><b>S{entry.season}</b><span>{entry.wins}-{entry.losses}{entry.ties ? `-${entry.ties}` : ''}</span><span>{entry.playoffWins}-{entry.playoffLosses} playoffs</span><strong>{entry.postseason}</strong></div>)}</div> : <p className="player-dossier-empty">No completed seasons yet. Existing history unavailable before Season {coach?.trackingStartSeason || 1} is not estimated.</p>}
          </section>
        </div>
      </article>
    </div>
  );
}
