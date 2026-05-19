import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeague,
  runFreeAgencyPeriod,
  makeContractOffer,
  resolvePendingOffers,
  computeAttractiveness,
  prestigeInfluence,
  simulateFullSeason,
  runOffseason,
  advanceToNextSeason,
  simulateMultipleSeasons
} from "../src/index.js";
import { createRng } from "../src/data/random.js";

test("prestige drives initial roster strength — high prestige teams have higher OVR", () => {
  function teamOvr(team) {
    const starters = Object.values(team.depthChart).map((ids) => ids[0]).filter(Boolean)
      .map((id) => team.roster.find((p) => p.id === id)).filter(Boolean);
    return starters.reduce((s, p) => s + p.overall, 0) / starters.length;
  }

  let highPrestigeOvrSum = 0;
  let lowPrestigeOvrSum = 0;
  let highCount = 0;
  let lowCount = 0;

  for (let i = 0; i < 10; i++) {
    const league = createLeague("prestige-ovr-" + i);
    for (const team of league.teams) {
      const ovr = teamOvr(team);
      if (team.prestige >= 3.5) { highPrestigeOvrSum += ovr; highCount++; }
      if (team.prestige <= 2.0) { lowPrestigeOvrSum += ovr; lowCount++; }
    }
  }

  const highAvg = highPrestigeOvrSum / highCount;
  const lowAvg = lowPrestigeOvrSum / lowCount;
  assert.ok(highAvg > lowAvg + 2, `high prestige avg OVR (${highAvg.toFixed(1)}) should be notably above low (${lowAvg.toFixed(1)})`);
});

test("player can choose team, prestige, and roster strength at league creation", () => {
  const league = createLeague("player-pick", {
    playerTeamIndex: 3,
    playerPrestige: 2.0,
    playerRosterStrength: -0.5
  });

  const playerTeam = league.teams[3];
  assert.equal(playerTeam.isPlayerControlled, true);
  assert.equal(playerTeam.prestige, 2.0);
  assert.equal(playerTeam.rosterStrength, -0.5);

  const otherTeams = league.teams.filter((t) => !t.isPlayerControlled);
  assert.equal(otherTeams.length, 15);
  assert.ok(otherTeams.every((t) => t.isPlayerControlled === false));
});

test("prestigeInfluence scales from low in season 1 to full by season 6", () => {
  assert.ok(prestigeInfluence(1) < 0.5, "season 1 prestige weight should be low");
  assert.ok(prestigeInfluence(3) > prestigeInfluence(1), "prestige should grow over seasons");
  assert.equal(prestigeInfluence(6), 1.0, "season 6+ should be full prestige weight");
  assert.equal(prestigeInfluence(10), 1.0, "should cap at 1.0");
});

test("runFreeAgencyPeriod signs players competitively with prestige and contract factors", () => {
  const league = createLeague("fa-test");
  simulateFullSeason(league);
  runOffseason(league, { skipFreeAgency: true });

  const faBefore = league.freeAgents.length;
  assert.ok(faBefore > 0, "should have free agents after offseason");

  const result = runFreeAgencyPeriod(league);

  assert.ok(result.signings.length > 0, "should sign some players");
  assert.ok(league.freeAgents.length < faBefore, "free agent pool should shrink");
  assert.ok(result.signings.every((s) => s.teamId && s.playerId && s.salary > 0));
});

test("high prestige teams attract more free agents than low prestige teams", () => {
  const signingsByPrestige = { high: 0, low: 0 };

  for (let i = 0; i < 5; i++) {
    const league = createLeague("fa-prestige-" + i);
    simulateFullSeason(league);
    runOffseason(league, { skipFreeAgency: true });
    const result = runFreeAgencyPeriod(league);

    for (const signing of result.signings) {
      const team = league.teams.find((t) => t.id === signing.teamId);
      if (team.prestige >= 3.5) signingsByPrestige.high++;
      if (team.prestige <= 2.0) signingsByPrestige.low++;
    }
  }

  assert.ok(
    signingsByPrestige.high > signingsByPrestige.low,
    `high prestige signings (${signingsByPrestige.high}) should exceed low (${signingsByPrestige.low})`
  );
});

