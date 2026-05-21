import {
  AWARD_TYPES,
  LEAGUE_RULES,
  PHASES,
  POSITION_CHANGE_GROUPS,
  TENDENCY_RANGES,
  TRADE_STATUSES,
  TRAINING_INTENSITIES
} from "./constants.js";
import { createStrategy } from "./factories.js";
import { createRng, makeId } from "./random.js";

export function updateStrategy(league, teamId, patch) {
  const team = requireTeam(league, teamId);
  const nextStrategy = createStrategy({
    ...team.strategy,
    ...patch,
    tendencies: {
      ...team.strategy.tendencies,
      ...(patch.tendencies ?? {})
    }
  });
  validateTendencies(nextStrategy.tendencies);
  team.strategy = nextStrategy;
  recordAutosave(league, "strategy", { teamId });
  return team.strategy;
}

export function setDepthChart(league, teamId, position, playerIds) {
  const team = requireTeam(league, teamId);
  const validIds = new Set(team.roster.filter((player) => player.position === position).map((player) => player.id));
  if (!playerIds.every((playerId) => validIds.has(playerId))) {
    throw new Error(`Depth chart for ${position} contains a player outside that position group.`);
  }
  team.depthChart[position] = [...playerIds];
  recordAutosave(league, "lineup", { teamId, position });
  return team.depthChart;
}

export function signPlayer(league, teamId, player) {
  const team = requireTeam(league, teamId);
  const activeCount = team.roster.filter((p) => p.health.status === "healthy").length;
  if (activeCount >= LEAGUE_RULES.rosterLimit) {
    throw new Error(`Cannot sign ${player.id}; ${team.name} already has ${LEAGUE_RULES.rosterLimit} active players.`);
  }
  team.roster.push(player);
  removeFreeAgent(league, player.id);
  refreshContractSummary(team);
  recordAutosave(league, "roster", { teamId, playerId: player.id, action: "sign" });
  return team.roster;
}

export function releasePlayer(league, teamId, playerId) {
  const team = requireTeam(league, teamId);
  const playerIndex = team.roster.findIndex((player) => player.id === playerId);
  if (playerIndex === -1) throw new Error(`Player ${playerId} is not on ${team.name}.`);
  const [player] = team.roster.splice(playerIndex, 1);
  player.freeAgentSeasonsUnsigned = 0;
  league.freeAgents.push(player);
  for (const position of Object.keys(team.depthChart)) {
    team.depthChart[position] = team.depthChart[position].filter((id) => id !== playerId);
  }
  refreshContractSummary(team);
  recordAutosave(league, "roster", { teamId, playerId, action: "release" });
  recordAutosave(league, "contract", { teamId, playerId, action: "releaseImpact" });
  return player;
}

