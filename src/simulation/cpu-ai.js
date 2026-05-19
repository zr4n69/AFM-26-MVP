import {
  LEAGUE_RULES,
  POSITION_GROUPS,
  ROSTER_TEMPLATE
} from "../data/constants.js";
import { createContractFromSalary, effectiveRosterTemplate } from "../data/factories.js";
import { draftProspect, processUndraftedFreeAgents, recordAutosave } from "../data/actions.js";
import { createRng, makeId } from "../data/random.js";

export function executeCpuRosterMoves(league, options = {}) {
  const rng = createRng(options.seed ?? `cpu-roster-${league.seed}-${league.currentSeason}-${league.currentWeek}`);
  const summary = { releases: [], signings: [], extensions: [] };

  for (const team of league.teams) {
    const releases = executeCpuReleases(team, league, rng);
    summary.releases.push(...releases);

    const signings = executeCpuSignings(team, league, rng);
    summary.signings.push(...signings);

    const extensions = executeCpuExtensions(team, rng);
    summary.extensions.push(...extensions);

    refreshDepthChart(team);
    refreshContractSummary(team);
  }

  if (summary.releases.length + summary.signings.length + summary.extensions.length > 0) {
    recordAutosave(league, "roster", { action: "cpuRosterMoves", season: league.currentSeason });
  }
  return summary;
}

export function executeCpuOffseasonSignings(league, options = {}) {
  const rng = createRng(options.seed ?? `cpu-offseason-${league.seed}-${league.currentSeason}`);
  const summary = { rosterFills: [], released: [], generated: 0 };

  for (const team of league.teams) {
    const template = effectiveRosterTemplate(team.strategy);
    const needs = [];
    for (const [position, targetCount] of Object.entries(template)) {
      const current = team.roster.filter((p) => p.position === position).length;
      const minRequired = Math.min(targetCount, 2);
      if (current < targetCount) {
        for (let i = 0; i < targetCount - current; i += 1) {
          needs.push({ position, priority: current < minRequired ? 0 : 1 });
        }
      }
    }
    needs.sort((a, b) => a.priority - b.priority);

    for (const need of needs) {
      const activeCount = team.roster.filter((p) => p.health.status === "healthy").length;
      if (activeCount >= LEAGUE_RULES.rosterLimit) {
        const released = releaseLowestSurplus(team, league, need.position);
        if (released) summary.released.push(released);
        else continue;
      }
      let candidate = findBestFreeAgent(league, need.position, team);
      if (!candidate) {
        candidate = generateStreetFreeAgent(league, need.position, rng);
        summary.generated += 1;
      }
      signFreeAgent(team, league, candidate, rng);
      summary.rosterFills.push({ teamId: team.id, playerId: candidate.id, position: need.position });
    }

    refreshDepthChart(team);
    refreshContractSummary(team);
  }

  if (summary.rosterFills.length > 0) {
    recordAutosave(league, "roster", { action: "cpuOffseasonSignings", season: league.currentSeason });
  }
  return summary;
}

function releaseLowestSurplus(team, league, neededPosition) {
  const template = effectiveRosterTemplate(team.strategy);
  const surplusPositions = Object.entries(template)
    .filter(([pos]) => pos !== neededPosition)
    .map(([pos, target]) => {
      const current = team.roster.filter((p) => p.position === pos).length;
      return { position: pos, surplus: current - target };
    })
    .filter((entry) => entry.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus);

  if (surplusPositions.length === 0) return null;
  const pos = surplusPositions[0].position;
  const worst = team.roster
    .filter((p) => p.position === pos)
    .sort((a, b) => a.overall - b.overall)[0];
  if (!worst) return null;
  team.roster = team.roster.filter((p) => p.id !== worst.id);
  league.freeAgents.push(worst);
  return { teamId: team.id, playerId: worst.id, position: pos };
}

