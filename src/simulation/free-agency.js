import { LEAGUE_RULES, ROSTER_TEMPLATE } from "../data/constants.js";
import { createContractFromSalary } from "../data/factories.js";
import { recordAutosave } from "../data/actions.js";
import { createRng } from "../data/random.js";

export function runFreeAgencyPeriod(league, options = {}) {
  const rng = createRng(options.seed ?? `fa-${league.seed}-${league.currentSeason}`);
  const season = league.currentSeason;
  const prestigeWeight = prestigeInfluence(season);
  const results = { signings: [], competedPlayers: [], unsignedPlayers: [] };

  const market = rankFreeAgents(league.freeAgents);

  for (const player of market) {
    const offers = collectOffers(league, player, rng);
    if (offers.length === 0) {
      results.unsignedPlayers.push({ playerId: player.id, position: player.position, overall: player.overall });
      continue;
    }

    const scored = offers.map((offer) => ({
      ...offer,
      attractiveness: computeAttractiveness(offer, player, league, prestigeWeight, rng)
    }));
    scored.sort((a, b) => b.attractiveness - a.attractiveness);

    const winner = resolveDecision(scored, rng);
    executeSigning(league, winner, player);

    results.signings.push({
      playerId: player.id,
      teamId: winner.teamId,
      salary: winner.salary,
      years: winner.years,
      attractiveness: winner.attractiveness,
      competing: scored.length > 1,
      runnerUp: scored.length > 1 ? scored.find((o) => o.teamId !== winner.teamId)?.teamId ?? null : null
    });
    if (scored.length > 1) {
      results.competedPlayers.push(player.id);
    }
  }

  league.freeAgents = league.freeAgents.filter(
    (p) => !results.signings.some((s) => s.playerId === p.id)
  );

  recordAutosave(league, "roster", { action: "freeAgency", season, signings: results.signings.length });
  return results;
}

