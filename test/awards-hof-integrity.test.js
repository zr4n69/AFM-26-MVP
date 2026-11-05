import test from "node:test";
import assert from "node:assert/strict";

import {
  castHallOfFameVotes,
  createLeague,
  runSeasonReview
} from "../src/index.js";

test("offensive player of the year is the most productive offensive candidate", () => {
  const league = createLeague("opoy-integrity");
  const quarterbackTeam = league.teams[0];
  const rushingTeam = league.teams[1];
  const quarterback = quarterbackTeam.roster.find((player) => player.position === "QB");
  const runningBack = rushingTeam.roster.find((player) => player.position === "RB");
  quarterback.stats.passingYards = 1000;
  quarterback.stats.passingTouchdowns = 5;
  runningBack.stats.rushingYards = 2000;
  runningBack.stats.rushingTouchdowns = 20;

  const awards = runSeasonReview(league);

  assert.equal(awards.offensivePlayerOfYear.playerId, runningBack.id);
});

test("Hall of Fame induction remains permanent when ballots change", () => {
  const league = createLeague("permanent-hof");
  const first = { ...league.teams[0].roster[0], id: "legend-a", firstName: "Legend", lastName: "Alpha", lastTeamId: league.teams[0].id };
  const second = { ...league.teams[1].roster[0], id: "legend-b", firstName: "Legend", lastName: "Beta", lastTeamId: league.teams[1].id };
  league.hallOfFame.eligiblePlayers = [first, second];
  league.hallOfFame.eligibleRetiringPlayerIds = [first.id, second.id];

  for (const team of league.teams.slice(0, 4)) castHallOfFameVotes(league, team.id, [first.id]);
  assert.ok(league.hallOfFame.inductedPlayerIds.includes(first.id));

  for (const team of league.teams.slice(0, 4)) castHallOfFameVotes(league, team.id, [second.id]);

  assert.ok(league.hallOfFame.inductedPlayerIds.includes(first.id));
  assert.ok(league.hallOfFame.inductedPlayerIds.includes(second.id));
  assert.deepEqual(league.hallOfFame.history[0].inducted, ["Legend Alpha", "Legend Beta"]);
});
