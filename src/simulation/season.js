import {
  LEAGUE_RULES,
  PHASES,
  ROSTER_TEMPLATE
} from "../data/constants.js";
import {
  advanceSeasonPhase,
  enforceCapCompliance,
  generatePlayoffBracket,
  recordAwardWinner,
  recordAutosave
} from "../data/actions.js";
import {
  createContractFromSalary,
  createLeague,
  createStrategy,
  buildPositionSlots,
  generateProspectRating,
  createRookieContractScale,
  DRAFT_BASE_WEIGHTS,
  DRAFT_MINIMUMS,
  DRAFT_CLASS_THEMES
} from "../data/factories.js";
import { createRng, makeId } from "../data/random.js";
import {
  generatePlayoffSeeds,
  simulatePlayoffRound,
  simulateRegularSeason
} from "./engine.js";
import { runFreeAgencyPeriod } from "./free-agency.js";
import { executeCpuAutoDraft, executeCpuOffseasonSignings, validateRosterCompliance, repairRosterCompliance } from "./cpu-ai.js";
import { calculateTradeValue } from "./trade-value.js";

export function runSeasonReview(league) {
  advanceSeasonPhase(league, PHASES.SEASON_REVIEW);
  const awards = computeSeasonAwards(league);
  league.awards.regularSeasonProcessed = true;
  league.awards.winners = awards;

  // Record major award winners on player objects
  for (const [awardType, entry] of Object.entries(awards)) {
    try {
      recordAwardWinner(league, awardType, entry.playerId, entry.teamId);
    } catch (_) { /* ignore if player not found */ }
  }

  // Compute and record All-Pro teams
  computeAllProTeams(league);

  // Process contract bonus expectations
  processContractBonuses(league);

  league.seasonHistory.push({
    season: league.currentSeason,
    standings: structuredClone(league.standings),
    championTeamId: league.playoff.championTeamId,
    awards: structuredClone(awards),
    allPro: structuredClone(league.awards.allPro)
  });
  recordAutosave(league, "season", { action: "review", season: league.currentSeason });
  return awards;
}

function computeAllProTeams(league) {
  const allPlayers = league.teams.flatMap((team) =>
    team.roster.map((player) => ({ ...player, teamId: team.id }))
  );

  const allProSlots = {
    QB: 1, RB: 1, WR: 2, TE: 1, OT: 2, OG: 2, C: 1,
    EDGE: 2, DL: 2, LB: 2, CB: 2, S: 2
  };

  const scoreFn = (p) => {
    if (["QB", "RB", "WR", "TE"].includes(p.position)) return totalOffensiveValue(p) + p.overall * 2;
    if (["OT", "OG", "C"].includes(p.position)) return p.overall * 5;
    return totalDefensiveValue(p) + p.overall * 2;
  };

  for (const [position, count] of Object.entries(allProSlots)) {
    const candidates = allPlayers
      .filter((p) => p.position === position)
      .sort((a, b) => scoreFn(b) - scoreFn(a));

    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      try {
        recordAwardWinner(league, "firstTeamAllPro", candidates[i].id, candidates[i].teamId, { position });
      } catch (_) { /* skip */ }
    }
    for (let i = count; i < Math.min(count * 2, candidates.length); i++) {
      try {
        recordAwardWinner(league, "secondTeamAllPro", candidates[i].id, candidates[i].teamId, { position });
      } catch (_) { /* skip */ }
    }
  }
}

