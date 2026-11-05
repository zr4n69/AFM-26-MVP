import test from "node:test";
import assert from "node:assert/strict";

import {
  createContractFromSalary,
  createLeague,
  extendContract,
  makeContractOffer,
  releasePlayer,
  resolvePendingOffers,
  rookieCapReserve,
  runOffseason,
  runSeasonReview,
  simulateFullSeason,
  signPlayer
} from "../src/index.js";

test("direct signing rejects a contract that exceeds the salary cap", () => {
  const league = createLeague("direct-cap-guard");
  const team = league.teams[0];
  const releasable = team.roster.find((player) =>
    team.roster.filter((candidate) => candidate.position === player.position).length > 1
  );
  releasePlayer(league, team.id, releasable.id);
  const freeAgent = league.freeAgents.find((player) => player.id !== releasable.id);
  freeAgent.contract = createContractFromSalary(500_000_000, 1);

  assert.throws(() => signPlayer(league, team.id, freeAgent), /salary cap/);
  assert.ok(!team.roster.some((player) => player.id === freeAgent.id));
});

test("extensions cannot push a team over the salary cap", () => {
  const league = createLeague("extension-cap-guard");
  const team = league.teams[0];
  const player = team.roster.find((candidate) => candidate.contract.extensionEligible);
  const previousContract = structuredClone(player.contract);

  assert.throws(() => extendContract(league, team.id, player.id, {
    salary: 500_000_000,
    yearsRemaining: 5,
    guaranteedAmount: 500_000_000,
    bonusAmount: 0
  }), /over the salary cap/);
  assert.deepEqual(player.contract, previousContract);
});

test("pending offers cannot collectively overflow a team's cap", () => {
  const league = createLeague("pending-offer-cap-guard");
  const team = league.teams[0];
  const releasable = team.roster
    .filter((player) => team.roster.filter((candidate) => candidate.position === player.position).length > 2)
    .slice(0, 2);
  for (const player of releasable) releasePlayer(league, team.id, player.id);

  team.salaryCap = team.contractSummary.committedCap + 7_000_000;
  team.contractSummary.salaryCap = team.salaryCap;
  team.contractSummary.capSpace = 7_000_000;
  const targets = league.freeAgents.filter((player) => !releasable.some((released) => released.id === player.id)).slice(0, 2);
  for (const player of targets) makeContractOffer(league, team.id, player.id, 5_000_000, 1);

  resolvePendingOffers(league, { seed: "pending-cap-resolution" });

  assert.ok(team.contractSummary.committedCap <= team.salaryCap);
  assert.ok(targets.filter((target) => team.roster.some((player) => player.id === target.id)).length <= 1);
});

test("playoff incentives are paid without charging the cap twice", () => {
  const league = createLeague("playoff-incentive-cap");
  const playoffTeam = league.teams[0];
  const nonPlayoffTeam = league.teams[1];
  const paidPlayer = playoffTeam.roster[0];
  const unpaidPlayer = nonPlayoffTeam.roster[0];
  paidPlayer.contract.bonusAmount = 1_000_000;
  paidPlayer.contract.bonusExpectation = "playoffs";
  paidPlayer.contract.bonusPaid = false;
  unpaidPlayer.contract.bonusAmount = 1_000_000;
  unpaidPlayer.contract.bonusExpectation = "playoffs";
  unpaidPlayer.contract.bonusPaid = false;
  const originalCapHit = paidPlayer.contract.capHit;
  league.playoff.seeds = [{ seed: 1, teamId: playoffTeam.id }];

  runSeasonReview(league);

  assert.equal(paidPlayer.contract.bonusPaid, true);
  assert.equal(paidPlayer.contract.capHit, originalCapHit);
  assert.equal(unpaidPlayer.contract.bonusPaid, false);
});

test("a team's five-pick rookie salary pool stays proportionate to the cap", () => {
  const league = createLeague("rookie-pool-cap");

  for (const team of league.teams) {
    const rookiePool = league.draft.picks
      .filter((pick) => pick.currentTeamId === team.id)
      .reduce((sum, pick) => sum + pick.rookieContract.capHit, 0);
    assert.ok(rookiePool <= team.salaryCap * 0.2, `${team.name} rookie pool is too large`);
  }
});

test("offseason free agency reserves enough cap for owned draft picks", () => {
  const league = createLeague("rookie-reserve-cap");
  runSeasonReview(league);
  runOffseason(league, { skipDraft: true, skipFreeAgency: true });
  const team = league.teams[0];
  const reserve = rookieCapReserve(league, team.id);
  const freeAgent = league.freeAgents[0];
  team.salaryCap = team.contractSummary.committedCap + reserve + 1_000_000;
  team.contractSummary.salaryCap = team.salaryCap;
  team.contractSummary.capSpace = reserve + 1_000_000;

  assert.ok(reserve > 0);
  assert.throws(
    () => makeContractOffer(league, team.id, freeAgent.id, 1_000_000, 1),
    /salary-cap space/
  );
});

test("the automated offseason finishes with every team under the cap", () => {
  const league = createLeague("offseason-cap-invariant");
  simulateFullSeason(league, { seed: "offseason-cap-invariant-season" });

  runOffseason(league);

  for (const team of league.teams) {
    assert.ok(team.contractSummary.capSpace >= 0, `${team.name} is over the cap`);
  }
});
