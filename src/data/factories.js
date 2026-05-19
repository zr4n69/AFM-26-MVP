import {
  DEFAULT_TENDENCIES,
  DEFENSIVE_SYSTEMS,
  LEAGUE_RULES,
  OFFENSIVE_SYSTEMS,
  POSITION_CHANGE_GROUPS,
  PHASES,
  POSITION_GROUPS,
  RETURNER_ELIGIBLE_POSITIONS,
  ROSTER_TEMPLATE,
  SCHEME_ROSTER_ADJUSTMENTS
} from "./constants.js";
import { createRng, makeId } from "./random.js";

const CITY_NAMES = Object.freeze([
  "Portland", "Austin", "Columbus", "Sacramento", "Orlando", "Memphis", "Omaha", "Raleigh",
  "Salt Lake", "Milwaukee", "San Antonio", "Louisville", "Boise", "Birmingham", "Albuquerque", "Providence"
]);

const TEAM_NAMES = Object.freeze([
  "Stags", "Founders", "Comets", "Ridgebacks", "Pilots", "Kings", "Steel", "Redwoods",
  "Summit", "Harbors", "Marshals", "Thoroughbreds", "Cutthroats", "Vulcans", "Roadrunners", "Anchors"
]);

const FIRST_NAMES = Object.freeze([
  "Marcus", "Eli", "Dante", "Theo", "Caleb", "Jalen", "Miles", "Nico", "Roman", "Isaiah",
  "Graham", "Kai", "Luca", "Andre", "Jonah", "Malik", "Reed", "Tariq", "Cole", "Samir"
]);

const LAST_NAMES = Object.freeze([
  "Cross", "Mercer", "Vale", "Booker", "Stone", "Hale", "Bishop", "Rivers", "Knight", "Sutton",
  "Wells", "Maddox", "Price", "Hollis", "Foster", "Graves", "Monroe", "Vega", "Hayes", "Pierce"
]);

export function createLeague(seed = "mvp", options = {}) {
  const rng = createRng(seed);
  const playerTeamIndex = options.playerTeamIndex ?? null;
  const playerPrestige = options.playerPrestige ?? null;
  const playerRosterStrength = options.playerRosterStrength ?? null;
  const teams = Array.from({ length: LEAGUE_RULES.teamCount }, (_, index) => {
    const isPlayerTeam = index === playerTeamIndex;
    const overrides = isPlayerTeam
      ? { prestige: playerPrestige, rosterStrength: playerRosterStrength, isPlayerControlled: true }
      : {};
    return createTeam(index, rng, overrides);
  });
  const schedule = createSchedule(teams);
  const standings = createStandings(teams);
  const draftClass = createDraftClass(rng, 1);

  return {
    id: makeId("league", [seed]),
    seed,
    name: "Fictional Gridiron Association",
    phase: PHASES.PRESEASON,
    currentSeason: 1,
    currentWeek: 0,
    rules: LEAGUE_RULES,
    teams,
    schedule,
    standings,
    draftClass,
    draft: createDraftState(teams, draftClass),
    scouting: createScoutingState(teams),
    trades: [],
    tradeMarket: createTradeMarketState(),
    training: createTrainingState(),
    playoff: createPlayoffState(),
    awards: createAwardsState(),
    hallOfFame: createHallOfFameState(),
    seasonHistory: [],
    freeAgents: createInitialFreeAgentPool(rng),
    prospectFreeAgents: [],
    games: [],
    saves: [],
    autosaveLog: []
  };
}

export function createStrategy(overrides = {}) {
  const offensiveSystem = overrides.offensiveSystem ?? OFFENSIVE_SYSTEMS.BALANCED_PRO;
  const defensiveSystem = overrides.defensiveSystem ?? DEFENSIVE_SYSTEMS.FOUR_THREE_ZONE;
  return {
    offensiveSystem,
    defensiveSystem,
    tendencies: {
      ...DEFAULT_TENDENCIES,
      ...(overrides.tendencies ?? {})
    }
  };
}

