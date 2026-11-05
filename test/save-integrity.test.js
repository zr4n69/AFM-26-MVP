import test from "node:test";
import assert from "node:assert/strict";

import { createLeague, simulateRegularSeason } from "../src/index.js";
import { MAX_SLOTS, listSaveSlots, loadFromSlot, saveToSlot, setSaveProfile } from "../ui/src/save-slots.js";

function installStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
  return values;
}

test("compact saves restore completed current-season game summaries", () => {
  const storage = installStorage();
  const league = createLeague("compact-save", { playerTeamIndex: 0 });
  simulateRegularSeason(league, { seed: "compact-save-season" });
  const originalGame = league.schedule[0].games[0];

  saveToSlot(league, 0, "autosave");
  const stored = storage.get("afm26_save_slot_0");
  const loaded = loadFromSlot(0);
  const restoredGame = loaded.schedule[0].games[0];

  assert.ok(stored.length < 1_500_000, `save should stay comfortably below browser quota, received ${stored.length} bytes`);
  assert.equal(restoredGame.played, true);
  assert.deepEqual(restoredGame.boxScore, {
    home: {
      points: originalGame.boxScore.home.points,
      totalYards: originalGame.boxScore.home.totalYards,
      turnovers: originalGame.boxScore.home.turnovers
    },
    away: {
      points: originalGame.boxScore.away.points,
      totalYards: originalGame.boxScore.away.totalYards,
      turnovers: originalGame.boxScore.away.turnovers
    }
  });
});

test("corrupt saves fail without returning partial state", () => {
  const storage = installStorage();
  storage.set("afm26_save_slot_1", "{not-json");

  assert.throws(() => loadFromSlot(1), /corrupted/);
});

test("five local cache slots are isolated between account profiles", () => {
  installStorage();
  const firstLeague = createLeague("profile-one", { playerTeamIndex: 0 });
  const secondLeague = createLeague("profile-two", { playerTeamIndex: 1 });

  setSaveProfile("account-one");
  saveToSlot(firstLeague, 4, "profile-one-save");
  assert.equal(listSaveSlots().length, MAX_SLOTS);

  setSaveProfile("account-two");
  assert.equal(listSaveSlots()[4].occupied, false);
  saveToSlot(secondLeague, 4, "profile-two-save");

  setSaveProfile("account-one");
  assert.equal(loadFromSlot(4).seed, "profile-one");
  setSaveProfile(null);
});
