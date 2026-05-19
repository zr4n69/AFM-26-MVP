export const LEAGUE_RULES = Object.freeze({
  teamCount: 16,
  divisions: 4,
  teamsPerDivision: 4,
  regularSeasonWeeks: 10,
  playoffTeams: 6,
  firstRoundByes: 2,
  rosterLimit: 55,
  draftClassSize: 200,
  draftRounds: 5,
  picksPerRound: 16,
  initialFreeAgentPoolSize: 120,
  minSalaryCap: 200_000_000,
  maxSalaryCap: 250_000_000,
  capPerPrestigeStarAboveOne: 12_500_000,
  capComplianceDeadlineWeek: 4,
  tradeDeadlineWeek: 4,
  regularSeasonTrainingWindows: [3, 6, 9],
  trainingCampDays: 3,
  maxFocusedTrainingPlayers: 5,
  hallOfFameVotesPerTeam: 2,
  hallOfFameElectionThreshold: 4,
  autosaveEvents: [
    "roster",
    "contract",
    "lineup",
    "strategy",
    "scouting",
    "draft",
    "trade",
    "training",
    "positionChange",
    "award",
    "hallOfFame",
    "game",
    "week",
    "playoff",
    "season"
  ]
});

export const PHASES = Object.freeze({
  OFFSEASON: "offseason",
  PRESEASON: "preseason",
  REGULAR_SEASON: "regularSeason",
  PLAYOFFS: "playoffs",
  SEASON_REVIEW: "seasonReview"
});

export const POSITION_GROUPS = Object.freeze({
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
});

export const ROSTER_TEMPLATE = Object.freeze({
  QB: 3,
  RB: 4,
  WR: 7,
  TE: 4,
  OT: 5,
  OG: 5,
  C: 2,
  DL: 5,
  EDGE: 5,
  LB: 5,
  CB: 5,
  S: 3,
  K: 1,
  P: 1
});

export const SCHEME_ROSTER_ADJUSTMENTS = Object.freeze({
  offense: {
    westCoast: { WR: 1, TE: 0, RB: 0 },
    powerRun: { OT: 1, OG: 1, TE: 1, WR: -1 },
    spreadRpo: { WR: 1, RB: -1 },
    verticalAirRaid: { WR: 2, TE: -1, RB: -1 },
    balancedPro: {}
  },
  defense: {
    fourThreeZone: { DL: 1, LB: -1 },
    threeFourPressure: { LB: 1, EDGE: 1, DL: -1 },
    nickelMatch: { CB: 1, S: 1, LB: -1 },
    manBlitz: { CB: 1, EDGE: 1, DL: -1 },
    bendDontBreak: { S: 1, CB: 1, EDGE: -1 }
  }
});

export const OFFENSIVE_SYSTEMS = Object.freeze({
  WEST_COAST: "westCoast",
  POWER_RUN: "powerRun",
  SPREAD_RPO: "spreadRpo",
  VERTICAL_AIR_RAID: "verticalAirRaid",
  BALANCED_PRO: "balancedPro"
});

export const DEFENSIVE_SYSTEMS = Object.freeze({
  FOUR_THREE_ZONE: "fourThreeZone",
  THREE_FOUR_PRESSURE: "threeFourPressure",
  NICKEL_MATCH: "nickelMatch",
  MAN_BLITZ: "manBlitz",
  BEND_DONT_BREAK: "bendDontBreak"
});

export const DEFAULT_TENDENCIES = Object.freeze({
  tempo: 50,
  aggression: 50,
  runPassLean: 0,
  deepPassing: 50,
  blitzRate: 50,
  coverageRisk: 50
});

export const TENDENCY_RANGES = Object.freeze({
  tempo: [0, 100],
  aggression: [0, 100],
  runPassLean: [-100, 100],
  deepPassing: [0, 100],
  blitzRate: [0, 100],
  coverageRisk: [0, 100]
});

export const CONTRACT_BONUS_TYPES = Object.freeze([
  "championship",
  "playoffs",
  "divisionTitle",
  "topOffense",
  "topDefense",
  "statThreshold",
  "award"
]);

export const AWARD_TYPES = Object.freeze([
  "seasonMvp",
  "offensivePlayerOfYear",
  "defensivePlayerOfYear",
  "offensiveRookieOfYear",
  "defensiveRookieOfYear",
  "firstTeamAllPro",
  "secondTeamAllPro"
]);

export const TRAINING_INTENSITIES = Object.freeze({
  LIGHT: "light",
  STANDARD: "standard",
  AGGRESSIVE: "aggressive"
});

export const TRADE_STATUSES = Object.freeze({
  PROPOSED: "proposed",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed"
});

/**
 * Scheme-aware starter counts — how many starters per position each scheme fields on game day.
 * Offense always totals 11, defense always totals 11. These drive depth chart priority and
 * simulation matchup calculations.
 */
export const OFFENSIVE_STARTERS = Object.freeze({
  balancedPro:     { QB: 1, RB: 1, WR: 2, TE: 1, OT: 2, OG: 2, C: 1, EDGE: 0, DL: 0, LB: 0, CB: 0, S: 0 },
  westCoast:       { QB: 1, RB: 1, WR: 3, TE: 1, OT: 2, OG: 2, C: 1, EDGE: 0, DL: 0, LB: 0, CB: 0, S: 0 },
  powerRun:        { QB: 1, RB: 2, WR: 1, TE: 2, OT: 2, OG: 2, C: 1, EDGE: 0, DL: 0, LB: 0, CB: 0, S: 0 },
  spreadRpo:       { QB: 1, RB: 1, WR: 3, TE: 1, OT: 2, OG: 2, C: 1, EDGE: 0, DL: 0, LB: 0, CB: 0, S: 0 },
  verticalAirRaid: { QB: 1, RB: 1, WR: 4, TE: 0, OT: 2, OG: 2, C: 1, EDGE: 0, DL: 0, LB: 0, CB: 0, S: 0 },
});

