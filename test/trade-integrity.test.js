import test from "node:test";
import assert from "node:assert/strict";

import {
  completeTrade,
  createLeague,
  proposeTrade
} from "../src/index.js";

test("a trade with an invalid second leg does not move its first leg", () => {
  const league = createLeague("atomic-trade");
  const [fromTeam, toTeam] = league.teams;
  const offered = fromTeam.roster.find((player) =>
    fromTeam.roster.filter((candidate) => candidate.position === player.position).length > 1
  );
  const beforeFromIds = fromTeam.roster.map((player) => player.id);
  const beforeToIds = toTeam.roster.map((player) => player.id);
  const trade = proposeTrade(league, fromTeam.id, toTeam.id, {
    offeredPlayerIds: [offered.id],
    requestedPlayerIds: ["missing-player"]
  });

  assert.throws(() => completeTrade(league, trade.id), /not on/);
  assert.deepEqual(fromTeam.roster.map((player) => player.id), beforeFromIds);
  assert.deepEqual(toTeam.roster.map((player) => player.id), beforeToIds);
  assert.equal(trade.status, "proposed");
});

test("a trade cannot transfer an unowned pick", () => {
  const league = createLeague("owned-pick-trade");
  const [fromTeam, toTeam, thirdTeam] = league.teams;
  const thirdTeamPick = league.draft.picks.find((pick) => pick.currentTeamId === thirdTeam.id);
  const trade = proposeTrade(league, fromTeam.id, toTeam.id, {
    offeredPickIds: [thirdTeamPick.id]
  });

  assert.throws(() => completeTrade(league, trade.id), /not owned/);
  assert.equal(thirdTeamPick.currentTeamId, thirdTeam.id);
  assert.equal(trade.status, "proposed");
});