export function cpuPickProspect(league, teamId) {
  const team = league.teams.find((t) => t.id === teamId);
  if (!team) return null;

  const template = effectiveRosterTemplate(team.strategy);
  const needs = [];
  for (const [pos, target] of Object.entries(template)) {
    const count = team.roster.filter((p) => p.position === pos).length;
    if (count < target) needs.push(pos);
  }

  const available = league.draftClass.filter((p) => !p.draftedByTeamId);
  if (available.length === 0) return null;

  // Score prospects using rating range midpoint + combine results
  const scoreProspect = (p) => {
    const mid = (p.ratingRange[0] + p.ratingRange[1]) / 2;
    const combine = p.combineResults || {};
    const combineAvg = ((combine.speedScore || 50) + (combine.powerScore || 50) + (combine.agilityScore || 50)) / 3;
    // Combine contributes ~5% of the total score
    return mid + (combineAvg - 50) * 0.1;
  };

  // Factor in scouting reveals if CPU has scouted the position group
  const revealedGroups = league.scouting?.revealedGroupsByTeamId?.[teamId] || {};
  const scoutBonus = (p) => {
    const SCOUTING_MAP = { OT: 'OL', OG: 'OL', C: 'OL', DL: 'DT', TE: 'WR' };
    const group = SCOUTING_MAP[p.position] || p.position;
    const level = revealedGroups[group];
    // If scouted, CPU has more confidence — slight bonus for higher-rated prospects
    if (level === 'deep') return 3;
    if (level === 'standard') return 1.5;
    if (level === 'surface') return 0.5;
    return 0;
  };

  let prospect;
  if (needs.length > 0) {
    const needSet = new Set(needs);
    prospect = available
      .filter((p) => needSet.has(p.position))
      .sort((a, b) => (scoreProspect(b) + scoutBonus(b)) - (scoreProspect(a) + scoutBonus(a)))[0];
  }
  if (!prospect) {
    prospect = available.sort((a, b) => (scoreProspect(b) + scoutBonus(b)) - (scoreProspect(a) + scoutBonus(a)))[0];
  }

  return prospect;
}

export function convertProspectToPlayer(league, prospect, teamId, rng) {
  if (!rng) rng = createRng(`convert-${prospect.id}-${league.currentSeason}`);
  const potentialCeilings = { 1: 64, 2: 72, 3: 79, 4: 89, 5: 99 };

  // Determine potential stars — use scouted value if available, otherwise derive from projected rating
  const projectedMid = Math.round((prospect.ratingRange[0] + prospect.ratingRange[1]) / 2);
  let potentialStars = prospect.potentialStars;
  if (!potentialStars) {
    // Assign stars based on projected talent: higher prospects get higher ceilings
    if (projectedMid >= 85) potentialStars = rng.int(4, 5);
    else if (projectedMid >= 78) potentialStars = rng.int(3, 5);
    else if (projectedMid >= 70) potentialStars = rng.int(2, 4);
    else if (projectedMid >= 63) potentialStars = rng.int(1, 3);
    else potentialStars = rng.int(1, 2);
  }

  const ceiling = potentialCeilings[potentialStars];

  // Rookie OVR: random between 55 and their ceiling, weighted toward projected rating
  // They can start way below potential or close to it
  const floorOvr = 55;
  const maxStartOvr = Math.min(ceiling, projectedMid + rng.int(-2, 5));
  const overall = Math.max(floorOvr, Math.min(ceiling, rng.int(floorOvr, maxStartOvr)));

  const nearCeiling = overall >= ceiling - 2;

  return {
    id: prospect.id,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    position: prospect.position,
    positionGroup: POSITION_GROUPS[prospect.position],
    age: prospect.age,
    rookie: true,
    ratings: { awareness: overall + rng.int(-5, 5), stamina: overall + rng.int(-5, 5), discipline: overall + rng.int(-5, 5) },
    overall,
    potentialStars,
    contract: prospect.rookieContract,
    health: { status: "healthy", injury: null, weeksRemaining: 0 },
    fatigue: 0,
    traits: prospect.traits ?? [],
    development: { potentialCeiling: ceiling, developmentState: nearCeiling ? "nearCeiling" : "developing", meaningfulPlaytime: false, yearlyDeclineRate: 0, lastTrainingGain: 0 },
    positionChange: { originalPosition: prospect.position, eligiblePositions: [], familiarity: 100, history: [] },
    injuryHistory: [],
    stats: emptyStats(),
    careerStats: emptyStats(),
    awards: [],
    freeAgentSeasonsUnsigned: 0
  };
}