test("lower prestige team can sign elite player with better contract offer", () => {
  const league = createLeague("upset-signing");
  const rng = createRng("upset-fa");

  const elitePlayer = league.freeAgents.find((p) => p.overall >= 80)
    ?? (() => {
      const p = league.teams[0].roster[0];
      p.overall = 85;
      league.teams[0].roster = league.teams[0].roster.filter((r) => r.id !== p.id);
      league.freeAgents.push(p);
      return p;
    })();

  const highPrestigeTeam = league.teams.find((t) => t.prestige >= 3.5) ?? league.teams[0];
  const lowPrestigeTeam = league.teams.find((t) => t.prestige <= 2.0) ?? league.teams[1];

  const lowOffer = {
    teamId: lowPrestigeTeam.id,
    playerId: elitePlayer.id,
    salary: 15_000_000,
    years: 4
  };
  const highOffer = {
    teamId: highPrestigeTeam.id,
    playerId: elitePlayer.id,
    salary: 5_000_000,
    years: 2
  };

  const prestigeWeight = prestigeInfluence(1);
  const lowScore = computeAttractiveness(lowOffer, elitePlayer, league, prestigeWeight, rng);
  const highScore = computeAttractiveness(highOffer, elitePlayer, league, prestigeWeight, rng);

  assert.ok(
    lowScore > highScore * 0.7,
    `low prestige team with better offer (${lowScore.toFixed(3)}) should be competitive against high prestige (${highScore.toFixed(3)})`
  );
});

test("makeContractOffer and resolvePendingOffers allow player-initiated bidding", () => {
  const league = createLeague("manual-offer");
  const elitePlayer = league.teams[0].roster.find((p) => p.overall >= 75) ?? league.teams[0].roster[0];
  league.teams[0].roster = league.teams[0].roster.filter((r) => r.id !== elitePlayer.id);
  league.freeAgents.push(elitePlayer);

  const team1 = league.teams[1];
  const team2 = league.teams[2];
  team1.roster.splice(-2, 2);
  team2.roster.splice(-2, 2);

  makeContractOffer(league, team1.id, elitePlayer.id, 8_000_000, 3);
  makeContractOffer(league, team2.id, elitePlayer.id, 10_000_000, 4);

  assert.equal(league.pendingOffers.length, 2);

  const result = resolvePendingOffers(league);

  assert.equal(result.signings.length, 1);
  assert.ok(result.rejections.length >= 1);
  const signedTeamId = result.signings[0].teamId;
  const signedTeam = league.teams.find((t) => t.id === signedTeamId);
  assert.ok(signedTeam.roster.some((p) => p.id === elitePlayer.id));
  assert.ok(!league.freeAgents.some((p) => p.id === elitePlayer.id));
});

test("offseason includes free agency and produces signings", () => {
  const league = createLeague("offseason-fa");
  simulateFullSeason(league);
  const summary = runOffseason(league);

  assert.ok(summary.freeAgency !== null, "offseason should include free agency");
  assert.ok(Array.isArray(summary.freeAgency.signings));
});

test("multi-season simulation with free agency maintains roster integrity", () => {
  const league = createLeague("multi-fa");
  simulateMultipleSeasons(league, 3);

  for (const team of league.teams) {
    assert.ok(team.roster.length >= 30, `${team.name} should have 30+ players after 3 seasons`);
    assert.ok(Object.keys(team.depthChart).length >= 8, `${team.name} should have filled depth chart`);
  }
});

test("prestige influence increases over seasons in multi-season play", () => {
  assert.ok(prestigeInfluence(1) < prestigeInfluence(4));
  assert.ok(prestigeInfluence(4) < prestigeInfluence(6));
  assert.equal(prestigeInfluence(8), 1.0);
});
