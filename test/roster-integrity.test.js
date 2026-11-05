import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  releasePlayer,
  signPlayer
} from "../src/index.js";

test("injured players still count against the roster limit", () => {
  const league = createLeague("injured-roster-limit");
  const team = league.teams[0];
  team.roster[0].health = { status: "out", injury: "test", weeksRemaining: 2 };
  const freeAgent = league.freeAgents[0];

  assert.equal(team.roster.length, 55);
  assert.throws(() => signPlayer(league, team.id, freeAgent), /already has 55 players/);
  assert.equal(team.roster.length, 55);
  assert.ok(league.freeAgents.some((player) => player.id === freeAgent.id));
});

test("a team cannot release its last player at a required position", () => {
  const league = createLeague("minimum-position-roster");
  const team = league.teams[0];
  const quarterbacks = team.roster.filter((player) => player.position === "QB");

  for (const quarterback of quarterbacks.slice(0, -1)) {
    releasePlayer(league, team.id, quarterback.id);
  }

  assert.throws(
    () => releasePlayer(league, team.id, quarterbacks.at(-1).id),
    /Cannot release the last QB/
  );
  assert.equal(team.roster.filter((player) => player.position === "QB").length, 1);
});
