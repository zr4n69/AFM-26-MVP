import { ROSTER_TEMPLATE, OFFENSIVE_STARTERS, DEFENSIVE_STARTERS } from "../data/constants.js";
import { createRng } from "../data/random.js";

const POSITIONAL_PREMIUMS = { QB: 15, EDGE: 15, OT: 12, WR: 10, CB: 10 };

/**
 * Calculate raw trade value for a set of player/pick assets from a specific team's roster.
 */
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

// ─── Urgency detection helpers ───────────────────────────────────────

/**
 * Returns scheme-aware starter counts for a team's current strategy.
 */
function getTeamSchemeStarters(team) {
  const off = OFFENSIVE_STARTERS[team.strategy?.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro;
  const def = DEFENSIVE_STARTERS[team.strategy?.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone;
  const result = {};
  for (const pos of Object.keys(ROSTER_TEMPLATE)) {
    result[pos] = (off[pos] || 0) + (def[pos] || 0);
  }
  return result;
}

/**
 * 1. Missing required-position starter
 * If the CPU team has 0 players at a position that requires starters, incoming
 * players at that position get a large bonus.
 */
function missingStarterBonus(cpuTeam, incomingPlayers) {
  let bonus = 0;
  const schemeStarters = getTeamSchemeStarters(cpuTeam);
  for (const player of incomingPlayers) {
    const needed = schemeStarters[player.position] || 0;
    if (needed === 0) continue;
    const onRoster = cpuTeam.roster.filter(p => p.position === player.position).length;
    if (onRoster === 0) {
      // No one at a starting position — desperate need
      bonus += 0.40;
    } else if (onRoster < needed) {
      // Below starter count — moderate need
      bonus += 0.20;
    }
  }
  return bonus;
}

/**
 * 2. Scheme-critical player gap
 * Uses pre-computed rosterNeeds.schemeNeeds (positions below scheme template + 1 backup).
 * Also checks if incoming players fill an injury hole at a starter spot.
 */
function schemeCriticalBonus(cpuTeam, incomingPlayers) {
  const schemeNeeds = cpuTeam.rosterNeeds?.schemeNeeds || [];
  const injuryNeeds = cpuTeam.rosterNeeds?.injuryNeeds || [];
  let bonus = 0;

  for (const player of incomingPlayers) {
    const schemeGap = schemeNeeds.find(n => n.position === player.position);
    if (schemeGap) {
      // Scale by deficit size: 1 gap = 0.10, 2+ gaps = 0.15
      bonus += schemeGap.deficit >= 2 ? 0.15 : 0.10;
    }
    if (injuryNeeds.includes(player.position)) {
      bonus += 0.10;
    }
  }
  return bonus;
}

/**
 * 3. Cap deficit reduction motivation
 * If CPU is over the cap or tight, they value outgoing expensive players (cap relief)
 * and are wary of taking on expensive incoming players.
 */
function capDeficitAdjustment(cpuTeam, incomingPlayers, outgoingPlayers) {
  const capSpace = cpuTeam.contractSummary?.capSpace ?? 0;
  const salaryCap = cpuTeam.salaryCap || 200_000_000;
  let adjustment = 0;

  if (capSpace < 0) {
    // Over the cap — highly motivated to dump salary
    const incomingCap = incomingPlayers.reduce((s, p) => s + (p.contract?.capHit || 0), 0);
    const outgoingCap = outgoingPlayers.reduce((s, p) => s + (p.contract?.capHit || 0), 0);
    const netCapRelief = outgoingCap - incomingCap;
    if (netCapRelief > 0) {
      // Trade creates cap space — boost willingness proportional to relief
      adjustment += Math.min(0.25, (netCapRelief / salaryCap) * 3);
    } else {
      // Trade makes cap worse — penalty
      adjustment -= 0.15;
    }
  } else if (capSpace < salaryCap * 0.05) {
    // Cap is tight — mild preference for cap relief
    const incomingCap = incomingPlayers.reduce((s, p) => s + (p.contract?.capHit || 0), 0);
    const outgoingCap = outgoingPlayers.reduce((s, p) => s + (p.contract?.capHit || 0), 0);
    if (outgoingCap > incomingCap) {
      adjustment += 0.08;
    }
  }
  return adjustment;
}

/**
 * 4. Contender adding production
 * Winning teams (≥0.55 win%) value proven talent (high OVR, prime age) over picks/youth.
 */
function contenderProductionBonus(cpuTeam, incomingPlayers, incomingPicks) {
  const s = cpuTeam.standings || {};
  const totalGames = (s.wins || 0) + (s.losses || 0) + (s.ties || 0);
  const winPct = totalGames > 0 ? (s.wins || 0) / totalGames : 0.5;
  if (winPct < 0.55) return 0;

  let bonus = 0;
  const contenderStrength = Math.min(1, (winPct - 0.55) / 0.25); // 0 at .55, 1 at .80

  for (const player of incomingPlayers) {
    // Value proven production: high OVR players in their prime
    if (player.overall >= 78 && player.age <= 30) {
      bonus += 0.12 * contenderStrength;
    } else if (player.overall >= 72 && player.age <= 28) {
      bonus += 0.06 * contenderStrength;
    }
  }

  // Contenders discount picks (uncertain returns)
  for (const _pick of incomingPicks) {
    bonus -= 0.08 * contenderStrength;
  }

  return bonus;
}

/**
 * 5. Rebuilder collecting picks / youth
 * Losing teams (≤0.45 win%) value draft picks and young players with upside,
 * discount aging veterans.
 */
function rebuilderYouthBonus(cpuTeam, incomingPlayers, incomingPicks) {
  const s = cpuTeam.standings || {};
  const totalGames = (s.wins || 0) + (s.losses || 0) + (s.ties || 0);
  const winPct = totalGames > 0 ? (s.wins || 0) / totalGames : 0.5;
  if (winPct > 0.45) return 0;

  let bonus = 0;
  const rebuilderStrength = Math.min(1, (0.45 - winPct) / 0.25); // 0 at .45, 1 at .20

  // Rebuilders love picks
  for (const _pick of incomingPicks) {
    bonus += 0.12 * rebuilderStrength;
  }

  for (const player of incomingPlayers) {
    // Young players with high potential
    if (player.age <= 25 && (player.potentialStars || 1) >= 3) {
      bonus += 0.10 * rebuilderStrength;
    }
    // Aging vets on big contracts are unwanted
    if (player.age >= 30 && player.overall < 80) {
      bonus -= 0.10 * rebuilderStrength;
    }
  }

  return bonus;
}

// ─── Main evaluation ──────────────────────────────────────────────────

export function evaluateCpuTradeResponse(league, trade) {
  // Use trade counter + season + team IDs for better RNG diversity
  const rng = createRng(`trade-${trade.id}-s${league.currentSeason}-${trade.fromTeamId}-${trade.toTeamId}`);

  // Base value calculation
  const incomingValue = calculateTradeValue(league, trade.fromTeamId, {
    playerIds: trade.offeredPlayerIds,
    pickIds: trade.offeredPickIds,
  });

  const outgoingValue = calculateTradeValue(league, trade.toTeamId, {
    playerIds: trade.requestedPlayerIds,
    pickIds: trade.requestedPickIds,
  });

  const cpuTeam = league.teams.find(t => t.id === trade.toTeamId);
  if (!cpuTeam) {
    return { response: 'rejected', incomingValue, outgoingValue, ratio: 0, reason: 'Team not found' };
  }

  // Resolve actual player/pick objects for urgency checks
  const fromTeam = league.teams.find(t => t.id === trade.fromTeamId);
  const incomingPlayers = (trade.offeredPlayerIds || [])
    .map(id => fromTeam?.roster.find(p => p.id === id))
    .filter(Boolean);
  const outgoingPlayers = (trade.requestedPlayerIds || [])
    .map(id => cpuTeam.roster.find(p => p.id === id))
    .filter(Boolean);
  const incomingPicks = (trade.offeredPickIds || [])
    .map(id => league.draft.picks.find(p => p.id === id))
    .filter(Boolean);

  // ── Compute urgency bonuses (additive to ratio) ──
  const urgency = {
    missingStarter:    missingStarterBonus(cpuTeam, incomingPlayers),
    schemeCritical:    schemeCriticalBonus(cpuTeam, incomingPlayers),
    capRelief:         capDeficitAdjustment(cpuTeam, incomingPlayers, outgoingPlayers),
    contenderProd:     contenderProductionBonus(cpuTeam, incomingPlayers, incomingPicks),
    rebuilderYouth:    rebuilderYouthBonus(cpuTeam, incomingPlayers, incomingPicks),
  };

  // Basic positional need bonus (original logic, now smaller since scheme/starter bonuses cover more)
  let positionalNeedBonus = 0;
  for (const player of incomingPlayers) {
    const posCount = cpuTeam.roster.filter(p => p.position === player.position).length;
    const target = ROSTER_TEMPLATE[player.position] || 1;
    if (posCount < target) positionalNeedBonus += 0.08;
  }

  const totalBonus = positionalNeedBonus
    + urgency.missingStarter
    + urgency.schemeCritical
    + urgency.capRelief
    + urgency.contenderProd
    + urgency.rebuilderYouth;

  // Cap total urgency bonus so it can't make terrible trades acceptable
  const clampedBonus = Math.min(0.45, Math.max(-0.20, totalBonus));

  const rawRatio = outgoingValue > 0 ? incomingValue / outgoingValue : 0;
  const effectiveRatio = rawRatio + clampedBonus;

  // ── Acceptance decision with smooth curve ──
  // Instead of hard thresholds, use a probability curve:
  //   effectiveRatio >= 1.0  → 95% accept (near-certain)
  //   effectiveRatio ~= 0.85 → ~65% accept
  //   effectiveRatio ~= 0.70 → ~25% accept
  //   effectiveRatio < 0.55  → always reject
  let acceptProb;
  let reason;

  if (effectiveRatio >= 1.0) {
    acceptProb = 0.95;
    reason = 'Great value — deal done';
  } else if (effectiveRatio >= 0.55) {
    // Smooth sigmoid-like curve between 0.55 and 1.0
    // Maps 0.55→0.05, 0.70→0.25, 0.85→0.65, 0.95→0.85
    const t = (effectiveRatio - 0.55) / 0.45; // 0 to 1
    acceptProb = 0.05 + 0.90 * (t * t * (3 - 2 * t)); // smoothstep
    reason = effectiveRatio >= 0.85
      ? 'Close to fair value'
      : effectiveRatio >= 0.70
        ? 'Below market but fills a need'
        : 'Significant gap in value';
  } else {
    acceptProb = 0;
    reason = 'Way below market value';
  }

  // Add slight noise to avoid perfectly deterministic outcomes
  const roll = rng.next();
  const response = roll < acceptProb ? 'accepted' : 'rejected';

  if (response === 'accepted' && effectiveRatio < 0.85) {
    reason = buildAcceptReason(urgency);
  } else if (response === 'rejected' && effectiveRatio >= 0.85) {
    reason = 'Close, but not quite enough';
  }

  return {
    response,
    incomingValue: Math.round(incomingValue),
    outgoingValue: Math.round(outgoingValue),
    ratio: Math.round(rawRatio * 100),
    effectiveRatio: Math.round(effectiveRatio * 100),
    reason,
    urgency,
  };
}

/**
 * Build a human-readable reason when urgency triggers push an otherwise
 * below-value trade to acceptance.
 */
function buildAcceptReason(urgency) {
  const reasons = [];
  if (urgency.missingStarter > 0.15) reasons.push('fills a critical roster hole');
  else if (urgency.missingStarter > 0) reasons.push('addresses a positional need');
  if (urgency.schemeCritical > 0.1) reasons.push('fits our scheme');
  if (urgency.capRelief > 0.1) reasons.push('helps our cap situation');
  if (urgency.contenderProd > 0.05) reasons.push('adds proven production for a push');
  if (urgency.rebuilderYouth > 0.05) reasons.push('brings youth and draft capital');
  if (reasons.length === 0) return 'Decided to take the deal';
  return reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1);
}