export function effectiveRosterTemplate(strategy) {
  const template = { ...ROSTER_TEMPLATE };
  const offAdj = SCHEME_ROSTER_ADJUSTMENTS.offense[strategy.offensiveSystem] ?? {};
  const defAdj = SCHEME_ROSTER_ADJUSTMENTS.defense[strategy.defensiveSystem] ?? {};
  for (const [pos, delta] of Object.entries(offAdj)) template[pos] = Math.max(1, template[pos] + delta);
  for (const [pos, delta] of Object.entries(defAdj)) template[pos] = Math.max(1, template[pos] + delta);
  return template;
}

export function salaryCapFromPrestige(prestige) {
  const unclamped = LEAGUE_RULES.minSalaryCap + (prestige - 1) * LEAGUE_RULES.capPerPrestigeStarAboveOne;
  return Math.min(LEAGUE_RULES.maxSalaryCap, Math.max(LEAGUE_RULES.minSalaryCap, Math.round(unclamped)));
}

function createTeam(index, rng, overrides = {}) {
  const city = CITY_NAMES[index];
  const nickname = TEAM_NAMES[index];
  const division = Math.floor(index / LEAGUE_RULES.teamsPerDivision) + 1;
  const prestige = overrides.prestige ?? Number((1 + rng.next() * 4).toFixed(2));
  const rosterStrength = overrides.rosterStrength ?? prestigeToRosterStrength(prestige, rng);
  const strategy = createStrategy({
    offensiveSystem: rng.pick(Object.values(OFFENSIVE_SYSTEMS)),
    defensiveSystem: rng.pick(Object.values(DEFENSIVE_SYSTEMS)),
    tendencies: {
      tempo: rng.int(35, 70),
      aggression: rng.int(35, 70),
      runPassLean: rng.int(-35, 35),
      deepPassing: rng.int(30, 75),
      blitzRate: rng.int(30, 75),
      coverageRisk: rng.int(30, 75)
    }
  });

  const team = {
    id: makeId("team", [city, nickname]),
    city,
    nickname,
    name: `${city} ${nickname}`,
    division: `Division ${division}`,
    prestige,
    rosterStrength,
    isPlayerControlled: overrides.isPlayerControlled ?? false,
    salaryCap: salaryCapFromPrestige(prestige),
    strategy,
    roster: [],
    depthChart: {},
    contractSummary: emptyContractSummary(),
    standings: { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 },
    rosterNeeds: createRosterNeeds(),
    cpuPlan: createCpuPlan(),
    morale: { score: 50, notes: [] },
    storylines: [],
    draftPicks: [],
    returnerId: null
  };
  team.roster = createRoster(team.id, rng, rosterStrength);
  clampRosterToCapBudget(team);
  team.depthChart = createDepthChart(team.roster);
  team.contractSummary = summarizeContracts(team.roster, team.salaryCap);
  team.returnerId = pickReturner(team);
  return team;
}

function createRoster(teamId, rng, rosterStrength = 0) {
  return Object.entries(ROSTER_TEMPLATE).flatMap(([position, count]) =>
    Array.from({ length: count }, (_, index) => createPlayer(teamId, position, index, rng, rosterStrength))
  );
}

function createInitialFreeAgentPool(rng) {
  const positions = Object.keys(ROSTER_TEMPLATE);
  return Array.from({ length: LEAGUE_RULES.initialFreeAgentPoolSize }, (_, index) => {
    const position = rng.pick(positions);
    const age = rng.int(24, 33);
    const potentialStars = rng.int(1, 3);
    const faCeilings = { 1: 64, 2: 72, 3: 79 };
    const overall = Math.min(rng.int(55, 72), faCeilings[potentialStars]);
    const id = makeId("player", ["fa", position, index + 1, rng.int(1000, 9999)]);
    const salary = salaryForOverall(overall, position, rng);
    return {
      id,
      firstName: rng.pick(FIRST_NAMES),
      lastName: rng.pick(LAST_NAMES),
      position,
      positionGroup: POSITION_GROUPS[position],
      age,
      rookie: false,
      ratings: createRatings(position, overall, rng),
      overall,
      potentialStars,
      contract: createContractFromSalary(0, 0),
      health: { status: "healthy", injury: null, weeksRemaining: 0 },
      fatigue: 0,
      traits: createTraits(rng),
      development: createDevelopment(overall, potentialStars),
      positionChange: {
        originalPosition: position,
        eligiblePositions: eligiblePositionsFor(position),
        familiarity: 100,
        history: []
      },
      injuryHistory: [],
      stats: createEmptyStats(),
      careerStats: createEmptyStats(),
      awards: [],
      freeAgentSeasonsUnsigned: 0
    };
  });
}