function runCpuToCpuTrades(league, rng) {
  const trades = [];
  const cpuTeams = league.teams.filter(t => !t.isPlayerControlled);
  const maxTrades = Math.min(3, Math.floor(cpuTeams.length / 4));

  for (let attempt = 0; attempt < maxTrades; attempt++) {
    if (cpuTeams.length < 2) break;
    const teamA = rng.pick(cpuTeams);
    const teamB = rng.pick(cpuTeams.filter(t => t.id !== teamA.id));

    // Team A offers their lowest-value starter for Team B's best bench player at a needed position
    const aNeeds = Object.entries(ROSTER_TEMPLATE)
      .filter(([pos, count]) => teamA.roster.filter(p => p.position === pos).length < count)
      .map(([pos]) => pos);
    if (aNeeds.length === 0) continue;

    const targetPos = rng.pick(aNeeds);
    const bCandidates = teamB.roster
      .filter(p => p.position === targetPos && p.overall >= 65)
      .sort((a, b) => a.overall - b.overall);
    if (bCandidates.length < 2) continue; // Don't trade if B only has 1 at the position

    const offered = bCandidates[0];
    const aTradeables = teamA.roster
      .filter(p => p.overall >= 60 && p.overall <= offered.overall + 5)
      .sort((a, b) => a.overall - b.overall);
    if (aTradeables.length === 0) continue;

    const giving = aTradeables[0];
    const inVal = calculateTradeValue(league, teamA.id, { playerIds: [giving.id], pickIds: [] });
    const outVal = calculateTradeValue(league, teamB.id, { playerIds: [offered.id], pickIds: [] });
    if (outVal <= 0 || inVal / outVal < 0.7) continue;

    // Execute the swap
    teamA.roster = teamA.roster.filter(p => p.id !== giving.id);
    teamB.roster = teamB.roster.filter(p => p.id !== offered.id);
    teamA.roster.push(offered);
    teamB.roster.push(giving);

    const record = {
      fromTeamId: teamA.id, toTeamId: teamB.id,
      given: { playerId: giving.id, name: `${giving.firstName} ${giving.lastName}`, position: giving.position },
      received: { playerId: offered.id, name: `${offered.firstName} ${offered.lastName}`, position: offered.position },
    };
    trades.push(record);
    league.tradeMarket.cpuToCpuTrades.push(record);
  }
  return trades;
}

function processContractBonuses(league) {
  const playoffTeamIds = new Set(league.playoff.seeds || []);
  const championId = league.playoff.championTeamId;
  const awardWinnerIds = new Set(
    Object.values(league.awards.winners || {}).map(w => w.playerId)
  );

  for (const team of league.teams) {
    const s = team.standings || {};
    const isPlayoff = playoffTeamIds.has(team.id);
    const isChampion = team.id === championId;
    const divTeams = league.teams.filter(t => t.division === team.division);
    const isDivisionWinner = divTeams.every(t => (t.standings?.wins || 0) <= (s.wins || 0));

    for (const player of team.roster) {
      const bonus = player.contract?.bonusExpectation;
      if (!bonus) continue;

      let triggered = false;
      if (bonus === "playoffs" && isPlayoff) triggered = true;
      else if (bonus === "divisionTitle" && isDivisionWinner) triggered = true;
      else if (bonus === "award" && awardWinnerIds.has(player.id)) triggered = true;
      else if (bonus === "statThreshold") {
        // Triggered if player had significant production
        const totalOutput = totalOffensiveValue(player) + totalDefensiveValue(player);
        triggered = totalOutput >= 500;
      }

      if (triggered && player.contract.bonusAmount > 0) {
        // Bonus paid — increase cap hit for this year
        player.contract.capHit += player.contract.bonusAmount;
        player.contract.bonusPaid = true;
      }
    }
    // Refresh summary after bonus adjustments
    refreshContractSummary(team);
  }
}

