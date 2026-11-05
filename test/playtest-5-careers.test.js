import test from "node:test";
import assert from "node:assert/strict";

import {
  PHASES,
  ROSTER_TEMPLATE,
  TRAINING_INTENSITIES,
  advanceToNextSeason,
  createLeague,
  resolveTrainingSession,
  runOffseason,
  scheduleTrainingSession,
  simulateFullSeason,
  updateStrategy
} from "../src/index.js";
import { loadFromSlot, saveToSlot } from "../ui/src/save-slots.js";

const CAREERS = [
  { name: "Florida rebuild", teamIndex: 0, seed: "playtest-florida" },
  { name: "Sacramento contender", teamIndex: 3, seed: "playtest-sacramento" },
  { name: "Omaha mid-table", teamIndex: 6, seed: "playtest-omaha" },
  { name: "Milwaukee cap test", teamIndex: 9, seed: "playtest-milwaukee" },
  { name: "Boise long build", teamIndex: 12, seed: "playtest-boise" }
];

function installIsolatedStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
  return values;
}

function saveAndReload(league, storage, reason) {
  saveToSlot(league, 0, reason);
  const raw = storage.get("afm26_save_slot_0");
  assert.ok(raw, "save slot should contain data");
  assert.ok(raw.length < 2_000_000, `save exceeded multi-slot browser-safe size: ${raw.length}`);
  const loaded = loadFromSlot(0);
  assert.equal(loaded.currentSeason, league.currentSeason);
  assert.equal(loaded.phase, league.phase);
  return { league: loaded, bytes: raw.length };
}

function completeTrainingCamp(league) {
  const team = league.teams.find((candidate) => candidate.isPlayerControlled);
  assert.ok(team, "career must retain its player-controlled team");
  for (let day = 0; day < 3; day += 1) {
    const plans = team.roster.slice(day, day + 5).map((player) => ({
      playerId: player.id,
      intensity: TRAINING_INTENSITIES.STANDARD
    }));
    const session = scheduleTrainingSession(league, team.id, plans, { type: "camp" });
    resolveTrainingSession(league, session.id);
  }
  assert.equal(league.training.camp.completed, true);
}

function assertLeagueIntegrity(league, { requireCapCompliance = false } = {}) {
  assert.equal(league.teams.length, 16);
  assert.equal(new Set(league.teams.map((team) => team.id)).size, 16);
  assert.equal(league.teams.filter((team) => team.isPlayerControlled).length, 1);

  for (const team of league.teams) {
    assert.ok(team.roster.length <= 55, `${team.name} exceeds the roster limit`);
    for (const position of Object.keys(ROSTER_TEMPLATE)) {
      assert.ok(team.roster.some((player) => player.position === position), `${team.name} has no ${position}`);
    }
    const committedCap = team.roster.reduce((sum, player) => sum + player.contract.capHit, 0);
    assert.equal(team.contractSummary.committedCap, committedCap, `${team.name} has a stale cap summary`);
    assert.equal(team.contractSummary.capSpace, team.salaryCap - committedCap);
    if (requireCapCompliance) {
      assert.ok(team.contractSummary.capSpace >= 0, `${team.name} remains over the cap`);
    }
    for (const player of team.roster) {
      assert.ok(Number.isFinite(player.overall), `${player.id} has an invalid rating`);
      assert.ok(player.overall >= 55 && player.overall <= 99, `${player.id} has an out-of-range rating`);
      assert.ok(Number.isFinite(player.fatigue), `${player.id} has invalid fatigue`);
      for (const value of Object.values(player.stats)) {
        assert.ok(Number.isFinite(value), `${player.id} has an invalid statistic`);
      }
    }
  }
}

test("playtest: five isolated careers complete four seasons with save/reload boundaries", async (t) => {
  const report = [];

  for (const career of CAREERS) {
    await t.test(career.name, () => {
      const storage = installIsolatedStorage();
      let league = createLeague(career.seed, { playerTeamIndex: career.teamIndex });
      const playerTeam = league.teams.find((team) => team.isPlayerControlled);
      const teamId = playerTeam.id;
      const champions = [];
      let largestSave = 0;

      updateStrategy(league, teamId, {
        tendencies: { ...playerTeam.strategy.tendencies, tempo: 55, aggression: 52 }
      });

      for (let seasonIndex = 0; seasonIndex < 4; seasonIndex += 1) {
        assert.equal(league.phase, PHASES.PRESEASON);
        completeTrainingCamp(league);

        ({ league } = saveAndReload(league, storage, `career-${seasonIndex + 1}-camp`));
        largestSave = Math.max(largestSave, storage.get("afm26_save_slot_0").length);

        const result = simulateFullSeason(league, {
          seed: `${career.seed}-season-${seasonIndex + 1}`
        });
        champions.push(result.championTeamId);

        assert.equal(league.phase, PHASES.SEASON_REVIEW);
        assert.equal(league.currentWeek, 10);
        assert.equal(league.schedule.flatMap((week) => week.games).filter((game) => game.played).length, 80);
        assert.ok(league.teams.some((team) => team.id === result.championTeamId));
        assert.ok(Object.keys(league.awards.winners).length >= 3);
        assert.equal(league.seasonHistory.length, seasonIndex + 1);
        assertLeagueIntegrity(league);

        ({ league } = saveAndReload(league, storage, `career-${seasonIndex + 1}-review`));
        largestSave = Math.max(largestSave, storage.get("afm26_save_slot_0").length);
        assert.equal(league.schedule.flatMap((week) => week.games).filter((game) => game.played).length, 80);

        const offseason = runOffseason(league);
        assert.equal(league.phase, PHASES.OFFSEASON);
        assert.equal(league.draft.status, "completed");
        assert.equal(offseason.draft.picks.length, 80);
        assertLeagueIntegrity(league, { requireCapCompliance: true });

        ({ league } = saveAndReload(league, storage, `career-${seasonIndex + 1}-offseason`));
        largestSave = Math.max(largestSave, storage.get("afm26_save_slot_0").length);
        assertLeagueIntegrity(league, { requireCapCompliance: true });

        if (seasonIndex < 3) {
          const nextSeason = advanceToNextSeason(league);
          assert.equal(nextSeason, seasonIndex + 2);
          assert.equal(league.phase, PHASES.PRESEASON);
          assert.equal(league.currentWeek, 0);
          assert.equal(league.draft.picks.length, 80);
          ({ league } = saveAndReload(league, storage, `career-${seasonIndex + 2}-start`));
        }
      }

      assert.equal(league.currentSeason, 4);
      assert.equal(league.seasonHistory.length, 4);
      assert.equal(league.teams.find((team) => team.isPlayerControlled).id, teamId);
      report.push({ career: career.name, team: playerTeam.name, champions, largestSave });
    });
  }

  assert.equal(report.length, 5);
  assert.equal(report.reduce((sum) => sum + 4, 0), 20);
  console.log(`\n5-career playtest report:\n${report.map((entry) =>
    `  ${entry.career}: ${entry.team}, 4 seasons, largest save ${(entry.largestSave / 1_000_000).toFixed(2)} MB`
  ).join("\n")}`);
});
