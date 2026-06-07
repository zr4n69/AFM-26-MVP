import { ROSTER_TEMPLATE, OFFENSIVE_STARTERS, DEFENSIVE_STARTERS } from "../data/constants.js";
import { createRng } from "../data/random.js";

const POSITIONAL_PREMIUMS = { QB: 15, EDGE: 15, OT: 12, WR: 10, CB: 10 };

const POTENTIAL_CEILINGS = { 1: 64, 2: 72, 3: 79, 4: 89, 5: 99 };

export const BUILD_PHASES = Object.freeze({
  REBUILDING: "rebuilding",
  RETOOLING: "retooling",
  BALANCED: "balanced",
  CONTENDING: "contending",
  ALL_IN: "allIn"
});

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
    total += calculatePlayerTradeValue(player);
  }

  for (const pickId of (assets.pickIds || [])) {
    const pick = league.draft.picks.find(p => p.id === pickId);
    if (!pick) continue;
    total += calculateDraftPickTradeValue(pick);
  }

  return Math.round(total);
}

function calculatePlayerTradeValue(player) {
  const overall = player.overall || 0;
  const age = player.age || 30;
  const positionPremium = POSITIONAL_PREMIUMS[player.position] || 0;
  const capHitM = (player.contract?.capHit || 0) / 1_000_000;
  const ceiling = player.development?.potentialCeiling ?? POTENTIAL_CEILINGS[player.potentialStars || 1] ?? overall;
  const growthRoom = Math.max(0, ceiling - overall);

  const productionValue =
    Math.max(0, overall - 58) * 5
    + Math.max(0, overall - 72) * 9
    + Math.max(0, overall - 82) * 14;
  const upsideValue = age <= 24 ? growthRoom * 3 : age <= 27 ? growthRoom * 1.5 : age <= 29 ? growthRoom * 0.5 : 0;
  const ageAdjustment = age <= 24 ? 16 : age <= 27 ? 8 : age <= 29 ? 0 : age <= 31 ? -15 : age <= 33 ? -32 : -45;
  const declinePenalty = age >= 30 && growthRoom <= 3 ? 15 : 0;
  const lowCeilingVeteranPenalty = age >= 32 && overall < 78 ? 8 : 0;
  const contractPenalty = capHitM * (overall >= 80 ? 1.2 : 2);
  const awardBonus = (player.awards?.length || 0) * 25;

  return Math.max(0, Math.round(
    productionValue
    + upsideValue
    + ageAdjustment
    + positionPremium
    + awardBonus
    - declinePenalty
    - lowCeilingVeteranPenalty
    - contractPenalty
  ));
}

function calculateDraftPickTradeValue(pick) {
  const overallPick = pick.overallPick || 80;
  if (overallPick <= 16) {
    return 520 - (overallPick - 1) * 18;
  }
  if (overallPick <= 32) {
    return 170 - (overallPick - 17) * 5;
  }
  return Math.max(20, Math.round(95 * Math.exp(-0.035 * (overallPick - 33))));
}

