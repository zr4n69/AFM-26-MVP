import { useLeague } from '../context/LeagueContext.jsx';

export function Chyron({ season, week }) {
  const { teams, trades, phase, _engine: league } = useLeague();
  const teamName = id => teams.find(team => team.id === id)?.fullName || 'Unknown team';
  const recaps = (league.games || []).filter(game => game.played && game.boxScore).slice(-3).reverse().map(game => ({
    tag: 'RECAP',
    text: `${teamName(game.awayTeamId)} ${game.boxScore.away.points} · ${teamName(game.homeTeamId)} ${game.boxScore.home.points}`,
  }));
  const injuries = teams.flatMap(team => (team._engine?.roster || [])
    .filter(player => player.health?.status !== 'healthy')
    .map(player => ({
      tag: 'INJURY',
      text: `${team.fullName}: ${player.firstName} ${player.lastName} (${player.position}) ${player.health.status} · ${player.health.weeksRemaining} wk`,
    }))).slice(0, 3);
  const tradeItems = (trades || []).filter(trade => trade.status === 'completed').slice(-2).reverse().map(trade => ({
    tag: 'TRADE',
    text: `${teamName(trade.fromTeamId)} and ${teamName(trade.toTeamId)} completed a trade`,
  }));
  const tickerItems = [...recaps, ...tradeItems, ...injuries];
  if (tickerItems.length === 0) {
    tickerItems.push({ tag: 'LEAGUE', text: `Season ${season || 1} · ${phase === 'preseason' ? 'Training camp' : 'League operations underway'}` });
  }
  // Duplicate items for seamless marquee loop
  const items = [...tickerItems, ...tickerItems];

  return (
    <div className="chyron">
      <div className="chyron-brand">AFL</div>
      <div className="chyron-track-wrap">
        <div className="chyron-track">
          {items.map((item, i) => (
            <div key={i} className="chyron-item">
              <span className="chyron-tag">{item.tag}</span>
              <span className="chyron-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chyron-clock">
        S{season || 1} {phase === 'regularSeason' ? `W${week || 1}` : phase?.replace(/([A-Z])/g, ' $1').toUpperCase()}
      </div>
    </div>
  );
}
