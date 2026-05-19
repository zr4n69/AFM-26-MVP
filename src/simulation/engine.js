import {
  DEFENSIVE_CONCEPTS,
  LEAGUE_RULES,
  OFFENSIVE_CONCEPTS,
  OFFENSIVE_STARTERS,
  DEFENSIVE_STARTERS,
  PHASES,
  RETURNER_ELIGIBLE_POSITIONS,
  ROSTER_TEMPLATE
} from "../data/constants.js";
import { recordAutosave } from "../data/actions.js";
import { createRng, makeId } from "../data/random.js";

const DRIVE_OUTCOMES = Object.freeze({
  TOUCHDOWN: "touchdown",
  FIELD_GOAL: "fieldGoal",
  PUNT: "punt",
  TURNOVER: "turnover",
  TURNOVER_ON_DOWNS: "turnoverOnDowns",
  SAFETY: "safety",
  END_OF_HALF: "endOfHalf"
});

export function selectDriveConcepts(offense, defense, situation = {}, rng = createRng("concept")) {
  const offensiveConcept = weightedPick(OFFENSIVE_CONCEPTS, (concept) =>
    offensiveConceptWeight(concept, offense.strategy, situation), rng);
  const defensiveConcept = weightedPick(DEFENSIVE_CONCEPTS, (concept) =>
    defensiveConceptWeight(concept, defense.strategy, situation), rng);
  return { offensiveConcept, defensiveConcept };
}

export function simulateGame(league, gameId, options = {}) {
  const game = requireGame(league, gameId);
  if (game.played && !options.replay) return game;

  const homeTeam = requireTeam(league, game.homeTeamId);
  const awayTeam = requireTeam(league, game.awayTeamId);
  runCpuTeamManagement(league);

  const rng = createRng(options.seed ?? `${league.seed}-${league.currentSeason}-${game.id}`);
  const driveCount = options.driveCount ?? driveCountFor(homeTeam, awayTeam, rng);
  const boxScore = createBoxScore(homeTeam, awayTeam);
  const driveLog = [];
  let possessionTeam = rng.next() < 0.5 ? awayTeam : homeTeam;
  const seasonWeeksLeft = Math.max(1, LEAGUE_RULES.regularSeasonWeeks - league.currentWeek);

  for (let driveNumber = 1; driveNumber <= driveCount; driveNumber += 1) {
    const defenseTeam = possessionTeam.id === homeTeam.id ? awayTeam : homeTeam;
    const drive = simulateDrive({
      driveNumber,
      offense: possessionTeam,
      defense: defenseTeam,
      homeTeam,
      awayTeam,
      boxScore,
      rng,
      season: league.currentSeason,
      seasonWeeksLeft
    });
    driveLog.push(drive);
    possessionTeam = defenseTeam;
  }

  if (boxScore.home.points === boxScore.away.points) {
    let otPossession = rng.next() < 0.5 ? awayTeam : homeTeam;
    for (let otDrive = 0; otDrive < 4; otDrive += 1) {
      const otDefense = otPossession.id === homeTeam.id ? awayTeam : homeTeam;
      const drive = simulateDrive({
        driveNumber: driveLog.length + 1,
        offense: otPossession,
        defense: otDefense,
        homeTeam,
        awayTeam,
        boxScore,
        rng,
        season: league.currentSeason,
        seasonWeeksLeft
      });
      driveLog.push(drive);
      if (boxScore.home.points !== boxScore.away.points) break;
      otPossession = otDefense;
    }
    if (boxScore.home.points === boxScore.away.points) {
      const overtimeWinner = teamStrength(homeTeam) + rng.next() > teamStrength(awayTeam) + rng.next() ? homeTeam : awayTeam;
      addScore(boxScore, overtimeWinner.id, homeTeam.id, 3);
      driveLog.push({
        driveNumber: driveLog.length + 1,
        possessionTeamId: overtimeWinner.id,
        startingFieldPosition: 50,
        timeUsedSeconds: 180,
        offensiveConceptId: "overtimeSetup",
        defensiveConceptId: "overtimePressure",
        yardsGained: 38,
        outcome: DRIVE_OUTCOMES.FIELD_GOAL,
        offensiveEvents: [],
        defensiveEvents: [],
        fatigueChanges: [],
        injuryChecks: [],
        keyPlayNotes: [`${overtimeWinner.name} wins on an overtime field goal.`]
      });
    }
  }

  game.played = true;
  game.driveLog = driveLog;
  game.boxScore = boxScore;
  game.injuries = driveLog.flatMap((drive) => drive.injuryChecks.filter((check) => check.injured));
  game.keyEvents = driveLog.flatMap((drive) => drive.keyPlayNotes).slice(0, 8);
  game.winnerTeamId = boxScore.home.points > boxScore.away.points ? homeTeam.id : awayTeam.id;
  game.loserTeamId = game.winnerTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;

  if (isRegularSeasonGame(league, game.id)) {
    applyGameResultToStandings(league, game, homeTeam, awayTeam);
  }

  // Update team morale based on game result
  updateMorale(homeTeam, game.winnerTeamId === homeTeam.id, boxScore.home.points, boxScore.away.points);
  updateMorale(awayTeam, game.winnerTeamId === awayTeam.id, boxScore.away.points, boxScore.home.points);

  // Generate storylines from notable game events
  generateStorylines(homeTeam, awayTeam, game, boxScore);

  league.games = league.games.filter((candidate) => candidate.id !== game.id);
  league.games.push(structuredClone(game));
  recordAutosave(league, "game", { gameId: game.id, winnerTeamId: game.winnerTeamId });
  return game;
}