export function assessTeamBuildPhase(league, team) {
  const winPct = teamWinPct(team, league);
  const rosterRating = averageTopRosterRating(team);
  const youngCore = team.roster.filter((player) =>
    player.age <= 25
    && (player.overall >= 72 || (player.potentialStars || 1) >= 4)
  ).length;
  const veteranCore = team.roster.filter((player) =>
    player.age >= 28
    && player.age <= 32
    && player.overall >= 78
  ).length;
  const capSpace = team.contractSummary?.capSpace ?? 0;
  const capFlexibility = Math.max(-0.25, Math.min(0.35, capSpace / (team.salaryCap || 200_000_000)));
  const recentPlayoff = league.seasonHistory?.at(-1)?.standings?.some((standing) =>
    standing.teamId === team.id && (standing.winPct ?? 0) >= 0.6
  ) ?? false;

  const contentionScore =
    (winPct - 0.5) * 2
    + (rosterRating - 72) / 12
    + Math.min(0.35, veteranCore * 0.055)
    + (recentPlayoff ? 0.15 : 0);
  const rebuildScore =
    (0.5 - winPct) * 2
    + (72 - rosterRating) / 12
    + Math.max(0, 0.16 - capFlexibility) * 0.5
    - Math.min(0.25, youngCore * 0.035);

  let phase = BUILD_PHASES.BALANCED;
  if (contentionScore >= 0.92 && winPct >= 0.62) phase = BUILD_PHASES.ALL_IN;
  else if (contentionScore >= 0.48 && winPct >= 0.54) phase = BUILD_PHASES.CONTENDING;
  else if (rebuildScore >= 0.72 || winPct <= 0.32) phase = BUILD_PHASES.REBUILDING;
  else if (rebuildScore >= 0.28 || winPct <= 0.44) phase = BUILD_PHASES.RETOOLING;

  return {
    phase,
    winPct,
    rosterRating,
    youngCore,
    veteranCore,
    capFlexibility,
    contentionStrength: Math.max(0, Math.min(1, contentionScore)),
    rebuildStrength: Math.max(0, Math.min(1, rebuildScore))
  };
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

function teamWinPct(team, league) {
  const s = team.standings || {};
  const totalGames = (s.wins || 0) + (s.losses || 0) + (s.ties || 0);
  if (totalGames > 0) return ((s.wins || 0) + (s.ties || 0) * 0.5) / totalGames;

  const history = league.seasonHistory?.at(-1)?.standings?.find((standing) => standing.teamId === team.id);
  return history?.winPct ?? 0.5;
}

function averageTopRosterRating(team) {
  const core = [...team.roster]
    .filter((player) => player.position !== "K" && player.position !== "P")
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 22);
  if (core.length === 0) return 0;
  return core.reduce((sum, player) => sum + (player.overall || 0), 0) / core.length;
}

function positionNeedFit(team, player) {
  const schemeStarters = getTeamSchemeStarters(team);
  const neededStarters = schemeStarters[player.position] || 0;
  const positionPlayers = team.roster.filter((candidate) => candidate.position === player.position);
  const target = ROSTER_TEMPLATE[player.position] || 1;
  const bestAtPosition = Math.max(0, ...positionPlayers.map((candidate) => candidate.overall || 0));

  if (neededStarters > 0 && positionPlayers.length === 0) return 1.0;
  if (neededStarters > 0 && positionPlayers.length < neededStarters) return 0.85;
  if (positionPlayers.length < target) return 0.6;
  if ((player.overall || 0) >= bestAtPosition + 8) return 0.45;
  if ((player.overall || 0) >= 82 && bestAtPosition < 78) return 0.35;
  return 0;
}