export function extendContract(league, teamId, playerId, terms) {
  const team = requireTeam(league, teamId);
  const player = team.roster.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Player ${playerId} is not on ${team.name}.`);
  if (!player.contract.extensionEligible) throw new Error(`${player.firstName} ${player.lastName} is not extension eligible.`);

  // Player acceptance logic — compare offer to market expectations
  const acceptance = evaluateExtensionOffer(player, terms);
  if (!acceptance.accepted) {
    return { rejected: true, reason: acceptance.reason, player: { firstName: player.firstName, lastName: player.lastName } };
  }

  player.contract = {
    ...player.contract,
    ...terms,
    capHit: terms.capHit ?? terms.salary + Math.round((terms.guaranteedAmount ?? 0) / terms.yearsRemaining) + (terms.bonusAmount ?? 0),
    extensionEligible: terms.yearsRemaining <= 2
  };
  refreshContractSummary(team);
  recordAutosave(league, "contract", { teamId, playerId, action: "extend" });
  return player.contract;
}

/**
 * Evaluate whether a player accepts an extension offer based on their market value,
 * age, and overall rating. Players reject offers significantly below market.
 */
function evaluateExtensionOffer(player, terms) {
  const marketSalary = estimatePlayerMarketSalary(player);
  const offerRatio = terms.salary / marketSalary;
  const yearsOffered = terms.yearsRemaining || 1;

  // Young stars want long-term security
  const yearsPenalty = (player.age <= 26 && (player.potentialStars || 1) >= 4 && yearsOffered < 3) ? -0.10 : 0;

  // Aging players are more willing to take discounts for guaranteed years
  const ageBonus = player.age >= 31 ? 0.10 : player.age >= 29 ? 0.05 : 0;

  // High OVR players have more leverage
  const leveragePenalty = player.overall >= 85 ? -0.08 : player.overall >= 78 ? -0.04 : 0;

  const effectiveRatio = offerRatio + yearsPenalty + ageBonus + leveragePenalty;

  if (effectiveRatio >= 0.85) {
    return { accepted: true };
  } else if (effectiveRatio >= 0.70) {
    // Coin flip range — player considers it
    const acceptChance = (effectiveRatio - 0.70) / 0.15; // 0 at 0.70, 1 at 0.85
    const roll = Math.random();
    if (roll < acceptChance) return { accepted: true };
    return { accepted: false, reason: `Wants closer to ${formatSalaryForRejection(marketSalary)}/yr` };
  } else if (effectiveRatio >= 0.50) {
    return { accepted: false, reason: `Offer too low — expects at least ${formatSalaryForRejection(marketSalary * 0.85)}/yr` };
  } else {
    return { accepted: false, reason: `Insulting offer — market value is ${formatSalaryForRejection(marketSalary)}/yr` };
  }
}

function estimatePlayerMarketSalary(player) {
  const premium = ["QB", "EDGE", "OT", "WR", "CB"].includes(player.position) ? 1.20 : 1;
  const ageFactor =
    player.age >= 34 ? 0.65 :
    player.age >= 31 ? 0.85 :
    player.age >= 28 ? 0.95 :
    1.05;
  const base =
    player.overall >= 88 ? 28_000_000 :
    player.overall >= 82 ? 18_000_000 :
    player.overall >= 76 ? 10_000_000 :
    player.overall >= 70 ? 6_000_000 :
    player.overall >= 62 ? 3_000_000 :
    2_000_000;
  return Math.round(base * premium * ageFactor);
}

function formatSalaryForRejection(salary) {
  return `$${(salary / 1_000_000).toFixed(1)}M`;
}

export function renegotiateContract(league, teamId, playerId, newSalary, newYears) {
  const team = requireTeam(league, teamId);
  const player = requireRosterPlayer(team, playerId);
  if (league.phase !== PHASES.OFFSEASON) {
    throw new Error("Contracts can only be renegotiated during the offseason.");
  }
  const oldSalary = player.contract.salary;
  const salary = Math.max(500_000, newSalary);
  const yearsRemaining = Math.max(1, newYears);
  const guaranteedAmount = Math.round(salary * yearsRemaining * 0.2);
  player.contract = {
    salary,
    yearsRemaining,
    guaranteedAmount,
    bonusAmount: 0,
    bonusExpectation: null,
    capHit: salary + Math.round(guaranteedAmount / yearsRemaining),
    extensionEligible: yearsRemaining <= 2,
    releaseImpact: {
      deadMoney: Math.round(guaranteedAmount / yearsRemaining),
      capSavings: Math.max(0, salary - Math.round(guaranteedAmount / yearsRemaining))
    }
  };
  refreshContractSummary(team);
  recordAutosave(league, "contract", { teamId, playerId, action: "renegotiate", from: oldSalary, to: salary });
  return player.contract;
}

export function estimateRenegotiationValue(player) {
  const ageFactor =
    player.age >= 34 ? 0.6 :
    player.age >= 31 ? 0.8 :
    player.age >= 28 ? 0.95 :
    1.1;
  const injuryFactor = player.injuryHistory.length >= 3 ? 0.85 : 1.0;
  const premium = ["QB", "EDGE", "OT", "WR", "CB"].includes(player.position) ? 1.20 : 1;
  const base =
    player.overall >= 88 ? 28_000_000 :
    player.overall >= 82 ? 18_000_000 :
    player.overall >= 76 ? 10_000_000 :
    player.overall >= 70 ? 6_000_000 :
    player.overall >= 62 ? 3_000_000 :
    2_000_000;
  return Math.round(base * premium * ageFactor * injuryFactor);
}

export function isCapCompliant(team) {
  return team.contractSummary.capSpace >= 0;
}

export function checkCapCompliance(league) {
  return league.teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    compliant: isCapCompliant(team),
    capSpace: team.contractSummary.capSpace,
    overBy: Math.max(0, -team.contractSummary.capSpace)
  }));
}

export function enforceCapCompliance(league, teamId) {
  const team = requireTeam(league, teamId);
  const released = [];
  while (!isCapCompliant(team) && team.roster.length > 0) {
    const candidate = team.roster
      .filter((p) => {
        if (p.contract.releaseImpact.capSavings <= 0) return false;
        const posCount = team.roster.filter((r) => r.position === p.position).length;
        return posCount > 1;
      })
      .sort((a, b) => {
        const savingsRatio = (b.contract.releaseImpact.capSavings / Math.max(1, b.overall))
          - (a.contract.releaseImpact.capSavings / Math.max(1, a.overall));
        return savingsRatio;
      })[0];
    if (!candidate) break;
    const playerIndex = team.roster.findIndex((p) => p.id === candidate.id);
    const [player] = team.roster.splice(playerIndex, 1);
    for (const position of Object.keys(team.depthChart)) {
      team.depthChart[position] = team.depthChart[position].filter((id) => id !== player.id);
    }
    player.freeAgentSeasonsUnsigned = 0;
    league.freeAgents.push(player);
    released.push({ playerId: player.id, salary: player.contract.salary, capSavings: player.contract.releaseImpact.capSavings });
    refreshContractSummary(team);
  }
  recordAutosave(league, "roster", { teamId, action: "capEnforcement", releasedCount: released.length });
  return { teamId, released, compliant: isCapCompliant(team), capSpace: team.contractSummary.capSpace };
}

export function addScoutingCurrency(league, teamId, amount, reason = "weekly") {
  requireTeam(league, teamId);
  if (amount < 0) throw new Error("Scouting currency amount must be non-negative.");
  league.scouting.currencyByTeamId[teamId] = (league.scouting.currencyByTeamId[teamId] ?? 0) + amount;
  recordAutosave(league, "scouting", { teamId, amount, reason });
  return league.scouting.currencyByTeamId[teamId];
}

export function scoutProspectGroup(league, teamId, group, spend) {
  requireTeam(league, teamId);
  const available = league.scouting.currencyByTeamId[teamId] ?? 0;
  if (spend <= 0) throw new Error("Scouting spend must be positive.");
  if (available < spend) throw new Error(`Not enough scouting currency for ${teamId}.`);

  league.scouting.currencyByTeamId[teamId] = available - spend;
  const revealLevel = spend >= 5 ? "deep" : spend >= 3 ? "standard" : "surface";
  league.scouting.revealedGroupsByTeamId[teamId][group] = revealLevel;
  league.scouting.investments.push({
    id: makeId("scouting", [league.currentSeason, teamId, group, league.scouting.investments.length + 1]),
    teamId,
    group,
    spend,
    revealLevel,
    week: league.currentWeek
  });
  recordAutosave(league, "scouting", { teamId, group, spend });
  return league.scouting.revealedGroupsByTeamId[teamId];
}

export function draftProspect(league, pickId, prospectId) {
  const pick = requireDraftPick(league, pickId);
  if (pick.prospectId) throw new Error(`Pick ${pickId} has already been used.`);
  const prospect = requireProspect(league, prospectId);
  if (prospect.draftedByTeamId) throw new Error(`Prospect ${prospectId} has already been drafted.`);

  pick.prospectId = prospectId;
  prospect.draftedByTeamId = pick.currentTeamId;
  prospect.draftPickId = pickId;
  prospect.rookieContract = pick.rookieContract;
  league.draft.draftedProspectIds.push(prospectId);
  league.draft.undraftedProspectIds = league.draft.undraftedProspectIds.filter((id) => id !== prospectId);
  recordAutosave(league, "draft", { pickId, prospectId, teamId: pick.currentTeamId });
  return { pick, prospect };
}

export function processUndraftedFreeAgents(league) {
  league.prospectFreeAgents = [];
  for (const prospectId of league.draft.undraftedProspectIds) {
    const prospect = requireProspect(league, prospectId);
    prospect.signedAsUndrafted = true;
    league.prospectFreeAgents.push(prospect);
  }
  league.draft.status = "completed";
  recordAutosave(league, "draft", { action: "processUndrafted", count: league.draft.undraftedProspectIds.length });
  return league.draft.undraftedProspectIds;
}

export function proposeTrade(league, fromTeamId, toTeamId, offer) {
  requireTeam(league, fromTeamId);
  requireTeam(league, toTeamId);
  if (!isTradeWindowOpen(league)) throw new Error("Trade window is closed.");
  const trade = {
    id: makeId("trade", [league.currentSeason, league.trades.length + 1]),
    fromTeamId,
    toTeamId,
    status: TRADE_STATUSES.PROPOSED,
    offeredPlayerIds: offer.offeredPlayerIds ?? [],
    requestedPlayerIds: offer.requestedPlayerIds ?? [],
    offeredPickIds: offer.offeredPickIds ?? [],
    requestedPickIds: offer.requestedPickIds ?? [],
    notes: offer.notes ?? [],
    createdWeek: league.currentWeek
  };
  league.trades.push(trade);
  recordAutosave(league, "trade", { tradeId: trade.id, action: "propose" });
  return trade;
}

export function completeTrade(league, tradeId) {
  const trade = requireTrade(league, tradeId);
  if (trade.status !== TRADE_STATUSES.PROPOSED && trade.status !== TRADE_STATUSES.ACCEPTED) {
    throw new Error(`Trade ${tradeId} cannot be completed from ${trade.status}.`);
  }
  const fromTeam = requireTeam(league, trade.fromTeamId);
  const toTeam = requireTeam(league, trade.toTeamId);
  movePlayers(fromTeam, toTeam, trade.offeredPlayerIds);
  movePlayers(toTeam, fromTeam, trade.requestedPlayerIds);
  movePicks(league, trade.offeredPickIds, toTeam.id);
  movePicks(league, trade.requestedPickIds, fromTeam.id);
  refreshContractSummary(fromTeam);
  refreshContractSummary(toTeam);
  trade.status = TRADE_STATUSES.COMPLETED;
  recordAutosave(league, "trade", { tradeId, action: "complete" });
  return trade;
}

export function changePlayerPosition(league, teamId, playerId, newPosition) {
  const team = requireTeam(league, teamId);
  const player = requireRosterPlayer(team, playerId);
  if (!isEligiblePositionChange(player.position, newPosition)) {
    throw new Error(`${player.position} cannot change to ${newPosition}.`);
  }
  const previousPosition = player.position;
  player.position = newPosition;
  player.positionGroup = positionGroupFor(newPosition);
  player.positionChange.familiarity = previousPosition === newPosition ? 100 : Math.max(65, player.positionChange.familiarity - 15);
  player.positionChange.history.push({ from: previousPosition, to: newPosition, season: league.currentSeason, week: league.currentWeek });
  team.depthChart = buildDepthChart(team.roster);
  recordAutosave(league, "positionChange", { teamId, playerId, from: previousPosition, to: newPosition });
  return player;
}

export function scheduleTrainingSession(league, teamId, playerPlans, options = {}) {
  const team = requireTeam(league, teamId);
  if (playerPlans.length > LEAGUE_RULES.maxFocusedTrainingPlayers) {
    throw new Error(`Training can focus at most ${LEAGUE_RULES.maxFocusedTrainingPlayers} players.`);
  }
  for (const plan of playerPlans) {
    requireRosterPlayer(team, plan.playerId);
    if (!Object.values(TRAINING_INTENSITIES).includes(plan.intensity)) {
      throw new Error(`Unsupported training intensity: ${plan.intensity}`);
    }
  }
  const session = {
    id: makeId("training", [league.currentSeason, teamId, league.currentWeek, trainingSessionCount(league) + 1]),
    teamId,
    type: options.type ?? (league.phase === PHASES.PRESEASON ? "camp" : "regularSeason"),
    week: league.currentWeek,
    playerPlans: playerPlans.map((plan) => ({
      ...plan,
      expectedGain: expectedTrainingGain(plan.intensity),
      injuryRiskPct: expectedTrainingRisk(plan.intensity)
    })),
    completed: false
  };
  if (session.type === "camp") {
    league.training.camp.sessions.push(session);
  } else {
    const window = league.training.regularSeason.windows.find((candidate) => candidate.afterWeek >= league.currentWeek)
      ?? league.training.regularSeason.windows.at(-1);
    window.sessions.push(session);
  }
  recordAutosave(league, "training", { teamId, sessionId: session.id });
  return session;
}

export function resolveTrainingSession(league, sessionId) {
  const session = findTrainingSession(league, sessionId);
  if (!session) throw new Error(`Unknown training session: ${sessionId}`);
  if (session.completed) throw new Error(`Training session ${sessionId} has already been resolved.`);

  const team = requireTeam(league, session.teamId);
  const rng = createRng(`training-${sessionId}-${league.currentSeason}`);
  const results = [];

  for (const plan of session.playerPlans) {
    const player = requireRosterPlayer(team, plan.playerId);
    const injuryRoll = rng.next() * 100;
    const injured = injuryRoll < plan.injuryRiskPct;

    if (injured) {
      const weeksOut = rng.int(1, 3);
      const gameStatus = weeksOut >= 3 ? "out" : weeksOut === 2 ? "doubtful" : "questionable";
      player.health = { status: gameStatus, injury: "training", weeksRemaining: weeksOut };
      results.push({ playerId: plan.playerId, gain: 0, injured: true, injuryWeeks: weeksOut });
    } else {
      const [minGain, maxGain] = plan.expectedGain;
      const headroom = player.development.potentialCeiling - player.overall;
      const rawGain = rng.int(minGain, maxGain);
      const gain = Math.min(rawGain, Math.max(0, headroom));
      player.overall += gain;
      player.development.lastTrainingGain = gain;
      if (player.overall >= player.development.potentialCeiling - 2) {
        player.development.developmentState = "nearCeiling";
      }
      results.push({ playerId: plan.playerId, gain, injured: false, injuryWeeks: 0 });
    }
  }

  session.completed = true;
  session.results = results;
  team.depthChart = buildDepthChart(team.roster);

  // Mark the containing training window as completed
  if (session.type === "camp") {
    league.training.camp.completed = true;
  } else {
    const window = league.training.regularSeason.windows.find(
      w => w.sessions.some(s => s.id === sessionId)
    );
    if (window) window.completed = true;
  }

  recordAutosave(league, "training", { teamId: session.teamId, sessionId, results });
  return results;
}

export function generatePlayoffBracket(league, seedTeamIds) {
  if (seedTeamIds.length !== LEAGUE_RULES.playoffTeams) {
    throw new Error(`Playoff bracket requires ${LEAGUE_RULES.playoffTeams} seeds.`);
  }
  seedTeamIds.forEach((teamId) => requireTeam(league, teamId));
  league.playoff.seeds = seedTeamIds.map((teamId, index) => ({ seed: index + 1, teamId }));
  league.playoff.rounds = [
    {
      name: "firstRound",
      games: [
        playoffGame(3, seedTeamIds[2], 6, seedTeamIds[5]),
        playoffGame(4, seedTeamIds[3], 5, seedTeamIds[4])
      ]
    },
    { name: "semifinals", reseed: true, games: [] },
    { name: "championship", games: [] }
  ];
  league.phase = PHASES.PLAYOFFS;
  recordAutosave(league, "playoff", { action: "generateBracket" });
  return league.playoff;
}

export function recordAwardWinner(league, awardType, playerId, teamId, metadata = {}) {
  if (!AWARD_TYPES.includes(awardType)) throw new Error(`Unsupported award type: ${awardType}`);
  const team = requireTeam(league, teamId);
  const player = requireRosterPlayer(team, playerId);
  const award = { awardType, playerId, teamId, season: league.currentSeason, metadata };
  if (awardType === "firstTeamAllPro") league.awards.allPro.firstTeam.push(award);
  else if (awardType === "secondTeamAllPro") league.awards.allPro.secondTeam.push(award);
  else league.awards.winners[awardType] = award;
  player.awards.push(award);
  league.awards.valueImpacts.push({ playerId, reason: awardType, valueMultiplier: 1.05 });
  recordAutosave(league, "award", { awardType, playerId, teamId });
  return award;
}

export function castHallOfFameVotes(league, teamId, playerIds) {
  requireTeam(league, teamId);
  if (playerIds.length > LEAGUE_RULES.hallOfFameVotesPerTeam) {
    throw new Error(`Each team has only ${LEAGUE_RULES.hallOfFameVotesPerTeam} Hall of Fame votes.`);
  }
  league.hallOfFame.ballotsByTeamId[teamId] = [...playerIds];
  league.hallOfFame.voteTotals = {};
  for (const ballot of Object.values(league.hallOfFame.ballotsByTeamId)) {
    for (const playerId of ballot) {
      league.hallOfFame.voteTotals[playerId] = (league.hallOfFame.voteTotals[playerId] ?? 0) + 1;
    }
  }
  league.hallOfFame.inductedPlayerIds = Object.entries(league.hallOfFame.voteTotals)
    .filter(([, votes]) => votes >= LEAGUE_RULES.hallOfFameElectionThreshold)
    .map(([playerId]) => playerId);
  recordAutosave(league, "hallOfFame", { teamId, votes: playerIds });
  return league.hallOfFame;
}

export function advanceSeasonPhase(league, phase) {
  if (!Object.values(PHASES).includes(phase)) throw new Error(`Unsupported season phase: ${phase}`);
  league.phase = phase;
  recordAutosave(league, "season", { action: "advancePhase", phase });
  return league.phase;
}

export function recordAutosave(league, event, details = {}) {
  if (!LEAGUE_RULES.autosaveEvents.includes(event)) {
    throw new Error(`Unsupported autosave event: ${event}`);
  }
  league.autosaveLog.push({
    event,
    details,
    season: league.currentSeason,
    week: league.currentWeek,
    phase: league.phase,
    createdAt: new Date().toISOString()
  });
}

function validateTendencies(tendencies) {
  for (const [key, value] of Object.entries(tendencies)) {
    const range = TENDENCY_RANGES[key];
    if (!range) throw new Error(`Unknown strategy tendency: ${key}`);
    if (value < range[0] || value > range[1]) throw new Error(`${key} must be between ${range[0]} and ${range[1]}.`);
  }
}

function requireTeam(league, teamId) {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  return team;
}

function removeFreeAgent(league, playerId) {
  league.freeAgents = league.freeAgents.filter((player) => player.id !== playerId);
}

function refreshContractSummary(team) {
  const committedCap = team.roster.reduce((sum, player) => sum + player.contract.capHit, 0);
  team.contractSummary = {
    salaryCap: team.salaryCap,
    committedCap,
    capSpace: team.salaryCap - committedCap,
    rosterCount: team.roster.length,
    activeRosterCount: team.roster.filter((p) => p.health.status === "healthy").length
  };
}

function requireProspect(league, prospectId) {
  const prospect = league.draftClass.find((candidate) => candidate.id === prospectId);
  if (!prospect) throw new Error(`Unknown prospect: ${prospectId}`);
  return prospect;
}

function requireDraftPick(league, pickId) {
  const pick = league.draft.picks.find((candidate) => candidate.id === pickId);
  if (!pick) throw new Error(`Unknown draft pick: ${pickId}`);
  return pick;
}

function requireTrade(league, tradeId) {
  const trade = league.trades.find((candidate) => candidate.id === tradeId);
  if (!trade) throw new Error(`Unknown trade: ${tradeId}`);
  return trade;
}

function requireRosterPlayer(team, playerId) {
  const player = team.roster.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Player ${playerId} is not on ${team.name}.`);
  return player;
}