function createPlayer(teamId, position, index, rng, rosterStrength = 0) {
  const age = rng.int(21, 34);
  const potentialStars = rng.int(1, 5);
  const potentialCeilings = { 1: 64, 2: 72, 3: 79, 4: 89, 5: 99 };
  const rawOverall = generateOverall(position, rng, rosterStrength);
  // Veterans (older) can be closer to ceiling; younger players have more range
  const overall = Math.max(55, Math.min(rawOverall, potentialCeilings[potentialStars]));
  const id = makeId("player", [teamId, position, index + 1, rng.int(1000, 9999)]);
  const salary = salaryForOverall(overall, position, rng);
  return {
    id,
    firstName: rng.pick(FIRST_NAMES),
    lastName: rng.pick(LAST_NAMES),
    position,
    positionGroup: POSITION_GROUPS[position],
    age,
    rookie: age <= 23,
    ratings: createRatings(position, overall, rng),
    overall,
    potentialStars,
    contract: createContract(salary, rng),
    health: { status: "healthy", injury: null, weeksRemaining: 0 },
    fatigue: rng.int(0, 12),
    traits: createTraits(rng),
    development: createDevelopment(overall, potentialStars),
    positionChange: {
      originalPosition: position,
      eligiblePositions: eligiblePositionsFor(position),
      familiarity: 100,
      history: []
    },
    injuryHistory: [],
    stats: createEmptyStats(),
    careerStats: createEmptyStats(),
    awards: []
  };
}

function createRatings(position, overall, rng) {
  const base = {
    awareness: spread(overall, rng),
    stamina: spread(overall, rng),
    discipline: spread(overall, rng)
  };
  const groups = {
    QB: ["accuracy", "armStrength", "decisionMaking", "mobility", "poise"],
    RB: ["rushing", "burst", "power", "receiving", "ballSecurity"],
    WR: ["routeRunning", "catching", "speed", "contestedCatch", "blocking"],
    TE: ["routeRunning", "catching", "speed", "contestedCatch", "blocking"],
    OT: ["passBlock", "runBlock", "strength", "discipline"],
    OG: ["passBlock", "runBlock", "strength", "discipline"],
    C: ["passBlock", "runBlock", "strength", "discipline"],
    DL: ["passRush", "runDefense", "strength", "pursuit"],
    EDGE: ["passRush", "runDefense", "strength", "pursuit"],
    LB: ["tackling", "coverage", "blitzing", "runDefense", "awareness"],
    CB: ["coverage", "ballSkills", "tackling", "speed", "awareness"],
    S: ["coverage", "ballSkills", "tackling", "speed", "awareness"],
    K: ["kicking", "accuracy", "legStrength"],
    P: ["punting", "accuracy", "legStrength"]
  };
  for (const key of groups[position] ?? []) base[key] = spread(overall, rng);
  return base;
}

function createContract(salary, rng) {
  const yearsRemaining = rng.int(2, 5);
  const guaranteedAmount = Math.round(salary * yearsRemaining * (rng.int(0, 10) / 100));
  const bonusAmount = rng.int(0, 1) ? Math.round(salary * rng.int(5, 20) / 100) : 0;
  return {
    salary,
    yearsRemaining,
    guaranteedAmount,
    bonusAmount,
    bonusExpectation: bonusAmount > 0 ? rng.pick(["playoffs", "divisionTitle", "award", "statThreshold"]) : null,
    capHit: salary + Math.round(guaranteedAmount / yearsRemaining) + bonusAmount,
    extensionEligible: yearsRemaining <= 2,
    releaseImpact: {
      deadMoney: Math.round(guaranteedAmount / yearsRemaining),
      capSavings: Math.max(0, salary - Math.round(guaranteedAmount / yearsRemaining))
    }
  };
}

