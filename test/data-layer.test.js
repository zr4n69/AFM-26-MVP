import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFENSIVE_CONCEPTS,
  LEAGUE_RULES,
  OFFENSIVE_CONCEPTS,
  addScoutingCurrency,
  advanceSeasonPhase,
  castHallOfFameVotes,
  changePlayerPosition,
  createLeague,
  draftProspect,
  generatePlayoffBracket,
  loadSave,
  processUndraftedFreeAgents,
  proposeTrade,
  recordAwardWinner,
  releasePlayer,
  saveGame,
  scheduleTrainingSession,
  scoutProspectGroup,
  setDepthChart,
  updateStrategy
} from "../src/index.js";

test("createLeague builds the compressed MVP league shape deterministically", () => {
  const first = createLeague("stage-2-seed");
  const second = createLeague("stage-2-seed");

  assert.equal(first.teams.length, LEAGUE_RULES.teamCount);
  assert.equal(first.schedule.length, LEAGUE_RULES.regularSeasonWeeks);
  assert.equal(first.draftClass.length, LEAGUE_RULES.draftClassSize);
  assert.deepEqual(
    first.teams.map((team) => team.id),
    second.teams.map((team) => team.id)
  );

  for (const team of first.teams) {
    assert.equal(team.roster.length, LEAGUE_RULES.rosterLimit);
    assert.equal(team.contractSummary.rosterCount, LEAGUE_RULES.rosterLimit);
    assert.ok(team.contractSummary.committedCap <= team.salaryCap);
    assert.ok(team.strategy.offensiveSystem);
    assert.ok(team.strategy.defensiveSystem);
    assert.ok(team.depthChart.QB.length >= 1);
    assert.equal(team.draftPicks.length, LEAGUE_RULES.draftRounds);
  }
});

test("createLeague includes Stage 1 system state homes", () => {
  const league = createLeague("stage-1-system-state");

  assert.equal(league.draft.picks.length, LEAGUE_RULES.draftRounds * LEAGUE_RULES.picksPerRound);
  assert.equal(league.draft.rookieContractScale[0].salary, 10_000_000);
  assert.ok(league.draft.rookieContractScale.at(-1).salary >= 1_000_000);
  assert.equal(league.draft.undraftedProspectIds.length, LEAGUE_RULES.draftClassSize);
  assert.ok(league.scouting.currencyByTeamId[league.teams[0].id] >= 0);
  assert.deepEqual(league.tradeMarket.window, { offseason: true, regularSeasonThroughWeek: 4 });
  assert.equal(league.training.camp.days, LEAGUE_RULES.trainingCampDays);
  assert.equal(league.training.regularSeason.windows.length, LEAGUE_RULES.regularSeasonTrainingWindows.length);
  assert.equal(league.playoff.format.teams, LEAGUE_RULES.playoffTeams);
  assert.deepEqual(league.awards.allPro, { firstTeam: [], secondTeam: [] });
  assert.deepEqual(league.hallOfFame.inductedPlayerIds, []);
});

test("playbook concepts store named football concepts for both sides of the ball", () => {
  assert.ok(OFFENSIVE_CONCEPTS.some((concept) => concept.id === "insideZone"));
  assert.ok(OFFENSIVE_CONCEPTS.some((concept) => concept.id === "fourVerticals"));
  assert.ok(DEFENSIVE_CONCEPTS.some((concept) => concept.id === "cover3"));
  assert.ok(DEFENSIVE_CONCEPTS.some((concept) => concept.id === "simulatedPressure"));

  for (const concept of [...OFFENSIVE_CONCEPTS, ...DEFENSIVE_CONCEPTS]) {
    assert.ok(concept.category);
    assert.ok(concept.ratingDependencies.length > 0);
    assert.ok(concept.preferredSystems.length > 0);
  }
});