function isTradeWindowOpen(league) {
  return league.phase === PHASES.OFFSEASON || league.currentWeek <= LEAGUE_RULES.tradeDeadlineWeek;
}

function movePlayers(fromTeam, toTeam, playerIds) {
  for (const playerId of playerIds) {
    const playerIndex = fromTeam.roster.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) throw new Error(`Player ${playerId} is not on ${fromTeam.name}.`);
    const [player] = fromTeam.roster.splice(playerIndex, 1);
    toTeam.roster.push(player);
  }
  fromTeam.depthChart = buildDepthChart(fromTeam.roster);
  toTeam.depthChart = buildDepthChart(toTeam.roster);
}

function movePicks(league, pickIds, newTeamId) {
  for (const pickId of pickIds) {
    const pick = requireDraftPick(league, pickId);
    const previousTeam = requireTeam(league, pick.currentTeamId);
    const nextTeam = requireTeam(league, newTeamId);
    previousTeam.draftPicks = previousTeam.draftPicks.filter((id) => id !== pickId);
    nextTeam.draftPicks.push(pickId);
    pick.currentTeamId = newTeamId;
  }
}

function buildDepthChart(roster) {
  const chart = {};
  for (const player of roster) {
    chart[player.position] ??= [];
    chart[player.position].push(player.id);
  }
  for (const position of Object.keys(chart)) {
    chart[position].sort((leftId, rightId) => {
      const left = roster.find((player) => player.id === leftId);
      const right = roster.find((player) => player.id === rightId);
      return right.overall - left.overall;
    });
  }
  return chart;
}