export function createContractFromSalary(salary, yearsRemaining = 1, overrides = {}) {
  const guaranteedAmount = overrides.guaranteedAmount ?? Math.round(salary * yearsRemaining * 0.2);
  const bonusAmount = overrides.bonusAmount ?? 0;
  return {
    salary,
    yearsRemaining,
    guaranteedAmount,
    bonusAmount,
    bonusExpectation: overrides.bonusExpectation ?? null,
    capHit: overrides.capHit ?? salary + Math.round(guaranteedAmount / yearsRemaining) + bonusAmount,
    extensionEligible: yearsRemaining <= 2,
    releaseImpact: {
      deadMoney: Math.round(guaranteedAmount / yearsRemaining),
      capSavings: Math.max(0, salary - Math.round(guaranteedAmount / yearsRemaining))
    }
  };
}

function createEmptyStats() {
  return {
    passingYards: 0,
    passingTouchdowns: 0,
    interceptionsThrown: 0,
    rushingYards: 0,
    rushingTouchdowns: 0,
    receivingYards: 0,
    receivingTouchdowns: 0,
    tackles: 0,
    tacklesForLoss: 0,
    sacks: 0,
    interceptions: 0,
    passDeflections: 0,
    puntDeflections: 0,
    kickDeflections: 0
  };
}

