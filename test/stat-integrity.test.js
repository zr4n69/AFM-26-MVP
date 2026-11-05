import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  runOffseason,
  simulateRegularSeason
} from "../src/index.js";

test("offseason archives stats before players expire into free agency", () => {
  const league = createLeague("expiring-stat-archive");
  const player = league.teams[0].roster.find((candidate) => candidate.age < 30);
  const careerBefore = player.careerStats.passingYards;
  player.stats.passingYards = 1234;
  player.contract.yearsRemaining = 1;

  runOffseason(league, { skipDraft: true, skipFreeAgency: true });

  assert.ok(league.freeAgents.some((candidate) => candidate.id === player.id));
  assert.equal(player.careerStats.passingYards, careerBefore + 1234);
  assert.equal(player.stats.passingYards, 0);
});

test("offseason archives stats for players who are already free agents", () => {
  const league = createLeague("free-agent-stat-archive");
  const player = league.freeAgents[0];
  const careerBefore = player.careerStats.rushingYards;
  player.stats.rushingYards = 321;

  runOffseason(league, { skipDraft: true, skipFreeAgency: true });

  assert.equal(player.careerStats.rushingYards, careerBefore + 321);
  assert.equal(player.stats.rushingYards, 0);
});

test("defensive interceptions equal interceptions thrown", () => {
  const league = createLeague("interception-integrity");
  simulateRegularSeason(league, { seed: "interception-season" });

  const players = league.teams.flatMap((team) => team.roster);
  const thrown = players.reduce((sum, player) => sum + player.stats.interceptionsThrown, 0);
  const caught = players.reduce((sum, player) => sum + player.stats.interceptions, 0);
  const fumbles = league.schedule.flatMap((week) => week.games)
    .flatMap((game) => game.driveLog)
    .filter((drive) => drive.turnoverType === "fumble").length;

  assert.equal(caught, thrown);
  assert.ok(thrown > 0);
  assert.ok(fumbles > 0, "non-interception turnovers should remain represented as fumbles");
});