export function simulateWeek(league, week = league.currentWeek + 1, options = {}) {
  const scheduleWeek = league.schedule.find((candidate) => candidate.week === week);
  if (!scheduleWeek) throw new Error(`Unknown regular-season week: ${week}`);
  league.phase = PHASES.REGULAR_SEASON;
  tickInjuryRecovery(league);
  runCpuTeamManagement(league);
  const games = scheduleWeek.games.map((game) => simulateGame(league, game.id, options));
  league.currentWeek = Math.max(league.currentWeek, week);
  for (const team of league.teams) {
    league.scouting.currencyByTeamId[team.id] = (league.scouting.currencyByTeamId[team.id] ?? 0) + 2;
  }

  // CPU teams auto-scout based on cpuCoverage preferences
  runCpuScouting(league, week);

  recordAutosave(league, "week", { week, games: games.map((game) => game.id) });
  return games;
}

function tickInjuryRecovery(league) {
  for (const team of league.teams) {
    for (const player of team.roster) {
      if (player.health.status !== "healthy") {
        player.health.weeksRemaining = Math.max(0, player.health.weeksRemaining - 1);
        if (player.health.weeksRemaining <= 0) {
          player.health = { status: "healthy", injury: null, weeksRemaining: 0 };
        } else {
          // Update game status as injury heals
          player.health.status = player.health.weeksRemaining >= 3 ? "out"
            : player.health.weeksRemaining === 2 ? "doubtful"
            : "questionable";
        }
      }
    }
  }
}

export function simulateRegularSeason(league, options = {}) {
  const weeks = [];
  for (let week = 1; week <= LEAGUE_RULES.regularSeasonWeeks; week += 1) {
    weeks.push(simulateWeek(league, week, options));
  }
  return weeks;
}