export function runOffseason(league, options = {}) {
  advanceSeasonPhase(league, PHASES.OFFSEASON);
  const rng = createRng(`offseason-${league.seed}-${league.currentSeason}`);
  const summary = {
    season: league.currentSeason,
    retirements: [],
    contractExpirations: [],
    developmentChanges: [],
    freeAgency: null
  };

  for (const team of league.teams) {
    const retirements = processRetirements(team, league, rng);
    summary.retirements.push(...retirements);

    const expirations = processContractExpirations(team, league);
    summary.contractExpirations.push(...expirations);

    const developments = processDevelopment(team, rng);
    summary.developmentChanges.push(...developments);

    resetSeasonState(team);
  }

  summary.freeAgentRetirements = processFreeAgentRetirements(league, rng);

  // CPU-to-CPU trades during offseason
  summary.cpuTrades = runCpuToCpuTrades(league, rng);

  summary.freeAgentPoolExits = [];
  const survivingFreeAgents = [];
  for (const player of league.freeAgents) {
    player.fatigue = 0;
    for (const key of Object.keys(player.stats)) player.stats[key] = 0;
    if (player.health.status !== "healthy" && player.health.weeksRemaining <= 3) {
      player.health = { status: "healthy", injury: null, weeksRemaining: 0 };
    }
    player.freeAgentSeasonsUnsigned = (player.freeAgentSeasonsUnsigned ?? 0) + 1;
    // Prune aggressively: 2+ seasons unsigned, OR low OVR after 1 season, OR old+unsigned
    const shouldExit = player.freeAgentSeasonsUnsigned >= 2
      || (player.freeAgentSeasonsUnsigned >= 1 && player.overall < 60)
      || (player.freeAgentSeasonsUnsigned >= 1 && player.age >= 33);
    if (shouldExit) {
      summary.freeAgentPoolExits.push({ playerId: player.id, position: player.position, overall: player.overall, seasonsUnsigned: player.freeAgentSeasonsUnsigned });
    } else {
      survivingFreeAgents.push(player);
    }
  }
  league.freeAgents = survivingFreeAgents;

  if (!options.skipFreeAgency) {
    summary.freeAgency = runFreeAgencyPeriod(league, {
      seed: `fa-offseason-${league.seed}-${league.currentSeason}`
    });
  }

  summary.capEnforcement = [];
  for (const team of league.teams) {
    if (team.contractSummary.capSpace < 0) {
      const result = enforceCapCompliance(league, team.id);
      summary.capEnforcement.push(result);
    }
  }

  if (league.draft.status !== "completed") {
    summary.draft = executeCpuAutoDraft(league, {
      seed: `autodraft-${league.seed}-${league.currentSeason}`
    });
  }

  recordAutosave(league, "season", { action: "offseason", season: league.currentSeason });
  return summary;
}

