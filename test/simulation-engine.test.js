import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  generatePlayoffBracket,
  generatePlayoffSeeds,
  runCpuTeamManagement,
  selectDriveConcepts,
  simulateGame,
  simulatePlayoffRound,
  simulateRegularSeason,
  simulateWeek,
  updateStrategy
} from "../src/index.js";
import { createRng } from "../src/data/random.js";

test("simulateGame is seeded and reproducible", () => {
  const firstLeague = createLeague("sim-repro");
  const secondLeague = createLeague("sim-repro");
  const firstGameId = firstLeague.schedule[0].games[0].id;
  const secondGameId = secondLeague.schedule[0].games[0].id;

  const firstGame = simulateGame(firstLeague, firstGameId, { seed: "fixed-game" });
  const secondGame = simulateGame(secondLeague, secondGameId, { seed: "fixed-game" });

  assert.deepEqual(firstGame.boxScore, secondGame.boxScore);
  assert.deepEqual(
    firstGame.driveLog.map((drive) => ({
      offensiveConceptId: drive.offensiveConceptId,
      defensiveConceptId: drive.defensiveConceptId,
      yardsGained: drive.yardsGained,
      outcome: drive.outcome
    })),
    secondGame.driveLog.map((drive) => ({
      offensiveConceptId: drive.offensiveConceptId,
      defensiveConceptId: drive.defensiveConceptId,
      yardsGained: drive.yardsGained,
      outcome: drive.outcome
    }))
  );
});

test("concept selection responds to systems and tendencies", () => {
  const league = createLeague("concept-selection");
  const [offense, defense] = league.teams;
  updateStrategy(league, offense.id, {
    offensiveSystem: "verticalAirRaid",
    tendencies: { runPassLean: -100, deepPassing: 100, aggression: 80 }
  });
  updateStrategy(league, defense.id, {
    defensiveSystem: "manBlitz",
    tendencies: { blitzRate: 100, coverageRisk: 80 }
  });

  const counts = { fourVerticals: 0, pressure: 0 };
  const rng = createRng("concept-sample");
  for (let index = 0; index < 80; index += 1) {
    const concepts = selectDriveConcepts(offense, defense, { scoreDiff: -7, fieldPosition: 45 }, rng);
    if (concepts.offensiveConcept.id === "fourVerticals") counts.fourVerticals += 1;
    if (concepts.defensiveConcept.category === "pressure") counts.pressure += 1;
  }

  assert.ok(counts.fourVerticals > 8);
  assert.ok(counts.pressure > 25);
});

test("simulateGame creates drive logs, box scores, defensive stats, fatigue, and standings", () => {
  const league = createLeague("sim-shape");
  const game = simulateGame(league, league.schedule[0].games[0].id, { seed: "shape-game" });
  const home = league.teams.find((team) => team.id === game.homeTeamId);
  const away = league.teams.find((team) => team.id === game.awayTeamId);
  const defensiveTotals = [...home.roster, ...away.roster].reduce((sum, player) =>
    sum + player.stats.tackles + player.stats.tacklesForLoss + player.stats.sacks
      + player.stats.interceptions + player.stats.passDeflections
      + player.stats.puntDeflections + player.stats.kickDeflections, 0);

  assert.equal(game.played, true);
  assert.ok(game.driveLog.length >= 16);
  assert.ok(game.boxScore.home.points >= 0);
  assert.ok(game.boxScore.away.points >= 0);
  assert.ok(defensiveTotals > 0);
  assert.ok([...home.roster, ...away.roster].some((player) => player.fatigue > 12));
  assert.equal(league.standings.find((standing) => standing.teamId === game.winnerTeamId).wins, 1);
  assert.equal(league.autosaveLog.at(-1).event, "game");
});

test("simulateWeek updates week, scouting currency, standings, and CPU plans", () => {
  const league = createLeague("week-sim");
  const beforeCurrency = league.scouting.currencyByTeamId[league.teams[0].id];
  const games = simulateWeek(league, 1, { seed: "week-seed" });

  assert.equal(games.length, 8);
  assert.equal(league.currentWeek, 1);
  assert.equal(league.scouting.currencyByTeamId[league.teams[0].id], beforeCurrency + 2);
  assert.equal(league.standings.reduce((sum, standing) => sum + standing.wins, 0), 8);
  assert.ok(league.teams.every((team) => Array.isArray(team.cpuPlan.trainingPriorities)));
  assert.equal(league.autosaveLog.at(-1).event, "week");
});

test("regular-season results can seed and complete the 6-team playoff", () => {
  const league = createLeague("playoff-sim");
  simulateRegularSeason(league, { seed: "season-seed" });
  const seeds = generatePlayoffSeeds(league);
  generatePlayoffBracket(league, seeds);

  simulatePlayoffRound(league, "firstRound", { seed: "playoff-round-1" });
  assert.equal(league.playoff.rounds.find((round) => round.name === "semifinals").games.length, 2);

  simulatePlayoffRound(league, "semifinals", { seed: "playoff-round-2" });
  assert.equal(league.playoff.rounds.find((round) => round.name === "championship").games.length, 1);

  simulatePlayoffRound(league, "championship", { seed: "playoff-round-3" });
  assert.ok(league.playoff.championTeamId);
  assert.ok(seeds.includes(league.playoff.championTeamId));
});

test("runCpuTeamManagement refreshes depth charts and planning state", () => {
  const league = createLeague("cpu-management");
  const plans = runCpuTeamManagement(league);

  assert.equal(plans.length, league.teams.length);
  assert.ok(plans.every((plan) => "repairInvalidRoster" in plan.cpuPlan));
  assert.ok(plans.every((plan) => Array.isArray(plan.cpuPlan.releaseCandidates)));
});
