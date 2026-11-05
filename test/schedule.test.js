import test from "node:test";
import assert from "node:assert/strict";

import { createLeague } from "../src/index.js";
import { createRegularSeasonSchedule } from "../src/data/schedule.js";

function summarizeSchedule(league, schedule) {
  const summaries = new Map(league.teams.map((team) => [team.id, {
    home: 0,
    away: 0,
    opponents: new Set(),
    divisionGames: 0
  }]));
  const teamsById = new Map(league.teams.map((team) => [team.id, team]));
  for (const game of schedule.flatMap((week) => week.games)) {
    const home = summaries.get(game.homeTeamId);
    const away = summaries.get(game.awayTeamId);
    home.home += 1;
    away.away += 1;
    home.opponents.add(game.awayTeamId);
    away.opponents.add(game.homeTeamId);
    if (teamsById.get(game.homeTeamId).division === teamsById.get(game.awayTeamId).division) {
      home.divisionGames += 1;
      away.divisionGames += 1;
    }
  }
  return summaries;
}

test("regular-season schedule is balanced and includes every divisional rival", () => {
  const league = createLeague("schedule-balance");
  const summaries = summarizeSchedule(league, league.schedule);

  assert.equal(league.schedule.length, 10);
  assert.ok(league.schedule.every((week) => week.games.length === 8));
  for (const summary of summaries.values()) {
    assert.equal(summary.home, 5);
    assert.equal(summary.away, 5);
    assert.equal(summary.opponents.size, 10);
    assert.equal(summary.divisionGames, 3);
  }
});

test("non-divisional opponents rotate in later seasons", () => {
  const league = createLeague("schedule-rotation");
  const first = summarizeSchedule(league, createRegularSeasonSchedule(league.teams, 1));
  const second = summarizeSchedule(league, createRegularSeasonSchedule(league.teams, 2));

  for (const team of league.teams) {
    const firstOpponents = first.get(team.id).opponents;
    const secondOpponents = second.get(team.id).opponents;
    assert.notDeepEqual([...firstOpponents].sort(), [...secondOpponents].sort());
  }
});