export function advanceToNextSeason(league) {
  league.currentSeason += 1;
  league.currentWeek = 0;

  const rng = createRng(`${league.seed}-season-${league.currentSeason}`);

  const teams = league.teams;
  league.schedule = createNextSchedule(teams, league.currentSeason);
  league.standings = teams.map((team) => ({
    teamId: team.id,
    division: team.division,
    wins: 0,
    losses: 0,
    ties: 0,
    winPct: 0,
    pointsFor: 0,
    pointsAgainst: 0
  }));
  const previousStandings = league.seasonHistory.length > 0
    ? league.seasonHistory.at(-1).standings
    : league.standings;
  league.draftClass = createNextDraftClass(rng, league.currentSeason);
  league.draft = createNextDraftState(teams, league.draftClass, league.currentSeason, previousStandings);
  league.playoff = {
    format: {
      teams: LEAGUE_RULES.playoffTeams,
      firstRoundByes: LEAGUE_RULES.firstRoundByes,
      reseedSemifinals: true
    },
    seeds: [],
    rounds: [],
    championTeamId: null
  };
  league.awards = {
    regularSeasonProcessed: false,
    winners: {},
    allPro: { firstTeam: [], secondTeam: [] },
    valueImpacts: []
  };
  league.training = {
    camp: { days: LEAGUE_RULES.trainingCampDays, completed: false, sessions: [] },
    regularSeason: {
      windows: LEAGUE_RULES.regularSeasonTrainingWindows.map((afterWeek) => ({
        afterWeek,
        completed: false,
        sessions: []
      }))
    }
  };

  ageAllPlayers(league, rng);

  for (const team of league.teams) {
    if (team.contractSummary.capSpace < 0) {
      enforceCapCompliance(league, team.id);
    }
  }

  executeCpuOffseasonSignings(league, {
    seed: `cpu-fill-${league.seed}-${league.currentSeason}`
  });

  // Aggressive pre-season compliance: cap + roster hard limit
  for (const team of league.teams) {
    // Hard-enforce roster cap at 55
    while (team.roster.length > LEAGUE_RULES.rosterLimit) {
      const worst = team.roster
        .slice()
        .sort((a, b) => a.overall - b.overall)[0];
      if (!worst) break;
      team.roster = team.roster.filter(p => p.id !== worst.id);
      worst.freeAgentSeasonsUnsigned = 0;
      league.freeAgents.push(worst);
    }
    refreshContractSummary(team);
    // Enforce cap compliance aggressively — release highest-paid expendable until under cap
    let safetyCounter = 0;
    while (team.contractSummary.capSpace < 0 && team.roster.length > 0 && safetyCounter < 25) {
      // Find highest-salary player we can cut (not sole player at position, protect specialists)
      const candidate = team.roster
        .filter(p => {
          const posCount = team.roster.filter(r => r.position === p.position).length;
          return posCount > 1;
        })
        .sort((a, b) => b.contract.salary - a.contract.salary)[0];
      if (!candidate) {
        // Fallback: if stuck, also try the built-in enforcer which uses savings/ovr ratio
        enforceCapCompliance(league, team.id);
        break;
      }
      team.roster = team.roster.filter(p => p.id !== candidate.id);
      candidate.freeAgentSeasonsUnsigned = 0;
      league.freeAgents.push(candidate);
      for (const position of Object.keys(team.depthChart)) {
        team.depthChart[position] = (team.depthChart[position] || []).filter(id => id !== candidate.id);
      }
      refreshContractSummary(team);
      safetyCounter++;
    }
  }

  // Re-fill any gaps created by cap cuts (especially specialists like K, P)
  executeCpuOffseasonSignings(league, {
    seed: `cpu-refill-${league.seed}-${league.currentSeason}`
  });

  // Final cap enforcement after refill
  for (const team of league.teams) {
    refreshContractSummary(team);
    if (team.contractSummary.capSpace < 0) {
      enforceCapCompliance(league, team.id);
    }
  }

  const violations = validateRosterCompliance(league);
  if (violations.length > 0) {
    const repaired = repairRosterCompliance(league);
    if (repaired.length > 0) {
      console.log(`Roster violations repaired: ${repaired.map(r => `${r.teamName} signed ${r.position} (OVR ${r.overall})`).join(', ')}`);
    }
    const remaining = validateRosterCompliance(league);
    if (remaining.length > 0) {
      console.warn(`Unrepaired roster violations at season start: ${remaining.map(v => `${v.teamName} missing ${v.position}`).join(', ')}`);
    }
  }

  advanceSeasonPhase(league, PHASES.PRESEASON);
  recordAutosave(league, "season", { action: "advanceToSeason", season: league.currentSeason });
  return league.currentSeason;
}

export function simulateFullSeason(league, options = {}) {
  simulateRegularSeason(league, options);
  const seeds = generatePlayoffSeeds(league);
  generatePlayoffBracket(league, seeds);
  simulatePlayoffRound(league, "firstRound", options);
  simulatePlayoffRound(league, "semifinals", options);
  simulatePlayoffRound(league, "championship", options);
  runSeasonReview(league);
  return {
    season: league.currentSeason,
    championTeamId: league.playoff.championTeamId,
    standings: league.standings,
    awards: league.awards.winners
  };
}

export function simulateMultipleSeasons(league, count, options = {}) {
  const results = [];
  for (let i = 0; i < count; i += 1) {
    const result = simulateFullSeason(league, options);
    results.push(result);
    if (i < count - 1) {
      runOffseason(league);
      advanceToNextSeason(league);
    }
  }
  return results;
}

function retirementChance(age) {
  if (age < 34) return 0;
  return 0.25 + (age - 34) * 0.05;
}

function processRetirements(team, league, rng) {
  const retirements = [];
  const toRetire = [];
  for (const player of team.roster) {
    const chance = retirementChance(player.age);
    if (chance > 0 && rng.next() < chance) {
      toRetire.push(player);
      retirements.push({ playerId: player.id, teamId: team.id, age: player.age, overall: player.overall, position: player.position });
    }
  }
  for (const player of toRetire) {
    team.roster = team.roster.filter((p) => p.id !== player.id);
    league.hallOfFame.eligibleRetiringPlayerIds.push(player.id);
    // Preserve full player snapshot for HoF display
    league.hallOfFame.eligiblePlayers ??= [];
    league.hallOfFame.eligiblePlayers.push(structuredClone({ ...player, lastTeamId: team.id }));
  }
  return retirements;
}

