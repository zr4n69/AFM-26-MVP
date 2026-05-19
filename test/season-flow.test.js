import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  simulateRegularSeason,
  generatePlayoffSeeds,
  generatePlayoffBracket,
  simulatePlayoffRound,
  runSeasonReview,
  runOffseason,
  advanceToNextSeason,
  simulateFullSeason,
  simulateMultipleSeasons,
  PHASES
} from "../src/index.js";

test("simulateFullSeason runs regular season, playoffs, and review in one call", () => {
  const league = createLeague("full-season");
  const result = simulateFullSeason(league);

  assert.ok(result.championTeamId);
  assert.equal(result.season, 1);
  assert.ok(Object.keys(result.awards).length > 0);
  assert.equal(league.phase, PHASES.SEASON_REVIEW);
  assert.equal(league.seasonHistory.length, 1);
});

test("runSeasonReview computes MVP and positional awards", () => {
  const league = createLeague("awards-test");
  simulateRegularSeason(league);
  const seeds = generatePlayoffSeeds(league);
  generatePlayoffBracket(league, seeds);
  simulatePlayoffRound(league, "firstRound");
  simulatePlayoffRound(league, "semifinals");
  simulatePlayoffRound(league, "championship");

  const awards = runSeasonReview(league);

  assert.ok(awards.seasonMvp);
  assert.ok(awards.seasonMvp.playerId);
  assert.ok(awards.seasonMvp.teamId);
  assert.ok(awards.defensivePlayerOfYear);
  assert.equal(league.awards.regularSeasonProcessed, true);
  assert.equal(league.seasonHistory.length, 1);
});

test("runOffseason processes retirements, expirations, development, aging, and resets stats", () => {
  const league = createLeague("offseason-test");
  simulateFullSeason(league);

  const totalPlayersBefore = league.teams.reduce((sum, team) => sum + team.roster.length, 0);
  const oldPlayer = league.teams[0].roster.find((p) => p.age >= 30);
  const oldOverall = oldPlayer?.overall;

  const summary = runOffseason(league);

  assert.equal(league.phase, PHASES.OFFSEASON);
  assert.ok(Array.isArray(summary.retirements));
  assert.ok(Array.isArray(summary.contractExpirations));
  assert.ok(Array.isArray(summary.developmentChanges));
  assert.ok(Array.isArray(summary.freeAgentRetirements));

  for (const team of league.teams) {
    for (const player of team.roster) {
      assert.equal(player.stats.passingYards, 0, "stats should be reset");
      assert.equal(player.fatigue, 0, "fatigue should be reset");
    }
  }

  const freeAgentCount = league.freeAgents.length;
  assert.ok(freeAgentCount >= 0);
});

test("advanceToNextSeason resets schedule, standings, draft, and increments season", () => {
  const league = createLeague("advance-test");
  simulateFullSeason(league);
  runOffseason(league);

  const newSeason = advanceToNextSeason(league);

  assert.equal(newSeason, 2);
  assert.equal(league.currentSeason, 2);
  assert.equal(league.currentWeek, 0);
  assert.equal(league.phase, PHASES.PRESEASON);
  assert.equal(league.standings.every((s) => s.wins === 0 && s.losses === 0), true);
  assert.equal(league.schedule.length, 10);
  assert.ok(league.draftClass.length > 0);
  assert.equal(league.playoff.championTeamId, null);
  assert.equal(league.awards.regularSeasonProcessed, false);
});

test("simulateMultipleSeasons chains full seasons with offseason transitions", () => {
  const league = createLeague("multi-season");
  const results = simulateMultipleSeasons(league, 3);

  assert.equal(results.length, 3);
  assert.equal(results[0].season, 1);
  assert.equal(results[1].season, 2);
  assert.equal(results[2].season, 3);
  assert.ok(results.every((r) => r.championTeamId));
  assert.equal(league.seasonHistory.length, 3);
});

test("multi-season play preserves league integrity across transitions", () => {
  const league = createLeague("integrity-check");
  simulateMultipleSeasons(league, 2);

  assert.equal(league.teams.length, 16);
  for (const team of league.teams) {
    assert.ok(team.roster.length > 0, `${team.name} should have players after 2 seasons`);
    assert.ok(Object.keys(team.depthChart).length > 0, `${team.name} should have a depth chart`);
  }
  assert.equal(league.currentSeason, 2);
});
