import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  resolveTrainingSession,
  scheduleTrainingSession
} from "../src/index.js";

test("training rejects duplicate focused players", () => {
  const league = createLeague("duplicate-training");
  const team = league.teams[0];
  const playerId = team.roster[0].id;

  assert.throws(() => scheduleTrainingSession(league, team.id, [
    { playerId, intensity: "standard" },
    { playerId, intensity: "aggressive" }
  ], { type: "camp" }), /only once/);
});

test("training camp completes after exactly three resolved sessions", () => {
  const league = createLeague("three-day-camp");
  const team = league.teams[0];
  const plan = [{ playerId: team.roster[0].id, intensity: "light" }];

  for (let day = 1; day <= 3; day += 1) {
    const session = scheduleTrainingSession(league, team.id, plan, { type: "camp" });
    resolveTrainingSession(league, session.id);
    assert.equal(league.training.camp.completed, day === 3);
  }

  assert.throws(
    () => scheduleTrainingSession(league, team.id, plan, { type: "camp" }),
    /already complete/
  );
});

test("in-season training is accepted only at the current open window", () => {
  const league = createLeague("training-window");
  const team = league.teams[0];
  const plan = [{ playerId: team.roster[0].id, intensity: "light" }];
  league.phase = "regularSeason";
  league.currentWeek = 2;

  assert.throws(
    () => scheduleTrainingSession(league, team.id, plan, { type: "regularSeason" }),
    /No training window/
  );

  league.currentWeek = 3;
  const session = scheduleTrainingSession(league, team.id, plan, { type: "regularSeason" });
  resolveTrainingSession(league, session.id);
  assert.equal(league.training.regularSeason.windows[0].completed, true);
});