function processFreeAgentRetirements(league, rng) {
  const retirements = [];
  const surviving = [];
  for (const player of league.freeAgents) {
    const chance = retirementChance(player.age);
    if (chance > 0 && rng.next() < chance) {
      retirements.push({ playerId: player.id, age: player.age, overall: player.overall, position: player.position });
      league.hallOfFame.eligibleRetiringPlayerIds.push(player.id);
      league.hallOfFame.eligiblePlayers ??= [];
      league.hallOfFame.eligiblePlayers.push(structuredClone({ ...player, lastTeamId: null }));
    } else {
      surviving.push(player);
    }
  }
  league.freeAgents = surviving;
  return retirements;
}

function processContractExpirations(team, league) {
  const expirations = [];
  const expiring = [];
  for (const player of team.roster) {
    player.contract.yearsRemaining -= 1;
    if (player.contract.yearsRemaining <= 0) {
      expiring.push(player);
      expirations.push({ playerId: player.id, teamId: team.id, position: player.position });
    }
  }
  for (const player of expiring) {
    team.roster = team.roster.filter((p) => p.id !== player.id);
    player.contract = createContractFromSalary(0, 0);
    player.freeAgentSeasonsUnsigned = 0;
    league.freeAgents.push(player);
  }
  refreshContractSummary(team);
  return expirations;
}

function processDevelopment(team, rng) {
  const changes = [];
  const moraleBonus = (team.morale?.score ?? 50) >= 70 ? 1 : (team.morale?.score ?? 50) <= 30 ? -1 : 0;
  for (const player of team.roster) {
    if (player.age <= 26 && player.overall < player.development.potentialCeiling) {
      const playtimeBonus = player.development?.meaningfulPlaytime ? 1 : 0;
      // Base gain reduced from 0-3 to 0-2; total capped at 3
      const rawGain = rng.int(0, 2) + moraleBonus + playtimeBonus;
      const gain = Math.max(0, Math.min(3, rawGain));
      const newOverall = Math.min(player.development.potentialCeiling, player.overall + gain);
      if (newOverall !== player.overall) {
        const previousOverall = player.overall;
        changes.push({ playerId: player.id, from: previousOverall, to: newOverall, type: "growth" });
        player.development.lastTrainingGain = newOverall - previousOverall;
        player.overall = newOverall;
      }
      if (player.overall >= player.development.potentialCeiling - 2) {
        player.development.developmentState = "nearCeiling";
      }
    }
  }
  return changes;
}

function processAgingDeclines(players, rng) {
  const declines = [];
  for (const player of players) {
    let declineRate = 0;
    if (player.age >= 36) declineRate = rng.int(3, 6);
    else if (player.age >= 33) declineRate = rng.int(1, 4);
    else if (player.age >= 30) declineRate = rng.int(1, 2);  // guaranteed -1 minimum
    else if (player.age >= 28) declineRate = rng.next() < 0.22 ? 1 : 0;  // 22% mild decline ages 28-29

    if (declineRate > 0) {
      const newOverall = Math.max(55, player.overall - declineRate);  // floor at 55
      declines.push({ playerId: player.id, from: player.overall, to: newOverall });
      player.overall = newOverall;
      player.development.yearlyDeclineRate = declineRate;
    }
  }
  return declines;
}

function ageAllPlayers(league, rng) {
  const allPlayers = league.teams.flatMap((t) => t.roster);
  const freeAgents = league.freeAgents;
  const everyone = [...allPlayers, ...freeAgents];
  const declines = processAgingDeclines(everyone, rng);
  for (const player of everyone) player.age += 1;
  return declines;
}

function resetSeasonState(team) {
  for (const player of team.roster) {
    // Accumulate season stats into career totals before reset
    player.careerStats ??= {};
    for (const key of Object.keys(player.stats)) {
      player.careerStats[key] = (player.careerStats[key] || 0) + player.stats[key];
      player.stats[key] = 0;
    }
    player.fatigue = 0;
    player.rookie = false;
    if (player.health.status !== "healthy" && player.health.weeksRemaining <= 3) {
      player.health = { status: "healthy", injury: null, weeksRemaining: 0 };
    }
  }
  team.standings = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
}