export function makeContractOffer(league, teamId, playerId, salary, years) {
  const team = league.teams.find((t) => t.id === teamId);
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  const player = league.freeAgents.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} is not a free agent.`);
  const activeCount = team.roster.filter((p) => p.health.status === "healthy").length;
  if (activeCount >= LEAGUE_RULES.rosterLimit) {
    throw new Error(`${team.name} active roster is full.`);
  }

  league.pendingOffers ??= [];
  league.pendingOffers = league.pendingOffers.filter(
    (o) => !(o.teamId === teamId && o.playerId === playerId)
  );
  league.pendingOffers.push({ teamId, playerId, salary, years });
  return { teamId, playerId, salary, years };
}

export function resolvePendingOffers(league, options = {}) {
  const rng = createRng(options.seed ?? `resolve-${league.seed}-${league.currentSeason}`);
  const season = league.currentSeason;
  const prestigeWeight = prestigeInfluence(season);
  const pending = league.pendingOffers ?? [];
  const results = { signings: [], rejections: [] };

  const byPlayer = {};
  for (const offer of pending) {
    byPlayer[offer.playerId] ??= [];
    byPlayer[offer.playerId].push(offer);
  }

  for (const [playerId, offers] of Object.entries(byPlayer)) {
    const player = league.freeAgents.find((p) => p.id === playerId);
    if (!player) continue;

    const scored = offers.map((offer) => ({
      ...offer,
      attractiveness: computeAttractiveness(offer, player, league, prestigeWeight, rng)
    }));
    scored.sort((a, b) => b.attractiveness - a.attractiveness);

    const winner = resolveDecision(scored, rng);
    const team = league.teams.find((t) => t.id === winner.teamId);
    const activeRoster = team ? team.roster.filter((p) => p.health.status === "healthy").length : 0;
    if (!team || activeRoster >= LEAGUE_RULES.rosterLimit) {
      results.rejections.push({ playerId, reason: "roster_full", player: { firstName: player.firstName, lastName: player.lastName, position: player.position, overall: player.overall } });
      continue;
    }

    executeSigning(league, winner, player);
    results.signings.push({
      playerId,
      teamId: winner.teamId,
      salary: winner.salary,
      years: winner.years,
      attractiveness: winner.attractiveness,
      player: { firstName: player.firstName, lastName: player.lastName, position: player.position, overall: player.overall },
    });

    for (const loser of scored.filter((o) => o.teamId !== winner.teamId)) {
      results.rejections.push({ playerId, teamId: loser.teamId, reason: "outbid", player: { firstName: player.firstName, lastName: player.lastName, position: player.position, overall: player.overall } });
    }
  }

  league.freeAgents = league.freeAgents.filter(
    (p) => !results.signings.some((s) => s.playerId === p.id)
  );
  league.pendingOffers = [];
  return results;
}

export function computeAttractiveness(offer, player, league, prestigeWeight, rng) {
  const team = league.teams.find((t) => t.id === offer.teamId);
  if (!team) return 0;

  const contractScore = contractValue(offer, player);
  const prestigeScore = team.prestige / 5;
  const performanceScore = recentPerformance(team, league);
  const needScore = positionalNeed(team, player.position);
  const moraleScore = ((team.morale?.score ?? 50) - 50) / 100; // -0.4 to +0.45
  const noise = (rng.next() - 0.5) * 0.12;

  // Competitive balance: winning teams are less attractive (player seeks role / money elsewhere)
  const balancePenalty = competitiveBalancePenalty(team, league);

  return (
    contractScore * 0.35 +
    prestigeScore * prestigeWeight * 0.20 +
    performanceScore * 0.15 +
    needScore * 0.10 +
    moraleScore * 0.05 +
    balancePenalty * 0.15 +
    noise
  );
}

export function prestigeInfluence(season) {
  return Math.min(1.0, 0.3 + (season - 1) * 0.15);
}

function collectOffers(league, player, rng) {
  const offers = [];
  for (const team of league.teams) {
    const activeCount = team.roster.filter((p) => p.health.status === "healthy").length;
    if (activeCount >= LEAGUE_RULES.rosterLimit) continue;
    if (!teamWantsPlayer(team, player, rng)) continue;

    const salary = cpuOfferSalary(player, team, rng);
    const years = rng.int(1, Math.min(4, Math.max(1, 6 - Math.floor(player.age / 8))));
    offers.push({ teamId: team.id, playerId: player.id, salary, years });
  }
  return offers;
}

function teamWantsPlayer(team, player, rng) {
  const posCount = team.roster.filter((p) => p.position === player.position).length;
  const target = ROSTER_TEMPLATE[player.position] ?? 1;

  if (posCount < Math.ceil(target * 0.6)) return rng.next() < 0.95;
  if (posCount < target && player.overall >= 70) return rng.next() < 0.70;
  if (player.overall >= 82) return rng.next() < 0.45;
  if (player.overall >= 75 && posCount < target) return rng.next() < 0.40;
  if (posCount < target) return rng.next() < 0.25;  // need-based interest even for avg players
  return rng.next() < 0.12;  // raised from 5% to 12%
}

function cpuOfferSalary(player, team, rng) {
  const base = estimateMarketSalary(player);
  const capFactor = team.contractSummary.capSpace > base * 3 ? 1.1 : 0.9;
  const needFactor = positionalNeed(team, player.position) > 0.5 ? 1.15 : 1.0;
  const noise = 0.85 + rng.next() * 0.30;
  return Math.round(base * capFactor * needFactor * noise);
}

export function estimateMarketSalary(player) {
  const premium = ["QB", "EDGE", "OT", "WR", "CB"].includes(player.position) ? 1.20 : 1;
  const ageFactor =
    player.age >= 34 ? 0.65 :
    player.age >= 31 ? 0.85 :
    player.age >= 28 ? 0.95 :
    1.05;
  const injuryFactor = (player.injuryHistory?.length ?? 0) >= 3 ? 0.85 : 1.0;
  const base =
    player.overall >= 88 ? 28_000_000 :
    player.overall >= 82 ? 18_000_000 :
    player.overall >= 76 ? 10_000_000 :
    player.overall >= 70 ? 6_000_000 :
    player.overall >= 62 ? 3_000_000 :
    2_000_000;
  return Math.round(base * premium * ageFactor * injuryFactor);
}

function contractValue(offer, player) {
  const market = estimateMarketSalary(player);
  const totalOffered = offer.salary * offer.years;
  const totalMarket = market * Math.max(1, offer.years);
  return Math.min(1.0, totalOffered / totalMarket);
}

function recentPerformance(team, league) {
  if (league.seasonHistory.length === 0) return 0.5;
  const lastSeason = league.seasonHistory.at(-1);
  const standing = lastSeason.standings.find((s) => s.teamId === team.id);
  if (!standing) return 0.5;
  const winPct = standing.winPct ?? 0;
  const wasChampion = lastSeason.championTeamId === team.id ? 0.15 : 0;
  return Math.min(1.0, winPct + wasChampion);
}

function competitiveBalancePenalty(team, league) {
  // Teams with recent success get a penalty (less attractive to FAs seeking opportunity)
  if (league.seasonHistory.length === 0) return 0;
  let totalWinPct = 0;
  const lookback = Math.min(2, league.seasonHistory.length);
  for (let i = league.seasonHistory.length - lookback; i < league.seasonHistory.length; i++) {
    const standing = league.seasonHistory[i].standings.find(s => s.teamId === team.id);
    totalWinPct += standing?.winPct ?? 0.5;
  }
  const avgWinPct = totalWinPct / lookback;
  // Penalty scales: 0.500 → 0, 0.700 → -0.4, 0.900 → -0.8
  if (avgWinPct <= 0.5) return 0;
  return -(avgWinPct - 0.5) * 2;
}

function positionalNeed(team, position) {
  const current = team.roster.filter((p) => p.position === position).length;
  const target = ROSTER_TEMPLATE[position] ?? 1;
  if (current >= target) return 0;
  if (current === 0) return 1.0;
  return Math.min(1.0, (target - current) / target);
}

function resolveDecision(scoredOffers, rng) {
  if (scoredOffers.length === 1) return scoredOffers[0];

  const best = scoredOffers[0];
  const second = scoredOffers[1];
  const gap = best.attractiveness - second.attractiveness;

  if (gap > 0.15) return best;
  if (rng.next() < 0.70 + gap * 2) return best;
  return second;
}

function executeSigning(league, offer, player) {
  const team = league.teams.find((t) => t.id === offer.teamId);
  // Hard roster limit guard
  if (team.roster.length >= LEAGUE_RULES.rosterLimit) return;
  player.contract = createContractFromSalary(offer.salary, offer.years);
  player.freeAgentSeasonsUnsigned = 0;
  team.roster.push(player);
  league.freeAgents = league.freeAgents.filter((p) => p.id !== player.id);
  refreshContractSummary(team);
  refreshDepthChart(team);
}

function rankFreeAgents(freeAgents) {
  return [...freeAgents].sort((a, b) => b.overall - a.overall);
}

function refreshDepthChart(team) {
  const chart = {};
  for (const player of team.roster) {
    chart[player.position] ??= [];
    chart[player.position].push(player.id);
  }
  for (const ids of Object.values(chart)) {
    ids.sort((leftId, rightId) => {
      const left = team.roster.find((p) => p.id === leftId);
      const right = team.roster.find((p) => p.id === rightId);
      return right.overall - left.overall;
    });
  }
  team.depthChart = chart;
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
