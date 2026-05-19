import { ROSTER_TEMPLATE } from "../data/constants.js";
import { createRng } from "../data/random.js";

const POSITIONAL_PREMIUMS = { QB: 15, EDGE: 15, OT: 12, WR: 10, CB: 10 };

export function calculateTradeValue(league, teamId, assets) {
  const team = league.teams.find(t => t.id === teamId);
  if (!team) return 0;

  let total = 0;

  for (const playerId of (assets.playerIds || [])) {
    const player = team.roster.find(p => p.id === playerId);
    if (!player) continue;
    const posPremium = POSITIONAL_PREMIUMS[player.position] || 0;
    const awardBonus = (player.awards?.length || 0) * 5;
    total +=
      player.overall * 3
      + (player.potentialStars || 1) * 8
      - player.age * 1.5
      + posPremium
      - (player.contract.capHit / 1_000_000) * 2
      + awardBonus;
  }

  for (const pickId of (assets.pickIds || [])) {
    const pick = league.draft.picks.find(p => p.id === pickId);
    if (!pick) continue;
    total += 200 * Math.exp(-0.04 * (pick.overallPick - 1));
  }

  return Math.round(total);
}

export function evaluateCpuTradeResponse(league, trade) {
  const rng = createRng(`trade-eval-${trade.id}-${league.currentSeason}`);

  const incomingValue = calculateTradeValue(league, trade.toTeamId, {
    playerIds: trade.offeredPlayerIds,
    pickIds: trade.offeredPickIds,
  });

  const outgoingValue = calculateTradeValue(league, trade.toTeamId, {
    playerIds: trade.requestedPlayerIds,
    pickIds: trade.requestedPickIds,
  });

  // Team context adjustments
  const cpuTeam = league.teams.find(t => t.id === trade.toTeamId);
  let adjustedIncoming = incomingValue;
  let adjustedOutgoing = outgoingValue;

  if (cpuTeam) {
    // Need bonus: if CPU team needs the position being offered
    const fromTeam = league.teams.find(t => t.id === trade.fromTeamId);
    for (const playerId of (trade.offeredPlayerIds || [])) {
      const player = fromTeam?.roster.find(p => p.id === playerId);
      if (player) {
        const posCount = cpuTeam.roster.filter(p => p.position === player.position).length;
        const target = ROSTER_TEMPLATE[player.position] || 1;
        if (posCount < target) adjustedIncoming *= 1.20;
      }
    }

    // Contender/rebuilder bias
    const s = cpuTeam.standings || {};
    const totalGames = (s.wins || 0) + (s.losses || 0) + (s.ties || 0);
    const winPct = totalGames > 0 ? (s.wins || 0) / totalGames : 0.5;

    if (winPct >= 0.6) {
      // Contender: values current talent more, discount picks
      for (const pickId of (trade.offeredPickIds || [])) {
        adjustedIncoming *= 0.85;
      }
    } else if (winPct <= 0.4) {
      // Rebuilder: values picks more, discount aging players
      for (const pickId of (trade.offeredPickIds || [])) {
        adjustedIncoming *= 1.15;
      }
    }
  }

  const ratio = adjustedOutgoing > 0 ? adjustedIncoming / adjustedOutgoing : 0;
  let response;
  let reason;

  if (ratio >= 0.9) {
    response = 'accepted';
    reason = 'Fair value trade';
  } else if (ratio >= 0.8) {
    response = rng.next() < 0.5 ? 'accepted' : 'rejected';
    reason = response === 'accepted' ? 'Close enough — deal' : 'Slightly below value';
  } else {
    response = 'rejected';
    reason = ratio >= 0.6 ? 'Need more to make this work' : 'Way below market value';
  }

  return {
    response,
    incomingValue: Math.round(adjustedIncoming),
    outgoingValue: Math.round(adjustedOutgoing),
    ratio: Math.round(ratio * 100),
    reason,
  };
}