function computeSeasonAwards(league) {
  const allPlayers = league.teams.flatMap((team) =>
    team.roster.map((player) => ({ ...player, teamId: team.id }))
  );

  const bestPasser = topBy(allPlayers, (p) => p.stats.passingYards + p.stats.passingTouchdowns * 50);
  const bestRusher = topBy(allPlayers, (p) => p.stats.rushingYards + p.stats.rushingTouchdowns * 50);
  const bestReceiver = topBy(allPlayers, (p) => p.stats.receivingYards + p.stats.receivingTouchdowns * 50);
  const bestDefender = topBy(allPlayers, (p) =>
    p.stats.tackles * 2 + p.stats.tacklesForLoss * 5 + p.stats.sacks * 8 +
    p.stats.interceptions * 12 + p.stats.passDeflections * 4
  );

  const offensiveCandidates = [bestPasser, bestRusher, bestReceiver].filter(Boolean);
  const mvpPool = [...offensiveCandidates, bestDefender].filter(Boolean);
  const mvp = topBy(mvpPool, (p) => p.overall + totalOffensiveValue(p) * 0.01 + totalDefensiveValue(p) * 0.01);

  const rookieOffense = topBy(
    allPlayers.filter((p) => p.rookie && ["QB", "RB", "WR", "TE"].includes(p.position)),
    (p) => totalOffensiveValue(p)
  );
  const rookieDefense = topBy(
    allPlayers.filter((p) => p.rookie && ["DL", "EDGE", "LB", "CB", "S"].includes(p.position)),
    (p) => totalDefensiveValue(p)
  );

  const awards = {};
  if (mvp) awards.seasonMvp = { playerId: mvp.id, teamId: mvp.teamId };
  if (offensiveCandidates[0]) awards.offensivePlayerOfYear = { playerId: offensiveCandidates[0].id, teamId: offensiveCandidates[0].teamId };
  if (bestDefender) awards.defensivePlayerOfYear = { playerId: bestDefender.id, teamId: bestDefender.teamId };
  if (rookieOffense) awards.offensiveRookieOfYear = { playerId: rookieOffense.id, teamId: rookieOffense.teamId };
  if (rookieDefense) awards.defensiveRookieOfYear = { playerId: rookieDefense.id, teamId: rookieDefense.teamId };
  return awards;
}

function totalOffensiveValue(player) {
  return player.stats.passingYards + player.stats.rushingYards + player.stats.receivingYards
    + (player.stats.passingTouchdowns + player.stats.rushingTouchdowns + player.stats.receivingTouchdowns) * 50;
}

function totalDefensiveValue(player) {
  return player.stats.tackles * 2 + player.stats.tacklesForLoss * 5 + player.stats.sacks * 8
    + player.stats.interceptions * 12 + player.stats.passDeflections * 4
    + player.stats.puntDeflections * 10 + player.stats.kickDeflections * 10;
}

