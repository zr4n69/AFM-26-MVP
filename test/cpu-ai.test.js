import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  executeCpuRosterMoves,
  executeCpuOffseasonSignings,
  simulateFullSeason,
  runOffseason
} from "../src/index.js";

test("executeCpuRosterMoves releases low-value players and signs replacements", () => {
  const league = createLeague("cpu-moves");
  const summary = executeCpuRosterMoves(league);

  assert.ok(Array.isArray(summary.releases));
  assert.ok(Array.isArray(summary.signings));
  assert.ok(Array.isArray(summary.extensions));

  for (const team of league.teams) {
    assert.ok(team.roster.length > 0, `${team.name} should still have players`);
    assert.ok(Object.keys(team.depthChart).length > 0, `${team.name} should have updated depth chart`);
  }
});

test("executeCpuRosterMoves extends high-value expiring contracts", () => {
  const league = createLeague("cpu-extend");
  for (const team of league.teams) {
    const star = team.roster.find((p) => p.overall >= 78);
    if (star) {
      star.contract.extensionEligible = true;
      star.contract.yearsRemaining = 1;
    }
  }

  const summary = executeCpuRosterMoves(league);
  assert.ok(summary.extensions.length > 0, "should extend at least some expiring stars");
});

test("executeCpuOffseasonSignings fills roster gaps after offseason attrition", () => {
  const league = createLeague("cpu-offseason-sign");
  simulateFullSeason(league);
  runOffseason(league);

  const preFreeAgents = league.freeAgents.length;
  const summary = executeCpuOffseasonSignings(league);

  assert.ok(summary.rosterFills.length >= 0);
  if (preFreeAgents > 0 && summary.generated === 0) {
    assert.ok(
      league.freeAgents.length <= preFreeAgents,
      "free agent pool should shrink or stay same after signings (when no street FAs generated)"
    );
  }

  for (const team of league.teams) {
    assert.ok(team.roster.length >= 30, `${team.name} should have adequate roster after offseason signings`);
  }
});

test("CPU AI does not release sole starter at a position", () => {
  const league = createLeague("cpu-protect-starter");
  const team = league.teams[0];

  const kickers = team.roster.filter((p) => p.position === "K");
  assert.equal(kickers.length, 1);
  kickers[0].overall = 50;
  kickers[0].contract.capHit = 5_000_000;

  executeCpuRosterMoves(league);

  const kickerStillOnTeam = team.roster.some((p) => p.position === "K");
  assert.ok(kickerStillOnTeam, "should not release the only kicker");
});