export function runCpuTeamManagement(league) {
  for (const team of league.teams) {
    team.depthChart = buildDepthChart(team.roster);
    team.rosterNeeds.invalidPositions = Object.entries(team.depthChart)
      .filter(([, playerIds]) => playerIds.length === 0)
      .map(([position]) => position);
    // Injury needs: positions where starter is injured
    team.rosterNeeds.injuryNeeds = team.roster
      .filter(p => p.health.status !== "healthy" && team.depthChart[p.position]?.[0] === p.id)
      .map(p => p.position);

    // Cap needs: flag if over cap or tight on space
    const committedCap = team.roster.reduce((sum, p) => sum + (p.contract?.capHit || 0), 0);
    const capSpace = team.salaryCap - committedCap;
    team.rosterNeeds.capNeeds = capSpace < 0 ? ["overCap"] : capSpace < team.salaryCap * 0.05 ? ["tight"] : [];

    // Scheme needs: positions where depth is below scheme template requirements
    const offScheme = OFFENSIVE_STARTERS[team.strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro;
    const defScheme = DEFENSIVE_STARTERS[team.strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone;
    const schemeTemplate = {};
    for (const pos of Object.keys(ROSTER_TEMPLATE)) {
      const schemeStarters = (offScheme[pos] || 0) + (defScheme[pos] || 0);
      // Need at least starters + 1 backup per position with starters
      const minNeeded = schemeStarters > 0 ? schemeStarters + 1 : (ROSTER_TEMPLATE[pos] || 1);
      const rosterCount = team.roster.filter(p => p.position === pos).length;
      if (rosterCount < minNeeded) {
        schemeTemplate[pos] = minNeeded - rosterCount;
      }
    }
    team.rosterNeeds.schemeNeeds = Object.entries(schemeTemplate).map(([pos, deficit]) => ({ position: pos, deficit }));

    team.cpuPlan.repairInvalidRoster = team.rosterNeeds.invalidPositions.length > 0;
    team.cpuPlan.releaseCandidates = team.roster
      .filter((player) => player.overall < 56 && player.contract.capHit > 1_000_000)
      .map((player) => player.id)
      .slice(0, 3);
    team.cpuPlan.trainingPriorities = team.roster
      .filter((player) => player.potentialStars >= 4 && player.age <= 25)
      .sort((left, right) => right.potentialStars - left.potentialStars || right.overall - left.overall)
      .map((player) => player.id)
      .slice(0, LEAGUE_RULES.maxFocusedTrainingPlayers);
    if (!team.isPlayerControlled) {
      autoAssignReturner(team);
    }
  }
  return league.teams.map((team) => ({ teamId: team.id, cpuPlan: team.cpuPlan, rosterNeeds: team.rosterNeeds }));
}

export function generatePlayoffSeeds(league) {
  return [...league.standings]
    .sort((left, right) => right.winPct - left.winPct || pointDifferential(league, right.teamId) - pointDifferential(league, left.teamId))
    .slice(0, LEAGUE_RULES.playoffTeams)
    .map((standing) => standing.teamId);
}

export function simulatePlayoffRound(league, roundName, options = {}) {
  const round = league.playoff.rounds.find((candidate) => candidate.name === roundName);
  if (!round) throw new Error(`Unknown playoff round: ${roundName}`);
  const games = round.games.map((game) => simulateGame(league, game.id, options));

  if (roundName === "firstRound") {
    const remaining = [
      seedEntry(league, 1),
      seedEntry(league, 2),
      ...games.map((game) => seedEntryByTeamId(league, game.winnerTeamId))
    ].sort((left, right) => left.seed - right.seed);
    const semifinals = league.playoff.rounds.find((candidate) => candidate.name === "semifinals");
    semifinals.games = [
      playoffGame(remaining[0].seed, remaining[0].teamId, remaining[3].seed, remaining[3].teamId, "semifinal_1"),
      playoffGame(remaining[1].seed, remaining[1].teamId, remaining[2].seed, remaining[2].teamId, "semifinal_2")
    ];
  }

  if (roundName === "semifinals") {
    const winners = games.map((game) => seedEntryByTeamId(league, game.winnerTeamId))
      .sort((left, right) => left.seed - right.seed);
    const championship = league.playoff.rounds.find((candidate) => candidate.name === "championship");
    championship.games = [
      playoffGame(winners[0].seed, winners[0].teamId, winners[1].seed, winners[1].teamId, "championship")
    ];
  }

  if (roundName === "championship") {
    league.playoff.championTeamId = games[0]?.winnerTeamId ?? null;
    recordAutosave(league, "playoff", { action: "crownChampion", championTeamId: league.playoff.championTeamId });
  } else {
    recordAutosave(league, "playoff", { action: "simulateRound", roundName });
  }
  return games;
}

function simulateDrive({ driveNumber, offense, defense, homeTeam, awayTeam, boxScore, rng, season, seasonWeeksLeft }) {
  const situation = {
    fieldPosition: rng.int(15, 85),
    scoreDiff: scoreFor(boxScore, offense.id, homeTeam.id) - scoreFor(boxScore, defense.id, homeTeam.id),
    quarter: Math.min(4, Math.ceil(driveNumber / 6)),
    season,
    seasonWeeksLeft
  };
  const { offensiveConcept, defensiveConcept } = selectDriveConcepts(offense, defense, situation, rng);
  const offenseStrength = matchupStrength(offense, offensiveConcept.ratingDependencies);
  const defenseStrength = matchupStrength(defense, defensiveConcept.ratingDependencies);
  const risk = (offense.strategy.tendencies.aggression + offense.strategy.tendencies.deepPassing) / 200;
  const blitzPressure = defense.strategy.tendencies.blitzRate / 100;
  const coverageGamble = defense.strategy.tendencies.coverageRisk / 100;
  const pressure = (blitzPressure + coverageGamble) / 2;
  const homeBonus = offense.id === homeTeam.id ? 2.0 : (defense.id === homeTeam.id ? -1.5 : 0);
  const conceptFit = conceptMatchup(offensiveConcept, defensiveConcept);
  const strengthDiff = (offenseStrength - defenseStrength) * 1.8;
  const sparkBonus = hasTrait(offense, "bigPlaySpark") ? rng.int(0, 6) : 0;
  const conservativePenalty = hasTrait(offense, "conservative") ? -2 : 0;
  const noiseRange = Math.round(24 + coverageGamble * 10);
  const noise = rng.int(-noiseRange, noiseRange);
  const raw = strengthDiff + conceptFit + homeBonus + noise + sparkBonus + conservativePenalty;
  const yardsGained = clamp(Math.round(18 + raw + risk * 12 - pressure * 10), -20, 75);
  const outcome = resolveOutcome({ yardsGained, risk, pressure, fieldPosition: situation.fieldPosition, rng });
  const points = pointsForOutcome(outcome);
  const scoringTeamId = outcome === DRIVE_OUTCOMES.SAFETY ? defense.id : offense.id;
  addScore(boxScore, scoringTeamId, homeTeam.id, points);

  const offensiveEvents = applyOffensiveStats(offense, offensiveConcept, yardsGained, outcome, rng);
  const defensiveEvents = applyDefensiveStats(defense, defensiveConcept, outcome, yardsGained, pressure, rng);
  const fatigueChanges = applyFatigue(offense, defense, offensiveConcept, defensiveConcept);
  const injuryChecks = checkDriveInjuries(offense, defense, fatigueChanges, rng, situation.season, situation.seasonWeeksLeft);
  const keyPlayNotes = createKeyPlayNotes(offense, defense, offensiveConcept, defensiveConcept, outcome, yardsGained);

  // Mark meaningful playtime for all players who accumulated stats
  for (const evt of [...offensiveEvents, ...defensiveEvents]) {
    const player = offense.roster.find(p => p.id === evt.playerId) || defense.roster.find(p => p.id === evt.playerId);
    if (player?.development) player.development.meaningfulPlaytime = true;
  }

  updateBoxScoreStats(boxScore, offense.id, homeTeam.id, offensiveEvents, defensiveEvents, yardsGained, outcome);

  return {
    driveNumber,
    possessionTeamId: offense.id,
    startingFieldPosition: situation.fieldPosition,
    timeUsedSeconds: rng.int(95, 420),
    offensiveConceptId: offensiveConcept.id,
    defensiveConceptId: defensiveConcept.id,
    yardsGained,
    outcome,
    offensiveEvents,
    defensiveEvents,
    fatigueChanges,
    injuryChecks,
    keyPlayNotes
  };
}

function resolveOutcome({ yardsGained, risk, pressure, fieldPosition, rng }) {
  const turnoverChance = 0.04 + risk * 0.06 + pressure * 0.05 + (yardsGained < 0 ? 0.04 : 0);
  if (fieldPosition <= 8 && yardsGained <= -4 && rng.next() < 0.22) return DRIVE_OUTCOMES.SAFETY;
  if (rng.next() < turnoverChance) return DRIVE_OUTCOMES.TURNOVER;
  if (fieldPosition + yardsGained >= 100) return DRIVE_OUTCOMES.TOUCHDOWN;
  if (yardsGained >= 65) return DRIVE_OUTCOMES.TOUCHDOWN;
  if (yardsGained >= 50 && rng.next() < 0.35) return DRIVE_OUTCOMES.TOUCHDOWN;
  if (fieldPosition + yardsGained >= 75 && rng.next() < 0.65) return DRIVE_OUTCOMES.FIELD_GOAL;
  if (yardsGained >= 40 && rng.next() < 0.12) return DRIVE_OUTCOMES.TOUCHDOWN;
  if (yardsGained >= 35 && rng.next() < 0.22) return DRIVE_OUTCOMES.FIELD_GOAL;
  if (yardsGained >= 25 && rng.next() < 0.08) return DRIVE_OUTCOMES.FIELD_GOAL;
  if (yardsGained < 10 && rng.next() < 0.18) return DRIVE_OUTCOMES.TURNOVER_ON_DOWNS;
  return DRIVE_OUTCOMES.PUNT;
}

function applyOffensiveStats(team, concept, yards, outcome, rng) {
  const events = [];
  const scheme = OFFENSIVE_STARTERS[team.strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro;
  const anyAvailable = firstAvailablePlayer(team, ["QB", "RB", "WR", "TE", "OT", "OG", "C"]);
  const qb = firstDepthPlayer(team, "QB") ?? anyAvailable;
  if (!qb) return events;
  const runners = depthPlayers(team, "RB", Math.max(1, scheme.RB));
  const runner = runners.length > 0 ? rng.pick(runners) : qb;
  const wrCount = Math.max(1, scheme.WR);
  const teCount = Math.max(0, scheme.TE);
  const receivers = [...depthPlayers(team, "WR", wrCount), ...depthPlayers(team, "TE", teCount)];
  const receiver = receivers.length > 0 ? rng.pick(receivers) : runner;
  const touchdown = outcome === DRIVE_OUTCOMES.TOUCHDOWN;
  const safeYards = Math.max(0, yards);

  if (concept.category === "run" || concept.category === "option") {
    runner.stats.rushingYards += safeYards;
    if (touchdown) runner.stats.rushingTouchdowns += 1;
    events.push({ playerId: runner.id, stat: "rushingYards", value: safeYards });
  } else {
    qb.stats.passingYards += safeYards;
    receiver.stats.receivingYards += safeYards;
    if (touchdown) {
      qb.stats.passingTouchdowns += 1;
      receiver.stats.receivingTouchdowns += 1;
    }
    events.push({ playerId: qb.id, stat: "passingYards", value: safeYards });
    events.push({ playerId: receiver.id, stat: "receivingYards", value: safeYards });
  }
  if (outcome === DRIVE_OUTCOMES.TURNOVER && concept.category !== "run" && rng.next() < 0.65) {
    qb.stats.interceptionsThrown += 1;
    events.push({ playerId: qb.id, stat: "interceptionsThrown", value: 1 });
  }
  return events;
}

function applyDefensiveStats(team, concept, outcome, yards, pressure, rng) {
  const events = [];
  const scheme = DEFENSIVE_STARTERS[team.strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone;
  const tacklers = [
    ...depthPlayers(team, "LB", Math.max(1, scheme.LB)),
    ...depthPlayers(team, "S", Math.max(1, scheme.S)),
    ...depthPlayers(team, "CB", Math.max(1, scheme.CB)),
  ];
  const fallback = firstAvailablePlayer(team, ["DL", "EDGE", "LB", "CB", "S"]) ?? team.roster[0];
  const tackler = tacklers.length > 0 ? rng.pick(tacklers) : fallback;
  if (!tackler) return events;
  tackler.stats.tackles += 1;
  events.push({ playerId: tackler.id, stat: "tackles", value: 1 });

  if (yards < 0) {
    tackler.stats.tacklesForLoss += 1;
    events.push({ playerId: tackler.id, stat: "tacklesForLoss", value: 1 });
  }
  if ((concept.category === "pressure" || rng.next() < pressure * 0.18) && yards <= 8) {
    const rushers = [...depthPlayers(team, "EDGE", Math.max(1, scheme.EDGE)), ...depthPlayers(team, "DL", Math.max(1, scheme.DL))];
    const rusher = rushers.length > 0 ? rng.pick(rushers) : tackler;
    rusher.stats.sacks += 1;
    events.push({ playerId: rusher.id, stat: "sacks", value: 1 });
  }
  if (outcome === DRIVE_OUTCOMES.TURNOVER) {
    const coverPlayers = [...depthPlayers(team, "CB", Math.max(1, scheme.CB)), ...depthPlayers(team, "S", Math.max(1, scheme.S))];
    const defender = coverPlayers.length > 0 ? rng.pick(coverPlayers) : tackler;
    defender.stats.interceptions += 1;
    events.push({ playerId: defender.id, stat: "interceptions", value: 1 });
  }
  if (concept.category === "coverage" && rng.next() < 0.35) {
    const coverPlayers = [...depthPlayers(team, "CB", Math.max(1, scheme.CB)), ...depthPlayers(team, "S", Math.max(1, scheme.S))];
    const cover = coverPlayers.length > 0 ? rng.pick(coverPlayers) : tackler;
    cover.stats.passDeflections += 1;
    events.push({ playerId: cover.id, stat: "passDeflections", value: 1 });
  }
  if (outcome === DRIVE_OUTCOMES.PUNT && rng.next() < 0.015) {
    const rushers = [...depthPlayers(team, "EDGE", 2), ...depthPlayers(team, "DL", 2)];
    const rusher = rushers.length > 0 ? rng.pick(rushers) : tackler;
    rusher.stats.puntDeflections += 1;
    events.push({ playerId: rusher.id, stat: "puntDeflections", value: 1 });
  }
  if (outcome === DRIVE_OUTCOMES.FIELD_GOAL && rng.next() < 0.02) {
    const rushers = [...depthPlayers(team, "DL", 2), ...depthPlayers(team, "EDGE", 2)];
    const rusher = rushers.length > 0 ? rng.pick(rushers) : tackler;
    rusher.stats.kickDeflections += 1;
    events.push({ playerId: rusher.id, stat: "kickDeflections", value: 1 });
  }
  return events;
}

function applyFatigue(offense, defense, offensiveConcept, defensiveConcept) {
  const offensiveDelta = offensiveConcept.category === "run" ? 2 : 1;
  const defensiveDelta = defensiveConcept.category === "pressure" || defensiveConcept.category === "runDefense" ? 2 : 1;
  const changes = [];

  // Use scheme starter counts to determine how many players at each position get fatigued
  const offScheme = OFFENSIVE_STARTERS[offense.strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro;
  const offPositions = ["QB", "RB", "WR", "TE", "OT", "OG", "C"];
  const offPlayers = offPositions.flatMap(pos => {
    const count = offScheme[pos] || 0;
    return count > 0 ? depthPlayers(offense, pos, count) : [];
  });
  for (const player of offPlayers) {
    const traitMod = player.traits.includes("highMotor") ? -1 : player.traits.includes("takesPlaysOff") ? 1 : 0;
    const delta = Math.max(0, offensiveDelta + traitMod);
    player.fatigue = clamp(player.fatigue + delta, 0, 100);
    changes.push({ playerId: player.id, delta });
  }

  const defScheme = DEFENSIVE_STARTERS[defense.strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone;
  const defPositions = ["DL", "EDGE", "LB", "CB", "S"];
  const defPlayers = defPositions.flatMap(pos => {
    const count = defScheme[pos] || 0;
    return count > 0 ? depthPlayers(defense, pos, count) : [];
  });
  for (const player of defPlayers) {
    const traitMod = player.traits.includes("highMotor") ? -1 : player.traits.includes("takesPlaysOff") ? 1 : 0;
    const delta = Math.max(0, defensiveDelta + traitMod);
    player.fatigue = clamp(player.fatigue + delta, 0, 100);
    changes.push({ playerId: player.id, delta });
  }
  rotateSubstitutions(offense);
  rotateSubstitutions(defense);
  return changes;
}

const SUB_FATIGUE_THRESHOLD = 55;
const SUB_RECOVERY_PER_DRIVE = 4;
const NO_SUB_POSITIONS = new Set(["QB", "K", "P"]);

function rotateSubstitutions(team) {
  for (const [position, playerIds] of Object.entries(team.depthChart)) {
    if (NO_SUB_POSITIONS.has(position) || playerIds.length < 2) continue;
    const starter = team.roster.find((p) => p.id === playerIds[0]);
    if (!starter || starter.fatigue < SUB_FATIGUE_THRESHOLD) continue;
    const backup = team.roster.find((p) => p.id === playerIds[1]);
    if (!backup || backup.health.status !== "healthy") continue;
    if (backup.fatigue >= starter.fatigue) continue;
    team.depthChart[position] = [playerIds[1], playerIds[0], ...playerIds.slice(2)];
    starter.fatigue = clamp(starter.fatigue - SUB_RECOVERY_PER_DRIVE, 0, 100);
  }
}

const SCOUT_GROUPS = ["QB", "RB", "WR", "OL", "EDGE", "DT", "LB", "CB", "S"];
const SCOUT_LEVELS = ["surface", "standard", "deep"];

function runCpuScouting(league, week) {
  // CPU teams scout every 2 weeks starting week 2
  if (week < 2 || week % 2 !== 0) return;
  const rng = createRng(`cpu-scout-${league.seed}-${league.currentSeason}-${week}`);

  for (const team of league.teams) {
    if (team.isPlayerControlled) continue;
    const coverage = league.scouting.cpuCoverage?.[team.id];
    if (!coverage) continue;

    const currency = league.scouting.currencyByTeamId[team.id] || 0;
    if (currency < 2) continue;

    // Pick a group to scout based on team needs
    const revealed = league.scouting.revealedGroupsByTeamId[team.id] || {};
    const unscoutedGroups = SCOUT_GROUPS.filter(g => !revealed[g]);
    const partialGroups = SCOUT_GROUPS.filter(g => revealed[g] && revealed[g] !== "deep");

    let targetGroup;
    if (unscoutedGroups.length > 0) {
      targetGroup = rng.pick(unscoutedGroups);
    } else if (partialGroups.length > 0) {
      targetGroup = rng.pick(partialGroups);
    } else {
      continue; // Fully scouted
    }

    const currentLevel = revealed[targetGroup];
    const nextLevel = currentLevel ? SCOUT_LEVELS[SCOUT_LEVELS.indexOf(currentLevel) + 1] : "surface";
    if (!nextLevel) continue;

    // Spend currency and record the reveal
    league.scouting.currencyByTeamId[team.id] = Math.max(0, currency - 2);
    league.scouting.revealedGroupsByTeamId[team.id][targetGroup] = nextLevel;

    // Track in cpuCoverage
    if (!coverage.scoutedProspectIds) coverage.scoutedProspectIds = [];
    const groupProspects = (league.draftClass || []).filter(p => {
      const pGroup = { OT: "OL", OG: "OL", C: "OL", DL: "DT", TE: "WR" }[p.position] || p.position;
      return pGroup === targetGroup;
    });
    for (const p of groupProspects) {
      if (!coverage.scoutedProspectIds.includes(p.id)) coverage.scoutedProspectIds.push(p.id);
    }
  }
}

function generateStorylines(homeTeam, awayTeam, game, boxScore) {
  const winner = game.winnerTeamId === homeTeam.id ? homeTeam : awayTeam;
  const loser = game.winnerTeamId === homeTeam.id ? awayTeam : homeTeam;
  const margin = Math.abs(boxScore.home.points - boxScore.away.points);

  // Win streak tracking
  const winnerStandings = winner.standings || {};
  if (winnerStandings.wins >= 4) {
    addStoryline(winner, "hotStreak", `${winner.name} riding a ${winnerStandings.wins}-win streak`);
  }
  const loserStandings = loser.standings || {};
  if (loserStandings.losses >= 4) {
    addStoryline(loser, "coldStreak", `${loser.name} mired in a ${loserStandings.losses}-game skid`);
  }

  // Blowout
  if (margin >= 28) {
    addStoryline(winner, "blowoutWin", `Dominant ${margin}-point victory over ${loser.name}`);
  }

  // Close game
  if (margin <= 3) {
    addStoryline(winner, "closeWin", `Nail-biter ${margin}-point win over ${loser.name}`);
  }

  // Big individual performances
  for (const team of [homeTeam, awayTeam]) {
    for (const player of team.roster) {
      if (player.stats.passingYards >= 400) {
        addStoryline(team, "bigGame", `${player.firstName} ${player.lastName} threw for ${player.stats.passingYards}+ yards`);
      }
      if (player.stats.rushingYards >= 200) {
        addStoryline(team, "bigGame", `${player.firstName} ${player.lastName} rushed for ${player.stats.rushingYards}+ yards`);
      }
    }
  }
}

function addStoryline(team, type, text) {
  team.storylines ??= [];
  // Keep only recent storylines (last 8)
  if (team.storylines.length >= 8) team.storylines.shift();
  team.storylines.push({ type, text });
}

function updateMorale(team, won, pointsFor, pointsAgainst) {
  team.morale ??= { score: 50, notes: [] };
  const margin = pointsFor - pointsAgainst;
  const shift = won
    ? (margin >= 21 ? 6 : margin >= 10 ? 4 : 2)
    : (margin <= -21 ? -6 : margin <= -10 ? -4 : -2);
  team.morale.score = clamp(team.morale.score + shift, 10, 95);
  const note = won
    ? (margin >= 21 ? "Blowout win" : "Win")
    : (margin <= -21 ? "Blowout loss" : "Loss");
  team.morale.notes = [...team.morale.notes.slice(-4), note];
}

const INJURY_TIERS = [
  { name: "Mild sprain", minWeeks: 1, maxWeeks: 1, weight: 40 },
  { name: "Muscle strain", minWeeks: 1, maxWeeks: 2, weight: 25 },
  { name: "Ligament sprain", minWeeks: 2, maxWeeks: 4, weight: 15 },
  { name: "Bone bruise", minWeeks: 2, maxWeeks: 3, weight: 8 },
  { name: "Fracture", minWeeks: 3, maxWeeks: 6, weight: 6 },
  { name: "Torn ligament", minWeeks: 6, maxWeeks: 10, weight: 4 },
  { name: "Season-ending tear", minWeeks: 99, maxWeeks: 99, weight: 2 }
];

function rollInjury(rng, seasonWeeksLeft) {
  const total = INJURY_TIERS.reduce((sum, t) => sum + t.weight, 0);
  let roll = rng.next() * total;
  for (const tier of INJURY_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) {
      const weeks = tier.maxWeeks === 99
        ? Math.max(seasonWeeksLeft, 1)
        : rng.int(tier.minWeeks, tier.maxWeeks);
      return { name: tier.name, weeksRemaining: Math.max(1, weeks) };
    }
  }
  return { name: INJURY_TIERS[0].name, weeksRemaining: 1 };
}

function checkDriveInjuries(offense, defense, fatigueChanges, rng, season, seasonWeeksLeft) {
  const checks = [];
  for (const { playerId } of fatigueChanges) {
    const team = findPlayer(offense, playerId) ? offense : defense;
    const player = findPlayer(team, playerId);
    if (!player || player.health.status !== "healthy") continue;
    const durableBonus = player.traits.includes("durable") ? -0.003 : 0;
    const fragileBonus = player.traits.includes("fragile") ? 0.008 : 0;
    const chance = 0.0008 + player.fatigue / 65000 + fragileBonus + durableBonus;
    const injured = rng.next() < Math.max(0, chance);
    if (injured) {
      const injury = rollInjury(rng, seasonWeeksLeft);
      // Set NFL-style game status based on severity
      const gameStatus = injury.weeksRemaining >= 3 ? "out"
        : injury.weeksRemaining === 2 ? "doubtful"
        : "questionable";
      player.health = { status: gameStatus, injury: injury.name, weeksRemaining: injury.weeksRemaining };
      player.injuryHistory.push({ injury: injury.name, season, weeksRemaining: injury.weeksRemaining });
      substituteInjuredPlayer(team, player);
    }
    checks.push({ playerId, injured, injury: injured ? player.health.injury : null, weeksRemaining: injured ? player.health.weeksRemaining : 0 });
  }
  return checks;
}

function substituteInjuredPlayer(team, injuredPlayer) {
  const position = injuredPlayer.position;
  const depthIds = team.depthChart[position];
  if (!depthIds) return;
  team.depthChart[position] = depthIds.filter((id) => id !== injuredPlayer.id);
  if (team.depthChart[position].length === 0) {
    const fallback = team.roster.find(
      (p) => p.position === position && p.id !== injuredPlayer.id && p.health.status === "healthy"
    );
    if (fallback) team.depthChart[position] = [fallback.id];
  }
}

function updateBoxScoreStats(boxScore, offenseTeamId, homeTeamId, offensiveEvents, defensiveEvents, yards, outcome) {
  const side = offenseTeamId === homeTeamId ? boxScore.home : boxScore.away;
  side.totalYards += Math.max(0, yards);
  side.turnovers += outcome === DRIVE_OUTCOMES.TURNOVER ? 1 : 0;
  side.offensiveEvents.push(...offensiveEvents);
  const defenseSide = offenseTeamId === homeTeamId ? boxScore.away : boxScore.home;
  defenseSide.defensiveEvents.push(...defensiveEvents);
}

function createBoxScore(homeTeam, awayTeam) {
  return {
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    home: { points: 0, totalYards: 0, turnovers: 0, offensiveEvents: [], defensiveEvents: [] },
    away: { points: 0, totalYards: 0, turnovers: 0, offensiveEvents: [], defensiveEvents: [] }
  };
}

function addScore(boxScore, teamId, homeTeamId, points) {
  if (points === 0) return;
  const side = teamId === homeTeamId ? boxScore.home : boxScore.away;
  side.points += points;
}

function applyGameResultToStandings(league, game, homeTeam, awayTeam) {
  const homeStanding = requireStanding(league, homeTeam.id);
  const awayStanding = requireStanding(league, awayTeam.id);
  const homePoints = game.boxScore.home.points;
  const awayPoints = game.boxScore.away.points;

  homeTeam.standings.pointsFor += homePoints;
  homeTeam.standings.pointsAgainst += awayPoints;
  awayTeam.standings.pointsFor += awayPoints;
  awayTeam.standings.pointsAgainst += homePoints;
  homeStanding.pointsFor = (homeStanding.pointsFor ?? 0) + homePoints;
  homeStanding.pointsAgainst = (homeStanding.pointsAgainst ?? 0) + awayPoints;
  awayStanding.pointsFor = (awayStanding.pointsFor ?? 0) + awayPoints;
  awayStanding.pointsAgainst = (awayStanding.pointsAgainst ?? 0) + homePoints;

  if (game.winnerTeamId === homeTeam.id) {
    homeTeam.standings.wins += 1;
    awayTeam.standings.losses += 1;
    homeStanding.wins += 1;
    awayStanding.losses += 1;
  } else {
    awayTeam.standings.wins += 1;
    homeTeam.standings.losses += 1;
    awayStanding.wins += 1;
    homeStanding.losses += 1;
  }
  for (const standing of [homeStanding, awayStanding]) {
    const games = standing.wins + standing.losses + standing.ties;
    standing.winPct = games === 0 ? 0 : Number(((standing.wins + standing.ties * 0.5) / games).toFixed(3));
  }
}

function offensiveConceptWeight(concept, strategy, situation) {
  let weight = concept.preferredSystems.includes(strategy.offensiveSystem) ? 6 : 2;
  if (concept.category === "run") weight += Math.max(0, strategy.tendencies.runPassLean) / 25;
  if (concept.category === "pass") weight += Math.max(0, -strategy.tendencies.runPassLean) / 25;
  if (concept.id === "fourVerticals" || concept.profile === "explosive") weight += strategy.tendencies.deepPassing / 20;
  if (situation.scoreDiff < -10 && concept.category === "pass") weight += 3;
  if (situation.scoreDiff > 10 && concept.category === "run") weight += 2;
  return weight;
}

function defensiveConceptWeight(concept, strategy, situation) {
  let weight = concept.preferredSystems.includes(strategy.defensiveSystem) ? 6 : 2;
  if (concept.category === "pressure") weight += strategy.tendencies.blitzRate / 18;
  if (concept.category === "coverage") weight += strategy.tendencies.coverageRisk / 25;
  if (situation.scoreDiff < -10 && concept.id === "prevent") weight += 2;
  return weight;
}

function matchupStrength(team, positions) {
  const offStarters = OFFENSIVE_STARTERS[team.strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro;
  const defStarters = DEFENSIVE_STARTERS[team.strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone;
  const players = positions.flatMap((position) => {
    if (position === "OL") {
      return [
        ...topPlayers(team, ["OT"], offStarters.OT || 2),
        ...topPlayers(team, ["OG"], offStarters.OG || 2),
        ...topPlayers(team, ["C"], offStarters.C || 1),
      ];
    }
    const count = offStarters[position] || defStarters[position] || 2;
    // Skip positions with 0 scheme starters (e.g., TE in Air Raid)
    if (count === 0) return [];
    return topPlayers(team, [position], count);
  });
  if (players.length === 0) return teamStrength(team);
  return players.reduce((sum, player) => sum + playerEffective(player), 0) / players.length;
}

function playerEffective(player) {
  let value = player.overall - player.fatigue * 0.12;
  if (player.traits.includes("technician")) value += 2;
  if (player.traits.includes("rawTools")) value -= 1;
  if (player.traits.includes("highMotor")) value += 1;
  if (player.traits.includes("takesPlaysOff")) value -= player.fatigue > 50 ? 3 : 1;
  return value;
}

function teamStrength(team) {
  const starters = Object.values(team.depthChart).map((ids) => ids[0]).filter(Boolean)
    .map((playerId) => team.roster.find((player) => player.id === playerId))
    .filter(Boolean);
  if (starters.length === 0) return 50;
  const leaderCount = team.roster.filter((p) => p.traits.includes("leader")).length;
  const riskCount = team.roster.filter((p) => p.traits.includes("lockerRoomRisk")).length;
  const chemistryBonus = leaderCount * 0.4 - riskCount * 0.6;
  return starters.reduce((sum, player) => sum + player.overall - player.fatigue * 0.06, 0) / starters.length + chemistryBonus;
}

function conceptMatchup(offensiveConcept, defensiveConcept) {
  if (offensiveConcept.category === "run" && defensiveConcept.category === "runDefense") return -8;
  if (offensiveConcept.category === "pass" && defensiveConcept.category === "coverage") return -5;
  if (offensiveConcept.profile === "volatile" && defensiveConcept.category === "pressure") return -7;
  if (offensiveConcept.category === "option" && defensiveConcept.id === "spy") return -8;
  if (offensiveConcept.category === "pass" && defensiveConcept.category === "runDefense") return 6;
  if (offensiveConcept.category === "run" && defensiveConcept.category === "coverage") return 5;
  if (offensiveConcept.profile === "constraint" && defensiveConcept.category === "pressure") return 7;
  if (offensiveConcept.profile === "quick" && defensiveConcept.category === "pressure") return 4;
  if (offensiveConcept.category === "option" && defensiveConcept.category === "coverage") return 4;
  return 0;
}

function createKeyPlayNotes(offense, defense, offensiveConcept, defensiveConcept, outcome, yards) {
  if (outcome === DRIVE_OUTCOMES.TOUCHDOWN) return [`${offense.name} hit ${offensiveConcept.name} against ${defensiveConcept.name} for a touchdown.`];
  if (outcome === DRIVE_OUTCOMES.TURNOVER) return [`${defense.name} forced a turnover while showing ${defensiveConcept.name}.`];
  if (yards >= 45) return [`${offense.name} created an explosive ${yards}-yard drive with ${offensiveConcept.name}.`];
  if (yards < 0) return [`${defense.name} buried the drive with ${defensiveConcept.name}.`];
  return [];
}

function driveCountFor(homeTeam, awayTeam, rng) {
  const tempo = (homeTeam.strategy.tendencies.tempo + awayTeam.strategy.tendencies.tempo) / 2;
  return clamp(Math.round(18 + tempo / 8 + rng.int(-3, 3)), 16, 32);
}

function pointsForOutcome(outcome) {
  if (outcome === DRIVE_OUTCOMES.TOUCHDOWN) return 7;
  if (outcome === DRIVE_OUTCOMES.FIELD_GOAL) return 3;
  if (outcome === DRIVE_OUTCOMES.SAFETY) return 2;
  return 0;
}

function requireGame(league, gameId) {
  for (const week of league.schedule) {
    const game = week.games.find((candidate) => candidate.id === gameId);
    if (game) return game;
  }
  for (const round of league.playoff.rounds ?? []) {
    const game = round.games.find((candidate) => candidate.id === gameId);
    if (game) return game;
  }
  throw new Error(`Unknown game: ${gameId}`);
}

function isRegularSeasonGame(league, gameId) {
  return league.schedule.some((week) => week.games.some((game) => game.id === gameId));
}

function playoffGame(homeSeed, homeTeamId, awaySeed, awayTeamId, suffix) {
  return {
    id: makeId("playoff", [leagueSafeSuffix(suffix)]),
    homeSeed,
    homeTeamId,
    awaySeed,
    awayTeamId,
    winnerTeamId: null,
    played: false,
    driveLog: [],
    boxScore: null,
    injuries: [],
    keyEvents: []
  };
}

function seedEntry(league, seed) {
  const entry = league.playoff.seeds.find((candidate) => candidate.seed === seed);
  if (!entry) throw new Error(`Unknown playoff seed: ${seed}`);
  return entry;
}

function seedEntryByTeamId(league, teamId) {
  const entry = league.playoff.seeds.find((candidate) => candidate.teamId === teamId);
  if (!entry) throw new Error(`Team ${teamId} is not in the playoff bracket.`);
  return entry;
}

function leagueSafeSuffix(suffix) {
  return suffix ?? "game";
}

function requireTeam(league, teamId) {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  return team;
}

function requireStanding(league, teamId) {
  const standing = league.standings.find((candidate) => candidate.teamId === teamId);
  if (!standing) throw new Error(`Unknown standing team: ${teamId}`);
  return standing;
}

function firstDepthPlayer(team, position) {
  const id = team.depthChart[position]?.[0];
  return id ? team.roster.find((player) => player.id === id) : null;
}

function depthPlayers(team, position, limit) {
  const ids = (team.depthChart[position] ?? []).slice(0, limit);
  return ids.map((id) => team.roster.find((player) => player.id === id)).filter(Boolean);
}

function firstAvailablePlayer(team, positions) {
  for (const pos of positions) {
    const player = firstDepthPlayer(team, pos);
    if (player) return player;
  }
  return team.roster.find((p) => p.health.status === "healthy") ?? null;
}

function topPlayers(team, positions, limit) {
  return positions.flatMap((position) => team.depthChart[position] ?? [])
    .map((playerId) => team.roster.find((player) => player.id === playerId))
    .filter(Boolean)
    .slice(0, limit);
}

function findPlayer(team, playerId) {
  return team.roster.find((player) => player.id === playerId);
}

function hasTrait(team, trait) {
  const starters = Object.values(team.depthChart).map((ids) => ids[0]).filter(Boolean);
  return team.roster.some((p) => starters.includes(p.id) && p.traits.includes(trait));
}

function autoAssignReturner(team) {
  const currentReturner = team.returnerId ? team.roster.find((p) => p.id === team.returnerId) : null;
  if (currentReturner && currentReturner.health.status === "healthy" && RETURNER_ELIGIBLE_POSITIONS.includes(currentReturner.position)) {
    return;
  }
  const eligible = team.roster
    .filter((p) => RETURNER_ELIGIBLE_POSITIONS.includes(p.position) && p.health.status === "healthy")
    .sort((a, b) => {
      const speedA = a.ratings.speed ?? a.overall;
      const speedB = b.ratings.speed ?? b.overall;
      return speedB - speedA;
    });
  team.returnerId = eligible[0]?.id ?? null;
}

function buildDepthChart(roster) {
  const chart = {};
  const available = roster.filter((p) => p.health.status === "healthy");
  for (const player of available) {
    chart[player.position] ??= [];
    chart[player.position].push(player.id);
  }
  for (const ids of Object.values(chart)) {
    ids.sort((leftId, rightId) => {
      const left = roster.find((player) => player.id === leftId);
      const right = roster.find((player) => player.id === rightId);
      return right.overall - left.overall;
    });
  }
  return chart;
}

function weightedPick(items, weightFor, rng) {
  const weights = items.map((item) => Math.max(0.1, weightFor(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng.next() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return items[index];
  }
  return items.at(-1);
}

function scoreFor(boxScore, teamId, homeTeamId) {
  return teamId === homeTeamId ? boxScore.home.points : boxScore.away.points;
}

function pointDifferential(league, teamId) {
  const standing = league.standings.find((candidate) => candidate.teamId === teamId);
  return (standing?.pointsFor ?? 0) - (standing?.pointsAgainst ?? 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
