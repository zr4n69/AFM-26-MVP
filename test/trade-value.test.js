import test from "node:test";
import assert from "node:assert/strict";

import { createLeague, createContractFromSalary } from "../src/data/factories.js";
import { proposeTrade } from "../src/data/actions.js";
import {
  BUILD_PHASES,
  assessTeamBuildPhase,
  calculateTradeValue,
  evaluateCpuTradeResponse
} from "../src/simulation/trade-value.js";

test("CPU rejects low-upside aging veterans for premium first-round picks", () => {
  const league = createLeague("trade-value-premium-pick");
  const [fromTeam, toTeam] = league.teams;
  const veteran = fromTeam.roster[0];
  const premiumPick = league.draft.picks.find((pick) => pick.currentTeamId === toTeam.id && pick.overallPick <= 8);

  veteran.position = "WR";
  veteran.overall = 72;
  veteran.age = 33;
  veteran.potentialStars = 1;
  veteran.development = {
    potentialCeiling: 72,
    developmentState: "nearCeiling",
    meaningfulPlaytime: false,
    yearlyDeclineRate: 0,
    lastTrainingGain: 0
  };
  veteran.awards = [];
  veteran.contract = createContractFromSalary(4_000_000, 1);

  const veteranValue = calculateTradeValue(league, fromTeam.id, { playerIds: [veteran.id] });
  const pickValue = calculateTradeValue(league, toTeam.id, { pickIds: [premiumPick.id] });

  assert.ok(pickValue >= veteranValue * 5, `pick=${pickValue}, veteran=${veteranValue}`);

  const trade = proposeTrade(league, fromTeam.id, toTeam.id, {
    offeredPlayerIds: [veteran.id],
    requestedPickIds: [premiumPick.id]
  });
  const response = evaluateCpuTradeResponse(league, trade);

  assert.equal(response.response, "rejected");
  assert.equal(response.reason, "Premium draft pick requires a stronger offer");
});

test("CPU build phase identifies rebuilders and all-in contenders", () => {
  const league = createLeague("trade-value-build-phase");
  const rebuildingTeam = league.teams[2];
  const contender = league.teams[10];

  rebuildingTeam.standings = { wins: 2, losses: 8, ties: 0 };
  rebuildingTeam.roster.forEach((player) => {
    player.overall = Math.min(player.overall, 69);
    player.age = Math.max(player.age, 29);
    player.potentialStars = Math.min(player.potentialStars || 1, 2);
  });

  contender.standings = { wins: 8, losses: 2, ties: 0 };
  contender.roster.forEach((player, index) => {
    player.overall = index < 24 ? 80 : Math.max(player.overall, 70);
    player.age = 29;
  });

  assert.equal(assessTeamBuildPhase(league, rebuildingTeam).phase, BUILD_PHASES.REBUILDING);
  assert.equal(assessTeamBuildPhase(league, contender).phase, BUILD_PHASES.ALL_IN);
});

test("all-in contenders stretch for elite players who fill real needs", () => {
  const league = createLeague("trade-value-all-in-need");
  const seller = league.teams[0];
  const contender = league.teams[10];
  const eliteEdge = seller.roster[0];
  const first = league.draft.picks.find((pick) => pick.currentTeamId === contender.id && pick.round === 1);
  const third = league.draft.picks.find((pick) => pick.currentTeamId === contender.id && pick.round === 3);

  contender.standings = { wins: 8, losses: 2, ties: 0 };
  contender.roster.forEach((player, index) => {
    player.overall = index < 24 ? 80 : Math.max(player.overall, 70);
    player.age = 29;
    if (player.position === "EDGE") player.position = "DL";
  });

  eliteEdge.position = "EDGE";
  eliteEdge.overall = 85;
  eliteEdge.age = 29;
  eliteEdge.potentialStars = 3;
  eliteEdge.development = {
    potentialCeiling: 86,
    developmentState: "nearCeiling",
    meaningfulPlaytime: true,
    yearlyDeclineRate: 0,
    lastTrainingGain: 0
  };
  eliteEdge.awards = [];
  eliteEdge.contract = createContractFromSalary(20_000_000, 2);

  const playerValue = calculateTradeValue(league, seller.id, { playerIds: [eliteEdge.id] });
  const pickValue = calculateTradeValue(league, contender.id, { pickIds: [first.id, third.id] });
  assert.ok(playerValue < pickValue, `expected contender to take a small value loss, player=${playerValue}, picks=${pickValue}`);

  const trade = proposeTrade(league, seller.id, contender.id, {
    offeredPlayerIds: [eliteEdge.id],
    requestedPickIds: [first.id, third.id]
  });
  const response = evaluateCpuTradeResponse(league, trade);

  assert.equal(response.posture.phase, BUILD_PHASES.ALL_IN);
  assert.ok(response.urgency.allInPush > 0.1, `all-in urgency=${response.urgency.allInPush}`);
  assert.ok(response.effectiveRatio >= 100, `effectiveRatio=${response.effectiveRatio}`);
  assert.notEqual(response.reason, "Premium draft pick requires a stronger offer");
});