function topBy(items, scoreFn) {
  if (items.length === 0) return null;
  return items.reduce((best, item) => scoreFn(item) > scoreFn(best) ? item : best);
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

function createNextSchedule(teams, season) {
  return Array.from({ length: LEAGUE_RULES.regularSeasonWeeks }, (_, weekIndex) => ({
    week: weekIndex + 1,
    games: pairTeams(teams, weekIndex, season)
  }));
}

function pairTeams(teams, weekIndex, season) {
  const ids = teams.map((team) => team.id);
  const rotated = [ids[0], ...ids.slice(1 + weekIndex), ...ids.slice(1, 1 + weekIndex)];
  return Array.from({ length: ids.length / 2 }, (_, index) => ({
    id: makeId("game", [season, weekIndex + 1, index + 1]),
    week: weekIndex + 1,
    awayTeamId: rotated[index],
    homeTeamId: rotated[rotated.length - 1 - index],
    played: false,
    driveLog: [],
    boxScore: null,
    injuries: [],
    keyEvents: []
  }));
}

function createNextDraftClass(rng, season) {
  const FIRST_NAMES = ["Marcus", "Eli", "Dante", "Theo", "Caleb", "Jalen", "Miles", "Nico", "Roman", "Isaiah",
    "Graham", "Kai", "Luca", "Andre", "Jonah", "Malik", "Reed", "Tariq", "Cole", "Samir"];
  const LAST_NAMES = ["Cross", "Mercer", "Vale", "Booker", "Stone", "Hale", "Bishop", "Rivers", "Knight", "Sutton",
    "Wells", "Maddox", "Price", "Hollis", "Foster", "Graves", "Monroe", "Vega", "Hayes", "Pierce"];
  const positions = Object.keys(ROSTER_TEMPLATE);

  const classStrength = (rng.next() - 0.5) * 2;
  const positionSlots = buildPositionSlots(rng, positions, LEAGUE_RULES.draftClassSize);
  return Array.from({ length: LEAGUE_RULES.draftClassSize }, (_, index) => {
    const position = positionSlots[index];
    const projectedOverall = generateProspectRating(index, rng, classStrength);
    return {
      id: makeId("prospect", [season, index + 1]),
      firstName: rng.pick(FIRST_NAMES),
      lastName: rng.pick(LAST_NAMES),
      position,
      age: rng.int(20, 23),
      ratingRange: [Math.max(55, projectedOverall - rng.int(4, 10)), Math.min(92, projectedOverall + rng.int(3, 8))],
      scouted: false,
      exactRating: null,
      detailedRatings: null,
      traits: null,
      potentialStars: null,
      schemeFit: null,
      expectedDraftPosition: index + 1,
      rookieContract: createRookieContractScale(index + 1),
      collegeHistory: `${rng.pick(["State", "Tech", "Northern", "Coastal", "Central"])} ${rng.pick(["A&M", "University", "College"])}`,
      collegeProduction: { games: rng.int(18, 42), allConference: rng.int(0, 1) === 1, awards: [] },
      combineResults: { speedScore: rng.int(45, 99), powerScore: rng.int(45, 99), agilityScore: rng.int(45, 99) },
      combineRank: rng.int(1, LEAGUE_RULES.draftClassSize),
      draftedByTeamId: null,
      draftPickId: null,
      signedAsUndrafted: false
    };
  });
}


function createNextDraftState(teams, draftClass, season, standings) {
  const draftOrder = buildDraftOrder(teams, standings);
  const picks = [];
  for (let round = 1; round <= LEAGUE_RULES.draftRounds; round += 1) {
    for (let slot = 1; slot <= LEAGUE_RULES.picksPerRound; slot += 1) {
      const overallPick = (round - 1) * LEAGUE_RULES.picksPerRound + slot;
      const originalTeamId = draftOrder[slot - 1];
      picks.push({
        id: makeId("pick", [season, round, slot]),
        season,
        round,
        slot,
        overallPick,
        originalTeamId,
        currentTeamId: originalTeamId,
        prospectId: null,
        rookieContract: createRookieContractScale(overallPick)
      });
    }
  }
  return {
    season,
    status: "upcoming",
    picks,
    draftOrder,
    draftedProspectIds: [],
    undraftedProspectIds: draftClass.map((p) => p.id),
    rookieContractScale: picks.map((pick) => ({
      overallPick: pick.overallPick,
      salary: pick.rookieContract.salary,
      yearsRemaining: pick.rookieContract.yearsRemaining
    }))
  };
}

function buildDraftOrder(teams, standings) {
  if (!standings || standings.length === 0) {
    return teams.map((team) => team.id);
  }
  const sorted = [...standings].sort((a, b) => {
    const aWinPct = a.winPct ?? (a.wins / Math.max(1, a.wins + a.losses + a.ties));
    const bWinPct = b.winPct ?? (b.wins / Math.max(1, b.wins + b.losses + b.ties));
    if (aWinPct !== bWinPct) return aWinPct - bWinPct;
    const aPF = a.pointsFor ?? 0;
    const bPF = b.pointsFor ?? 0;
    return aPF - bPF;
  });
  return sorted.map((entry) => entry.teamId);
}