export function executeCpuAutoDraft(league, options = {}) {
  const rng = createRng(options.seed ?? `autodraft-${league.seed}-${league.currentSeason}`);
  const summary = { picks: [], undraftedToFA: 0 };

  for (const pick of league.draft.picks) {
    if (pick.prospectId) continue;
    const team = league.teams.find((t) => t.id === pick.currentTeamId);
    if (!team) continue;

    const prospect = cpuPickProspect(league, team.id);
    if (!prospect) break;

    const result = draftProspect(league, pick.id, prospect.id);
    const player = convertProspectToPlayer(league, result.prospect, team.id, rng);

    const activeCount = team.roster.filter((p) => p.health.status === "healthy").length;
    if (activeCount < LEAGUE_RULES.rosterLimit) {
      team.roster.push(player);
      refreshContractSummary(team);
    } else {
      league.freeAgents.push(player);
    }

    summary.picks.push({ pickId: pick.id, prospectId: prospect.id, teamId: team.id, position: player.position, overall: player.overall });
  }

  const undrafted = processUndraftedFreeAgents(league);
  for (const prospectId of undrafted) {
    const prospect = league.draftClass.find((p) => p.id === prospectId);
    if (!prospect) continue;
    const udRng = createRng(`udfa-${prospect.id}`);
    const overall = Math.round((prospect.ratingRange[0] + prospect.ratingRange[1]) / 2);
    // Skip low-OVR undrafted prospects — they retire instead of bloating FA pool
    if (overall < 62) continue;
    const player = {
      id: prospect.id,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      position: prospect.position,
      positionGroup: POSITION_GROUPS[prospect.position],
      age: prospect.age,
      rookie: true,
      ratings: { awareness: overall + udRng.int(-5, 5), stamina: overall + udRng.int(-5, 5), discipline: overall + udRng.int(-5, 5) },
      overall,
      potentialStars: prospect.potentialStars ?? udRng.int(1, 3),
      contract: createContractFromSalary(800_000, 1),
      health: { status: "healthy", injury: null, weeksRemaining: 0 },
      fatigue: 0,
      traits: prospect.traits ?? [],
      development: { potentialCeiling: Math.min(85, overall + udRng.int(3, 10)), developmentState: "developing", meaningfulPlaytime: false, yearlyDeclineRate: 0, lastTrainingGain: 0 },
      positionChange: { originalPosition: prospect.position, eligiblePositions: [], familiarity: 100, history: [] },
      injuryHistory: [],
      stats: emptyStats(),
      careerStats: emptyStats(),
      awards: [],
      freeAgentSeasonsUnsigned: 0
    };
    league.freeAgents.push(player);
    summary.undraftedToFA += 1;
  }

  league.draft.status = "completed";
  recordAutosave(league, "draft", { action: "autoDraft", picks: summary.picks.length, undrafted: summary.undraftedToFA });
  return summary;
}

export function validateRosterCompliance(league) {
  const violations = [];
  for (const team of league.teams) {
    const template = effectiveRosterTemplate(team.strategy);
    for (const [position, targetCount] of Object.entries(template)) {
      const current = team.roster.filter((p) => p.position === position).length;
      const minRequired = Math.min(targetCount, 1);
      if (current < minRequired) {
        violations.push({ teamId: team.id, teamName: team.name, position, has: current, needs: minRequired });
      }
    }
  }
  return violations;
}

function executeCpuReleases(team, league, rng) {
  const releases = [];
  const capPressure = team.contractSummary.capSpace < 0;

  const candidates = team.roster
    .filter((player) => {
      if (capPressure && player.contract.releaseImpact.capSavings > 0) return true;
      return player.overall < 55 && player.contract.capHit > 1_500_000;
    })
    .sort((a, b) => (a.overall - a.contract.capHit / 1_000_000) - (b.overall - b.contract.capHit / 1_000_000))
    .slice(0, capPressure ? 5 : 2);

  for (const player of candidates) {
    if (team.roster.length <= minRosterSize()) break;
    if (isOnlyStarterAtPosition(team, player)) continue;

    team.roster = team.roster.filter((p) => p.id !== player.id);
    league.freeAgents.push(player);
    releases.push({ teamId: team.id, playerId: player.id, position: player.position, capSaved: player.contract.releaseImpact.capSavings });
  }
  return releases;
}

function executeCpuSignings(team, league, rng) {
  const signings = [];
  const needs = identifyRosterNeeds(team);

  for (const position of needs.slice(0, 3)) {
    const activeCount = team.roster.filter((p) => p.health.status === "healthy").length;
    if (activeCount >= LEAGUE_RULES.rosterLimit) break;
    if (team.contractSummary.capSpace < 1_000_000) break;

    const candidate = findBestFreeAgent(league, position, team);
    if (candidate) {
      signFreeAgent(team, league, candidate, rng);
      signings.push({ teamId: team.id, playerId: candidate.id, position });
    }
  }
  return signings;
}

