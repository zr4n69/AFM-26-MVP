import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceToNextSeason,
  createLeague,
  runSeasonReview
} from "../src/index.js";

test("season review finalizes draft order from completed standings", () => {
  const league = createLeague("draft-order-integrity");
  const expectedOrder = league.teams.map((team) => team.id).reverse();
  league.standings = expectedOrder.map((teamId, index) => ({
    teamId,
    wins: index,
    losses: 15 - index,
    ties: 0,
    winPct: index / 15,
    pointsFor: 100 + index,
    pointsAgainst: 200 - index
  }));

  const tradedPick = league.draft.picks.find((pick) => pick.round === 1 && pick.originalTeamId === expectedOrder[0]);
  const acquiringTeamId = expectedOrder[1];
  tradedPick.currentTeamId = acquiringTeamId;

  runSeasonReview(league);

  assert.deepEqual(league.draft.draftOrder, expectedOrder);
  assert.equal(tradedPick.slot, 1);
  assert.equal(tradedPick.overallPick, 1);
  assert.equal(tradedPick.currentTeamId, acquiringTeamId, "reordering must preserve traded-pick ownership");
});

test("new-season draft picks replace expired pick assets on every team", () => {
  const league = createLeague("draft-pick-refresh");
  const oldPickIds = new Set(league.draft.picks.map((pick) => pick.id));
  runSeasonReview(league);

  advanceToNextSeason(league);

  const newPickIds = new Set(league.draft.picks.map((pick) => pick.id));
  for (const team of league.teams) {
    assert.equal(team.draftPicks.length, 5);
    assert.ok(team.draftPicks.every((pickId) => newPickIds.has(pickId)));
    assert.ok(team.draftPicks.every((pickId) => !oldPickIds.has(pickId)));
  }
});