test("strategy updates validate tendencies and record autosaves", () => {
  const league = createLeague("strategy-test");
  const team = league.teams[0];

  const strategy = updateStrategy(league, team.id, {
    offensiveSystem: "spreadRpo",
    tendencies: { tempo: 72, runPassLean: -20 }
  });

  assert.equal(strategy.offensiveSystem, "spreadRpo");
  assert.equal(strategy.tendencies.tempo, 72);
  assert.equal(strategy.tendencies.runPassLean, -20);
  assert.equal(league.autosaveLog.at(-1).event, "strategy");
  assert.throws(() => updateStrategy(league, team.id, { tendencies: { tempo: 101 } }), /tempo must be/);
  assert.equal(team.strategy.tendencies.tempo, 72);
});

test("depth chart and roster actions mutate team data and autosave", () => {
  const league = createLeague("roster-test");
  const team = league.teams[0];
  const qbIds = [...team.depthChart.QB].reverse();

  setDepthChart(league, team.id, "QB", qbIds);
  assert.deepEqual(team.depthChart.QB, qbIds);
  assert.equal(league.autosaveLog.at(-1).event, "lineup");

  const released = releasePlayer(league, team.id, qbIds[0]);
  assert.equal(team.roster.length, LEAGUE_RULES.rosterLimit - 1);
  assert.ok(league.freeAgents.some((player) => player.id === released.id));
  assert.equal(team.contractSummary.rosterCount, LEAGUE_RULES.rosterLimit - 1);
  assert.equal(league.autosaveLog.at(-2).event, "roster");
  assert.equal(league.autosaveLog.at(-1).event, "contract");
});

test("scouting, draft, trade, training, position, playoff, award, and Hall of Fame actions update data", () => {
  const league = createLeague("actions-test");
  const [team, otherTeam] = league.teams;

  addScoutingCurrency(league, team.id, 6);
  scoutProspectGroup(league, team.id, "passers", 5);
  assert.equal(league.scouting.currencyByTeamId[team.id], 1);
  assert.equal(league.scouting.revealedGroupsByTeamId[team.id].passers, "deep");

  const pick = league.draft.picks[0];
  const prospect = league.draftClass[0];
  draftProspect(league, pick.id, prospect.id);
  assert.equal(pick.prospectId, prospect.id);
  assert.equal(prospect.draftedByTeamId, team.id);
  assert.equal(league.draft.undraftedProspectIds.includes(prospect.id), false);
  processUndraftedFreeAgents(league);
  assert.equal(league.draft.status, "completed");
  assert.equal(league.prospectFreeAgents.length, LEAGUE_RULES.draftClassSize - 1);

  const wr = team.roster.find((player) => player.position === "WR");
  changePlayerPosition(league, team.id, wr.id, "TE");
  assert.equal(wr.position, "TE");
  assert.ok(team.depthChart.TE.includes(wr.id));

  const session = scheduleTrainingSession(league, team.id, [{ playerId: wr.id, intensity: "standard" }], { type: "camp" });
  assert.equal(session.playerPlans[0].expectedGain[1], 2);

  const trade = proposeTrade(league, team.id, otherTeam.id, { offeredPlayerIds: [wr.id] });
  assert.equal(trade.status, "proposed");

  const bracket = generatePlayoffBracket(league, league.teams.slice(0, 6).map((candidate) => candidate.id));
  assert.equal(bracket.rounds[0].games[0].homeSeed, 3);
  assert.equal(bracket.rounds[0].games[0].awaySeed, 6);

  const award = recordAwardWinner(league, "offensivePlayerOfYear", wr.id, team.id);
  assert.equal(award.playerId, wr.id);
  assert.equal(team.roster.find((player) => player.id === wr.id).awards.length, 1);

  league.hallOfFame.eligibleRetiringPlayerIds = [wr.id];
  const hall = castHallOfFameVotes(league, team.id, [wr.id]);
  assert.equal(hall.voteTotals[wr.id], 1);

  advanceSeasonPhase(league, "seasonReview");
  assert.equal(league.phase, "seasonReview");
});

test("saveGame and loadSave round-trip league data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "football-gm-"));
  const filePath = join(directory, "save.json");

  try {
    const league = createLeague("save-test");
    await saveGame(league, filePath, "test-save");
    const loaded = await loadSave(filePath);

    assert.equal(loaded.id, league.id);
    assert.equal(loaded.teams.length, LEAGUE_RULES.teamCount);
    assert.equal(loaded.schedule[0].games.length, LEAGUE_RULES.teamCount / 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