function executeCpuExtensions(team, rng) {
  const extensions = [];
  const eligible = team.roster
    .filter((player) => player.contract.extensionEligible && player.overall >= 72)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 3);

  for (const player of eligible) {
    const years = rng.int(2, 5);
    const salary = estimateSalary(player);
    player.contract = createContractFromSalary(salary, years);
    extensions.push({ teamId: team.id, playerId: player.id, salary, years });
  }
  return extensions;
}

function identifyRosterNeeds(team) {
  const template = effectiveRosterTemplate(team.strategy);
  const needs = [];
  for (const [position, targetCount] of Object.entries(template)) {
    const current = team.roster.filter((p) => p.position === position).length;
    if (current < Math.ceil(targetCount * 0.6)) {
      for (let i = 0; i < targetCount - current; i += 1) {
        needs.push(position);
      }
    }
  }
  return needs;
}

function findBestFreeAgent(league, position, team) {
  const capSpace = team.contractSummary.capSpace;
  return league.freeAgents
    .filter((player) => {
      if (player.position !== position) return false;
      const salary = estimateSalary(player);
      return salary <= Math.max(capSpace, 800_000);
    })
    .sort((a, b) => b.overall - a.overall)[0] ?? null;
}

const STREET_FIRST_NAMES = ["Marcus", "Eli", "Dante", "Theo", "Caleb", "Jalen", "Miles", "Nico", "Roman", "Isaiah"];
const STREET_LAST_NAMES = ["Cross", "Mercer", "Vale", "Booker", "Stone", "Hale", "Bishop", "Rivers", "Knight", "Sutton"];

function generateStreetFreeAgent(league, position, rng) {
  const overall = rng.int(55, 63);
  const age = rng.int(23, 30);
  const id = makeId("player", ["street", position, league.currentSeason, rng.int(1000, 9999)]);
  const player = {
    id,
    firstName: rng.pick(STREET_FIRST_NAMES),
    lastName: rng.pick(STREET_LAST_NAMES),
    position,
    positionGroup: POSITION_GROUPS[position],
    age,
    rookie: false,
    ratings: { awareness: overall + rng.int(-5, 5), stamina: overall + rng.int(-5, 5), discipline: overall + rng.int(-5, 5) },
    overall,
    potentialStars: 1,
    contract: createContractFromSalary(0, 0),
    health: { status: "healthy", injury: null, weeksRemaining: 0 },
    fatigue: 0,
    traits: [],
    development: { potentialCeiling: 70, developmentState: "nearCeiling", meaningfulPlaytime: false, yearlyDeclineRate: 0, lastTrainingGain: 0 },
    positionChange: { originalPosition: position, eligiblePositions: [], familiarity: 100, history: [] },
    injuryHistory: [],
    stats: emptyStats(),
    careerStats: emptyStats(),
    awards: []
  };
  league.freeAgents.push(player);
  return player;
}

function signFreeAgent(team, league, player, rng) {
  // Hard roster limit guard
  if (team.roster.length >= LEAGUE_RULES.rosterLimit) return;
  const salary = estimateSalary(player);
  const years = rng.int(1, 3);
  player.contract = createContractFromSalary(salary, years);
  player.freeAgentSeasonsUnsigned = 0;
  team.roster.push(player);
  league.freeAgents = league.freeAgents.filter((p) => p.id !== player.id);
  refreshContractSummary(team);
}

function estimateSalary(player) {
  const premium = ["QB", "EDGE", "OT", "WR", "CB"].includes(player.position) ? 1.20 : 1;
  const base =
    player.overall >= 88 ? 28_000_000 :
    player.overall >= 82 ? 18_000_000 :
    player.overall >= 76 ? 10_000_000 :
    player.overall >= 70 ? 6_000_000 :
    player.overall >= 62 ? 3_000_000 :
    2_000_000;
  return Math.round(base * premium);
}

function isOnlyStarterAtPosition(team, player) {
  const samePosition = team.roster.filter((p) => p.position === player.position);
  return samePosition.length <= 1;
}

function minRosterSize() {
  return Math.ceil(LEAGUE_RULES.rosterLimit * 0.75);
}

function emptyStats() {
  return {
    passingYards: 0, passingTouchdowns: 0, interceptionsThrown: 0,
    rushingYards: 0, rushingTouchdowns: 0, receivingYards: 0, receivingTouchdowns: 0,
    tackles: 0, tacklesForLoss: 0, sacks: 0, interceptions: 0,
    passDeflections: 0, puntDeflections: 0, kickDeflections: 0
  };
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