function playerHasRealUpside(player) {
  const ceiling = player.development?.potentialCeiling ?? POTENTIAL_CEILINGS[player.potentialStars || 1] ?? player.overall;
  return player.age <= 25 && (ceiling - (player.overall || 0) >= 5 || (player.potentialStars || 1) >= 4);
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
function contenderProductionBonus(cpuTeam, incomingPlayers, incomingPicks, posture) {
  if (![BUILD_PHASES.CONTENDING, BUILD_PHASES.ALL_IN].includes(posture.phase)) return 0;

  let bonus = 0;
  const contenderStrength = Math.max(0.35, posture.contentionStrength);

  for (const player of incomingPlayers) {
    const needFit = positionNeedFit(cpuTeam, player);
    // Value proven production: high OVR players in their prime
    if (player.overall >= 78 && player.age <= 30) {
      bonus += 0.12 * contenderStrength;
    } else if (player.overall >= 72 && player.age <= 28) {
      bonus += 0.06 * contenderStrength;
    }
    if (needFit > 0 && player.overall >= 78 && player.age <= 31) {
      bonus += 0.08 * contenderStrength * needFit;
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
function rebuilderYouthBonus(cpuTeam, incomingPlayers, incomingPicks, posture) {
  if (![BUILD_PHASES.REBUILDING, BUILD_PHASES.RETOOLING].includes(posture.phase)) return 0;

  let bonus = 0;
  const rebuilderStrength = Math.max(0.35, posture.rebuildStrength);

  // Rebuilders love picks
  for (const pick of incomingPicks) {
    const pickPremium = pick.overallPick <= 16 ? 1.35 : pick.overallPick <= 32 ? 1.0 : 0.65;
    bonus += 0.10 * rebuilderStrength * pickPremium;
  }

  for (const player of incomingPlayers) {
    const needFit = positionNeedFit(cpuTeam, player);
    // Young players with high potential
    if (playerHasRealUpside(player)) {
      bonus += 0.10 * rebuilderStrength;
    }
    if (needFit > 0 && player.age <= 29 && player.overall >= 74) {
      bonus += 0.07 * rebuilderStrength * needFit;
    }
    // Aging vets on big contracts are unwanted
    if (player.age >= 30 && player.overall < 80) {
      bonus -= 0.16 * rebuilderStrength;
    }
    if (player.age >= 32 && player.overall < 76) {
      bonus -= 0.12 * rebuilderStrength;
    }
  }

  return bonus;
}

function allInNeedPushBonus(cpuTeam, incomingPlayers, outgoingPicks, posture) {
  if (![BUILD_PHASES.CONTENDING, BUILD_PHASES.ALL_IN].includes(posture.phase)) return 0;
  if (incomingPlayers.length === 0) return 0;

  const strength = posture.phase === BUILD_PHASES.ALL_IN
    ? Math.max(0.65, posture.contentionStrength)
    : Math.max(0.35, posture.contentionStrength);
  let bonus = 0;

  for (const player of incomingPlayers) {
    const needFit = positionNeedFit(cpuTeam, player);
    if (needFit <= 0) continue;

    const isEliteFit = player.overall >= 84 && player.age <= 32;
    const isGoodFit = player.overall >= 78 && player.age <= 30;
    if (isEliteFit) bonus += 0.24 * strength * needFit;
    else if (isGoodFit) bonus += 0.14 * strength * needFit;
  }

  if (bonus > 0 && outgoingPicks.length > 0) {
    bonus += 0.06 * strength;
  }
  return bonus;
}

function coreAssetProtection(cpuTeam, outgoingPlayers, outgoingPicks, posture) {
  let adjustment = 0;
  const schemeStarters = getTeamSchemeStarters(cpuTeam);

  for (const player of outgoingPlayers) {
    const samePosition = cpuTeam.roster
      .filter((candidate) => candidate.position === player.position)
      .sort((a, b) => b.overall - a.overall);
    const starterRank = samePosition.findIndex((candidate) => candidate.id === player.id);
    const isStarter = starterRank >= 0 && starterRank < (schemeStarters[player.position] || 0);

    if ([BUILD_PHASES.REBUILDING, BUILD_PHASES.RETOOLING].includes(posture.phase) && playerHasRealUpside(player)) {
      adjustment -= 0.18;
    }
    if ([BUILD_PHASES.CONTENDING, BUILD_PHASES.ALL_IN].includes(posture.phase) && isStarter && player.overall >= 76) {
      adjustment -= 0.16;
    }
  }

  if ([BUILD_PHASES.REBUILDING, BUILD_PHASES.RETOOLING].includes(posture.phase)) {
    for (const pick of outgoingPicks) {
      if (pick.overallPick <= 16) adjustment -= 0.12;
      else if (pick.overallPick <= 32) adjustment -= 0.06;
    }
  }

  return adjustment;
}

function isAllInNeedFit(cpuTeam, incomingPlayers, outgoingPicks, posture) {
  if (posture.phase !== BUILD_PHASES.ALL_IN && posture.phase !== BUILD_PHASES.CONTENDING) return false;
  if (outgoingPicks.length === 0 && incomingPlayers.length === 0) return false;
  return incomingPlayers.some((player) =>
    positionNeedFit(cpuTeam, player) > 0
    && (
      (player.overall >= 84 && player.age <= 32)
      || (posture.phase === BUILD_PHASES.ALL_IN && player.overall >= 78 && player.age <= 30)
    )
  );
}

function minimumRawRatioForDeal(outgoingPicks, posture, dealContext) {
  const topEightPickRequested = outgoingPicks.some((pick) => pick.overallPick <= 8);
  const firstRoundPickRequested = outgoingPicks.some((pick) => pick.overallPick <= 16);

  if ([BUILD_PHASES.REBUILDING, BUILD_PHASES.RETOOLING].includes(posture.phase)) {
    if (topEightPickRequested) return 1.05;
    if (firstRoundPickRequested) return 0.95;
    return 0.62;
  }

  if (dealContext.allInNeedFit) {
    if (topEightPickRequested) return 0.88;
    if (firstRoundPickRequested) return 0.68;
    return 0.45;
  }

  if ([BUILD_PHASES.CONTENDING, BUILD_PHASES.ALL_IN].includes(posture.phase)) {
    if (topEightPickRequested) return 0.95;
    if (firstRoundPickRequested) return 0.82;
    return 0.52;
  }

  if (topEightPickRequested) return 0.95;
  if (firstRoundPickRequested) return 0.85;
  return 0.55;
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
  const outgoingPicks = (trade.requestedPickIds || [])
    .map(id => league.draft.picks.find(p => p.id === id))
    .filter(Boolean);
  const posture = assessTeamBuildPhase(league, cpuTeam);
  const dealContext = {
    allInNeedFit: isAllInNeedFit(cpuTeam, incomingPlayers, outgoingPicks, posture)
  };

  // ── Compute urgency bonuses (additive to ratio) ──
  const urgency = {
    missingStarter:    missingStarterBonus(cpuTeam, incomingPlayers),
    schemeCritical:    schemeCriticalBonus(cpuTeam, incomingPlayers),
    capRelief:         capDeficitAdjustment(cpuTeam, incomingPlayers, outgoingPlayers),
    contenderProd:     contenderProductionBonus(cpuTeam, incomingPlayers, incomingPicks, posture),
    rebuilderYouth:    rebuilderYouthBonus(cpuTeam, incomingPlayers, incomingPicks, posture),
    allInPush:         allInNeedPushBonus(cpuTeam, incomingPlayers, outgoingPicks, posture),
    coreProtection:    coreAssetProtection(cpuTeam, outgoingPlayers, outgoingPicks, posture),
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
    + urgency.rebuilderYouth
    + urgency.allInPush
    + urgency.coreProtection;

  // Cap total urgency bonus so it can't make terrible trades acceptable
  const positiveBonusCap = posture.phase === BUILD_PHASES.ALL_IN ? 0.58 : posture.phase === BUILD_PHASES.CONTENDING ? 0.52 : 0.45;
  const clampedBonus = Math.min(positiveBonusCap, Math.max(-0.30, totalBonus));

  const rawRatio = outgoingValue > 0 ? incomingValue / outgoingValue : incomingValue > 0 ? 3 : 0;
  const effectiveRatio = rawRatio + clampedBonus;
  const firstRoundPickRequested = outgoingPicks.some((pick) => pick.overallPick <= 16);
  const minimumRawRatio = minimumRawRatioForDeal(outgoingPicks, posture, dealContext);
  const forcedMarketReject = rawRatio < minimumRawRatio;

  // ── Acceptance decision with smooth curve ──
  // Instead of hard thresholds, use a probability curve:
  //   effectiveRatio >= 1.0  → 95% accept (near-certain)
  //   effectiveRatio ~= 0.85 → ~65% accept
  //   effectiveRatio ~= 0.70 → ~25% accept
  //   effectiveRatio < 0.55  → always reject
  let acceptProb;
  let reason;

  if (forcedMarketReject) {
    acceptProb = 0;
    reason = firstRoundPickRequested
      ? 'Premium draft pick requires a stronger offer'
      : 'Way below market value';
  } else if (effectiveRatio >= 1.0) {
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
  } else if (response === 'rejected' && !forcedMarketReject && effectiveRatio >= 0.85) {
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
    posture,
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
  if (urgency.allInPush > 0.05) reasons.push('fills a win-now roster hole');
  if (urgency.rebuilderYouth > 0.05) reasons.push('brings youth and draft capital');
  if (reasons.length === 0) return 'Decided to take the deal';
  return reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1);
}
