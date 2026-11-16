import { LeagueProvider } from './context/LeagueContext.jsx';
import { GameShell } from './GameShell.jsx';

export default function GameSession({ league, slotIndex, onExitToMenu }) {
  return (
    <LeagueProvider key={slotIndex} initialLeague={league}>
      <GameShell slotIndex={slotIndex} onExitToMenu={onExitToMenu} />
    </LeagueProvider>
  );
}
