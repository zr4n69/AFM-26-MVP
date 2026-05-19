import test from "node:test";
import assert from "node:assert/strict";

import { runBatchSeasons } from "../src/index.js";

test("runBatchSeasons produces scoring, yard, turnover, and injury summaries", () => {
  const report = runBatchSeasons(5, { seed: "batch-test" });

  assert.equal(report.seasons, 5);
  assert.ok(report.scoring.mean > 0, "mean score should be positive");
  assert.ok(report.scoring.stddev >= 0);
  assert.ok(report.yards.mean > 0, "mean yards should be positive");
  assert.ok(report.turnovers.meanPerTeamPerGame >= 0);
  assert.ok(report.injuries.meanPerGame >= 0);
});

test("batch report tracks playoff variety", () => {
  const report = runBatchSeasons(10, { seed: "variety-test" });

  assert.ok(report.playoffVariety.uniqueChampions >= 1);
  assert.ok(report.playoffVariety.uniqueChampions <= 10);
  const totalChampionships = Object.values(report.playoffVariety.championDistribution)
    .reduce((sum, count) => sum + count, 0);
  assert.equal(totalChampionships, 10);
});

test("batch report tracks system balance across seasons", () => {
  const report = runBatchSeasons(5, { seed: "system-balance" });

  assert.ok(Object.keys(report.systemBalance).length > 0, "should track at least one offensive system");
  for (const [system, record] of Object.entries(report.systemBalance)) {
    assert.ok(record.wins + record.losses > 0, `${system} should have games played`);
    assert.ok(record.winPct >= 0 && record.winPct <= 1, `${system} winPct should be between 0 and 1`);
  }
});

test("batch report tracks defensive leader position distribution", () => {
  const report = runBatchSeasons(5, { seed: "def-leaders" });

  assert.ok(Object.keys(report.defensiveLeaderPositions).length > 0);
  const totalLeaderSlots = Object.values(report.defensiveLeaderPositions)
    .reduce((sum, count) => sum + count, 0);
  assert.equal(totalLeaderSlots, 5 * 5);
});

test("multi-season batch runs offseason transitions correctly", () => {
  const report = runBatchSeasons(2, { seed: "multi-s", seasonsPerLeague: 3 });

  assert.equal(report.seasons, 6);
  assert.ok(report.scoring.mean > 0);
  assert.ok(report.playoffVariety.uniqueChampions >= 1);
});

test("batch scoring averages fall in plausible NFL-like range (0-80 ppg, 0-700 yds)", () => {
  const report = runBatchSeasons(20, { seed: "plausible-range" });

  assert.ok(report.scoring.mean >= 15, `mean scoring ${report.scoring.mean} too low`);
  assert.ok(report.scoring.mean <= 35, `mean scoring ${report.scoring.mean} too high`);
  assert.ok(report.yards.mean >= 180, `mean yards ${report.yards.mean} too low`);
  assert.ok(report.yards.mean <= 450, `mean yards ${report.yards.mean} too high`);
});
