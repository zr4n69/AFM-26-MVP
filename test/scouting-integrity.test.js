import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceToNextSeason,
  createLeague,
  runSeasonReview
} from "../src/index.js";

function assertCompleteScoutingProfiles(draftClass) {
  for (const prospect of draftClass) {
    assert.ok(Number.isInteger(prospect.exactRating));
    assert.ok(prospect.detailedRatings);
    assert.ok(Array.isArray(prospect.traits));
    assert.ok(prospect.potentialStars >= 1 && prospect.potentialStars <= 5);
    assert.ok(prospect.schemeFit);
  }
}

test("every initial prospect has real hidden scouting data", () => {
  const league = createLeague("initial-scouting-data");
  assertCompleteScoutingProfiles(league.draftClass);
});

test("later draft classes retain complete hidden scouting data", () => {
  const league = createLeague("later-scouting-data");
  const team = league.teams[0];
  league.scouting.currencyByTeamId[team.id] = 7;
  league.scouting.revealedGroupsByTeamId[team.id] = { QB: "deep" };
  league.scouting.cpuCoverage[team.id].scoutedProspectIds = [league.draftClass[0].id];
  runSeasonReview(league);
  advanceToNextSeason(league);

  assertCompleteScoutingProfiles(league.draftClass);
  assert.deepEqual(league.scouting.revealedGroupsByTeamId[team.id], {});
  assert.deepEqual(league.scouting.cpuCoverage[team.id].scoutedProspectIds, []);
  assert.equal(league.scouting.currencyByTeamId[team.id], 7);
});