function isEligiblePositionChange(currentPosition, nextPosition) {
  if (currentPosition === nextPosition) return true;
  return Object.values(POSITION_CHANGE_GROUPS).some((positions) =>
    positions.includes(currentPosition) && positions.includes(nextPosition)
  );
}

function positionGroupFor(position) {
  const lookup = {
    QB: "passers",
    RB: "rushers",
    WR: "receivers",
    TE: "receivers",
    OT: "blockers",
    OG: "blockers",
    C: "blockers",
    DL: "defensiveFront",
    EDGE: "defensiveFront",
    LB: "linebackers",
    CB: "defensiveBacks",
    S: "defensiveBacks",
    K: "specialTeams",
    P: "specialTeams"
  };
  return lookup[position];
}

function expectedTrainingGain(intensity) {
  return {
    [TRAINING_INTENSITIES.LIGHT]: [0, 1],
    [TRAINING_INTENSITIES.STANDARD]: [1, 2],
    [TRAINING_INTENSITIES.AGGRESSIVE]: [1, 3]
  }[intensity];
}

function expectedTrainingRisk(intensity) {
  return {
    [TRAINING_INTENSITIES.LIGHT]: 1,
    [TRAINING_INTENSITIES.STANDARD]: 4,
    [TRAINING_INTENSITIES.AGGRESSIVE]: 10
  }[intensity];
}

function playoffGame(homeSeed, homeTeamId, awaySeed, awayTeamId) {
  return {
    id: makeId("playoff", [homeSeed, awaySeed]),
    homeSeed,
    homeTeamId,
    awaySeed,
    awayTeamId,
    winnerTeamId: null,
    played: false
  };
}

function findTrainingSession(league, sessionId) {
  const campSession = league.training.camp.sessions.find((s) => s.id === sessionId);
  if (campSession) return campSession;
  for (const window of league.training.regularSeason.windows) {
    const windowSession = window.sessions.find((s) => s.id === sessionId);
    if (windowSession) return windowSession;
  }
  return null;
}

function trainingSessionCount(league) {
  return league.training.camp.sessions.length
    + league.training.regularSeason.windows.reduce((sum, window) => sum + window.sessions.length, 0);
}