export const DEFENSIVE_STARTERS = Object.freeze({
  fourThreeZone:      { QB: 0, RB: 0, WR: 0, TE: 0, OT: 0, OG: 0, C: 0, EDGE: 2, DL: 2, LB: 3, CB: 2, S: 2 },
  threeFourPressure:  { QB: 0, RB: 0, WR: 0, TE: 0, OT: 0, OG: 0, C: 0, EDGE: 2, DL: 1, LB: 4, CB: 2, S: 2 },
  nickelMatch:        { QB: 0, RB: 0, WR: 0, TE: 0, OT: 0, OG: 0, C: 0, EDGE: 2, DL: 1, LB: 2, CB: 3, S: 2 },
  manBlitz:           { QB: 0, RB: 0, WR: 0, TE: 0, OT: 0, OG: 0, C: 0, EDGE: 3, DL: 1, LB: 2, CB: 3, S: 2 },
  bendDontBreak:      { QB: 0, RB: 0, WR: 0, TE: 0, OT: 0, OG: 0, C: 0, EDGE: 1, DL: 2, LB: 2, CB: 3, S: 3 },
});

/**
 * Combined starter map for a given strategy (offense + defense).
 * Returns total starters per position.
 */
export function getSchemeStarters(strategy) {
  const off = OFFENSIVE_STARTERS[strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro;
  const def = DEFENSIVE_STARTERS[strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone;
  const result = {};
  for (const pos of Object.keys(ROSTER_TEMPLATE)) {
    result[pos] = (off[pos] || 0) + (def[pos] || 0);
  }
  return result;
}

export const RETURNER_ELIGIBLE_POSITIONS = Object.freeze(["CB", "S", "RB", "WR"]);

export const POSITION_CHANGE_GROUPS = Object.freeze({
  line: ["OT", "OG", "C"],
  defensiveFront: ["DL", "EDGE", "LB"],
  defensiveBacks: ["CB", "S"],
  receivers: ["WR", "TE"],
  specialists: ["K", "P"]
});

export const OFFENSIVE_CONCEPTS = Object.freeze([
  concept("insideZone", "run", ["RB", "OL"], "steady", ["powerRun", "balancedPro"]),
  concept("outsideZone", "run", ["RB", "OL"], "space", ["westCoast", "spreadRpo"]),
  concept("powerRun", "run", ["RB", "OL"], "physical", ["powerRun"]),
  concept("counter", "run", ["RB", "OL"], "misdirection", ["powerRun", "balancedPro"]),
  concept("rpoGlance", "option", ["QB", "WR", "RB"], "conflict", ["spreadRpo"]),
  concept("playAction", "pass", ["QB", "WR", "TE"], "explosive", ["powerRun", "balancedPro"]),
  concept("mesh", "pass", ["QB", "WR"], "efficient", ["westCoast", "spreadRpo"]),
  concept("stick", "pass", ["QB", "TE"], "efficient", ["westCoast", "balancedPro"]),
  concept("slants", "pass", ["QB", "WR"], "quick", ["westCoast", "spreadRpo"]),
  concept("fourVerticals", "pass", ["QB", "WR"], "volatile", ["verticalAirRaid"]),
  concept("flood", "pass", ["QB", "WR", "TE"], "levels", ["westCoast", "balancedPro"]),
  concept("screen", "pass", ["RB", "WR", "OL"], "constraint", ["westCoast", "spreadRpo"]),
  concept("draw", "run", ["RB", "OL"], "constraint", ["verticalAirRaid", "balancedPro"]),
  concept("qbOption", "option", ["QB", "RB"], "mobility", ["spreadRpo"])
]);

export const DEFENSIVE_CONCEPTS = Object.freeze([
  concept("manCoverage", "coverage", ["CB", "S"], "tight", ["manBlitz", "nickelMatch"]),
  concept("cover2", "coverage", ["CB", "S", "LB"], "shell", ["fourThreeZone", "bendDontBreak"]),
  concept("cover3", "coverage", ["CB", "S"], "middleClosed", ["fourThreeZone"]),
  concept("quarters", "coverage", ["CB", "S"], "shell", ["nickelMatch", "bendDontBreak"]),
  concept("matchZone", "coverage", ["CB", "S", "LB"], "adaptive", ["nickelMatch"]),
  concept("fireZoneBlitz", "pressure", ["EDGE", "LB", "CB"], "zonePressure", ["threeFourPressure"]),
  concept("doubleAGapPressure", "pressure", ["LB", "DL"], "interiorHeat", ["threeFourPressure", "manBlitz"]),
  concept("edgeBlitz", "pressure", ["EDGE", "LB", "CB"], "edgeHeat", ["threeFourPressure", "manBlitz"]),
  concept("simulatedPressure", "pressure", ["EDGE", "LB", "S"], "disguise", ["threeFourPressure", "nickelMatch"]),
  concept("runBlitz", "runDefense", ["DL", "LB", "S"], "physical", ["manBlitz", "fourThreeZone"]),
  concept("spy", "coverage", ["LB", "S"], "mobilityCounter", ["nickelMatch", "bendDontBreak"]),
  concept("prevent", "coverage", ["CB", "S"], "antiExplosive", ["bendDontBreak"])
]);

function concept(id, category, ratingDependencies, profile, preferredSystems) {
  return Object.freeze({ id, name: titleize(id), category, ratingDependencies, profile, preferredSystems });
}

function titleize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