function createDepthChart(roster) {
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

function createStandings(teams) {
  return teams.map((team) => ({ teamId: team.id, division: team.division, wins: 0, losses: 0, ties: 0, winPct: 0 }));
}

function createSchedule(teams) {
  return Array.from({ length: LEAGUE_RULES.regularSeasonWeeks }, (_, weekIndex) => ({
    week: weekIndex + 1,
    games: pairTeams(teams, weekIndex)
  }));
}

function pairTeams(teams, weekIndex) {
  const ids = teams.map((team) => team.id);
  const rotated = [ids[0], ...ids.slice(1 + weekIndex), ...ids.slice(1, 1 + weekIndex)];
  return Array.from({ length: ids.length / 2 }, (_, index) => ({
    id: makeId("game", [weekIndex + 1, index + 1]),
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

function createDraftClass(rng, season) {
  const classStrength = (rng.next() - 0.5) * 2;
  const positions = Object.keys(POSITION_GROUPS);
  const positionSlots = buildPositionSlots(rng, positions, LEAGUE_RULES.draftClassSize);
  return Array.from({ length: LEAGUE_RULES.draftClassSize }, (_, index) => {
    const position = positionSlots[index];
    const projectedOverall = generateProspectRating(index, rng, classStrength);
    // Assign intrinsic potential based on projected talent (hidden until deep scouted)
    let potentialStars;
    if (projectedOverall >= 85) potentialStars = rng.int(4, 5);
    else if (projectedOverall >= 78) potentialStars = rng.int(3, 5);
    else if (projectedOverall >= 70) potentialStars = rng.int(2, 4);
    else if (projectedOverall >= 63) potentialStars = rng.int(1, 3);
    else potentialStars = rng.int(1, 2);
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
      potentialStars,
      schemeFit: null,
      expectedDraftPosition: index + 1,
      rookieContract: createRookieContractScale(index + 1),
      collegeHistory: `${rng.pick(["State", "Tech", "Northern", "Coastal", "Central"])} ${rng.pick(["A&M", "University", "College"])}`,
      collegeProduction: {
        games: rng.int(18, 42),
        allConference: rng.int(0, 1) === 1,
        awards: []
      },
      combineResults: {
        speedScore: rng.int(45, 99),
        powerScore: rng.int(45, 99),
        agilityScore: rng.int(45, 99)
      },
      combineRank: rng.int(1, LEAGUE_RULES.draftClassSize),
      draftedByTeamId: null,
      draftPickId: null,
      signedAsUndrafted: false
    };
  });
}

export const DRAFT_BASE_WEIGHTS = Object.freeze({
  QB: 5, RB: 8, WR: 14, TE: 7, OT: 11, OG: 9, C: 4,
  DL: 11, EDGE: 12, LB: 10, CB: 12, S: 7, K: 2, P: 2
});

export const DRAFT_MINIMUMS = Object.freeze({
  QB: 3, RB: 3, WR: 4, TE: 3, OT: 3, OG: 3, C: 2,
  DL: 3, EDGE: 3, LB: 3, CB: 3, S: 3, K: 1, P: 1
});

export const DRAFT_CLASS_THEMES = Object.freeze([
  { name: "olHeavy", boosts: { OT: 2.0, OG: 1.8, C: 1.6 } },
  { name: "skillPlayer", boosts: { WR: 1.8, RB: 1.6, TE: 1.5 } },
  { name: "qbRich", boosts: { QB: 2.5 } },
  { name: "defensiveFront", boosts: { DL: 1.8, EDGE: 1.7 } },
  { name: "secondary", boosts: { CB: 1.8, S: 1.7 } },
  { name: "balanced", boosts: {} },
  { name: "lbHeavy", boosts: { LB: 1.8, EDGE: 1.4 } },
  { name: "receiversDeep", boosts: { WR: 2.0, TE: 1.6 } }
]);

export function buildPositionSlots(rng, positions, totalSize) {
  const themes = [rng.pick(DRAFT_CLASS_THEMES)];
  if (rng.next() < 0.4) themes.push(rng.pick(DRAFT_CLASS_THEMES));

  const weights = {};
  for (const pos of positions) {
    let w = DRAFT_BASE_WEIGHTS[pos] ?? 5;
    for (const theme of themes) w *= (theme.boosts[pos] ?? 1);
    weights[pos] = w;
  }

  const guaranteed = [];
  for (const pos of positions) {
    const min = DRAFT_MINIMUMS[pos] ?? 2;
    for (let i = 0; i < min; i += 1) guaranteed.push(pos);
  }

  const remaining = totalSize - guaranteed.length;
  const weightEntries = positions.map((pos) => [pos, weights[pos]]);
  const totalWeight = weightEntries.reduce((sum, [, w]) => sum + w, 0);
  const extra = Array.from({ length: remaining }, () => {
    let roll = rng.next() * totalWeight;
    for (const [pos, w] of weightEntries) {
      roll -= w;
      if (roll <= 0) return pos;
    }
    return weightEntries.at(-1)[0];
  });

  const all = [...guaranteed, ...extra];
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export function generateProspectRating(index, rng, classStrength) {
  const MIN = 59;
  const MAX = 88;
  let min, max;
  if (index < 3) { min = 83; max = MAX; }
  else if (index < 16) { min = 78; max = 85; }
  else if (index < 32) { min = 73; max = 79; }
  else if (index < 48) { min = 68; max = 75; }
  else if (index < 80) { min = 63; max = 70; }
  else if (index < 120) { min = 59; max = 66; }
  else { min = MIN; max = 63; }
  const shift = Math.round(classStrength * 2);
  return Math.max(MIN, Math.min(MAX, rng.int(min, max) + shift));
}

function createDraftState(teams, draftClass) {
  const draftOrder = teams.map((team) => team.id);
  const picks = [];
  for (let round = 1; round <= LEAGUE_RULES.draftRounds; round += 1) {
    for (let slot = 1; slot <= LEAGUE_RULES.picksPerRound; slot += 1) {
      const overallPick = (round - 1) * LEAGUE_RULES.picksPerRound + slot;
      const originalTeamId = draftOrder[slot - 1];
      const originalTeam = teams.find((team) => team.id === originalTeamId);
      picks.push({
        id: makeId("pick", [1, round, slot]),
        season: 1,
        round,
        slot,
        overallPick,
        originalTeamId,
        currentTeamId: originalTeamId,
        prospectId: null,
        rookieContract: createRookieContractScale(overallPick)
      });
      originalTeam.draftPicks.push(picks.at(-1).id);
    }
  }

  return {
    season: 1,
    status: "upcoming",
    picks,
    draftOrder,
    draftedProspectIds: [],
    undraftedProspectIds: draftClass.map((prospect) => prospect.id),
    rookieContractScale: picks.map((pick) => ({
      overallPick: pick.overallPick,
      salary: pick.rookieContract.salary,
      yearsRemaining: pick.rookieContract.yearsRemaining
    }))
  };
}

function createScoutingState(teams) {
  const cpuCoverage = Object.fromEntries(teams.map((team) => [team.id, {
    coverageRate: 0.75,
    scoutedProspectIds: [],
    preferredTargets: [team.strategy.offensiveSystem, team.strategy.defensiveSystem]
  }]));
  return {
    currencyByTeamId: Object.fromEntries(teams.map((team) => [team.id, 0])),
    investments: [],
    revealedGroupsByTeamId: Object.fromEntries(teams.map((team) => [team.id, {}])),
    cpuCoverage
  };
}

function createTradeMarketState() {
  return {
    window: {
      offseason: true,
      regularSeasonThroughWeek: LEAGUE_RULES.tradeDeadlineWeek
    },
    cpuInitiatedOffers: [],
    cpuToCpuTrades: []
  };
}

function createTrainingState() {
  return {
    camp: {
      days: LEAGUE_RULES.trainingCampDays,
      completed: false,
      sessions: []
    },
    regularSeason: {
      windows: LEAGUE_RULES.regularSeasonTrainingWindows.map((afterWeek) => ({
        afterWeek,
        completed: false,
        sessions: []
      }))
    }
  };
}

function createPlayoffState() {
  return {
    format: {
      teams: LEAGUE_RULES.playoffTeams,
      firstRoundByes: LEAGUE_RULES.firstRoundByes,
      reseedSemifinals: true
    },
    seeds: [],
    rounds: [],
    championTeamId: null
  };
}

function createAwardsState() {
  return {
    regularSeasonProcessed: false,
    winners: {},
    allPro: {
      firstTeam: [],
      secondTeam: []
    },
    valueImpacts: []
  };
}

function createHallOfFameState() {
  return {
    eligibleRetiringPlayerIds: [],
    eligiblePlayers: [],
    ballotsByTeamId: {},
    voteTotals: {},
    inductedPlayerIds: [],
    history: []
  };
}

function createRosterNeeds() {
  return {
    invalidPositions: [],
    injuryNeeds: [],
    capNeeds: [],
    schemeNeeds: []
  };
}

function createCpuPlan() {
  return {
    repairInvalidRoster: true,
    signingTargets: [],
    releaseCandidates: [],
    tradeMotivations: [],
    scoutingPriorities: [],
    trainingPriorities: []
  };
}

function createDevelopment(overall, potentialStars) {
  const potentialCeilings = { 1: 64, 2: 72, 3: 79, 4: 89, 5: 99 };
  return {
    potentialCeiling: potentialCeilings[potentialStars],
    developmentState: overall >= potentialCeilings[potentialStars] - 2 ? "nearCeiling" : "developing",
    meaningfulPlaytime: false,
    yearlyDeclineRate: 0,
    lastTrainingGain: 0
  };
}

function createTraits(rng) {
  const possibleTraits = [
    ["durable", "fragile"],
    ["leader", "lockerRoomRisk"],
    ["bigPlaySpark", "conservative"],
    ["highMotor", "takesPlaysOff"],
    ["technician", "rawTools"]
  ];
  if (rng.int(1, 100) > 24) return [];
  return [rng.pick(rng.pick(possibleTraits))];
}

function eligiblePositionsFor(position) {
  const sameGroup = Object.values(POSITION_CHANGE_GROUPS).find((positions) => positions.includes(position)) ?? [position];
  return sameGroup.filter((candidate) => candidate !== position);
}

export function createRookieContractScale(overallPick) {
  const topSalary = 22_000_000;
  const bottomSalary = 2_000_000;
  const decay = 0.08;
  const t = Math.exp(-decay * (overallPick - 1));
  const salary = Math.round(bottomSalary + (topSalary - bottomSalary) * t);
  return createContractFromSalary(salary, 4, { guaranteedAmount: Math.round(salary * 0.8) });
}

function summarizeContracts(roster, salaryCap) {
  const committedCap = roster.reduce((sum, player) => sum + player.contract.capHit, 0);
  return {
    salaryCap,
    committedCap,
    capSpace: salaryCap - committedCap,
    rosterCount: roster.length,
    activeRosterCount: roster.filter((p) => p.health.status === "healthy").length
  };
}

function clampRosterToCapBudget(team) {
  const budget = Math.round(team.salaryCap * 0.92);
  const totalCap = team.roster.reduce((sum, p) => sum + p.contract.capHit, 0);
  if (totalCap <= budget) return;
  const scale = budget / totalCap;
  for (const player of team.roster) {
    const c = player.contract;
    c.salary = Math.round(c.salary * scale);
    c.guaranteedAmount = Math.round(c.guaranteedAmount * scale);
    c.bonusAmount = Math.round(c.bonusAmount * scale);
    c.capHit = c.salary + Math.round(c.guaranteedAmount / c.yearsRemaining) + c.bonusAmount;
    c.releaseImpact = {
      deadMoney: Math.round(c.guaranteedAmount / c.yearsRemaining),
      capSavings: Math.max(0, c.salary - Math.round(c.guaranteedAmount / c.yearsRemaining))
    };
  }
}

function emptyContractSummary() {
  return { salaryCap: 0, committedCap: 0, capSpace: 0, rosterCount: 0 };
}

function salaryForOverall(overall, position, rng) {
  const premium = ["QB", "EDGE", "OT", "WR", "CB"].includes(position) ? 1.20 : 1;
  const base =
    overall >= 88 ? rng.int(240, 350) / 10 :
    overall >= 82 ? rng.int(140, 220) / 10 :
    overall >= 76 ? rng.int(80, 140) / 10 :
    overall >= 70 ? rng.int(45, 80) / 10 :
    overall >= 62 ? rng.int(20, 45) / 10 :
    rng.int(12, 25) / 10;
  return Math.round(base * premium * 1_000_000);
}

function prestigeToRosterStrength(prestige, rng) {
  const base = (prestige - 1) / 4;
  const noise = (rng.next() - 0.5) * 0.25;
  return Math.max(-1, Math.min(1, (base * 2 - 1) + noise));
}

function generateOverall(position, rng, rosterStrength = 0) {
  const roll = rng.int(1, 100);
  const maxElite = position === "QB" ? 92 : 90;

  const eliteCutoff = Math.round(4 + rosterStrength * 6);
  const goodCutoff = Math.round(16 + rosterStrength * 10);
  const averageCutoff = Math.round(38 + rosterStrength * 10);
  const belowCutoff = Math.round(68 + rosterStrength * 8);

  let raw;
  if (roll <= eliteCutoff) raw = rng.int(88, maxElite);
  else if (roll <= goodCutoff) raw = rng.int(80, 87);
  else if (roll <= averageCutoff) raw = rng.int(72, 79);
  else if (roll <= belowCutoff) raw = rng.int(63, 71);
  else raw = rng.int(50, 62);

  const shift = Math.round(rosterStrength * 3);
  return Math.max(42, Math.min(maxElite, raw + shift));
}

export function pickReturner(team) {
  const eligible = team.roster
    .filter((p) => RETURNER_ELIGIBLE_POSITIONS.includes(p.position) && p.health.status === "healthy")
    .sort((a, b) => {
      const speedA = a.ratings.speed ?? a.overall;
      const speedB = b.ratings.speed ?? b.overall;
      return speedB - speedA;
    });
  return eligible[0]?.id ?? null;
}

function spread(value, rng) {
  return Math.max(1, Math.min(100, value + rng.int(-8, 8)));
}
