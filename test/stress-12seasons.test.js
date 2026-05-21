import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createLeague } from "../src/data/factories.js";
import { simulateMultipleSeasons, runOffseason, advanceToNextSeason } from "../src/simulation/season.js";

describe("12-season stress test (3 runs)", () => {
  for (let run = 1; run <= 3; run++) {
    it(`Run ${run}: simulates 12 full seasons without crashing`, { timeout: 120_000 }, () => {
      const seed = `stress-test-run-${run}-${Date.now()}`;
      const league = createLeague(seed, { playerTeamIndex: 0, playerPrestige: 4.25 });

      const start = performance.now();
      const results = simulateMultipleSeasons(league, 12);
      const elapsed = ((performance.now() - start) / 1000).toFixed(1);

      // Basic assertions
      assert.equal(results.length, 12, "Should have 12 season results");
      assert.equal(league.currentSeason, 12, "League should be on season 12");

      // Every season should have a champion
      for (let i = 0; i < results.length; i++) {
        assert.ok(results[i].championTeamId, `Season ${i + 1} should have a champion`);
      }

      // All 16 teams should still exist
      assert.equal(league.teams.length, 16, "Should still have 16 teams");

      // Every team should have a valid roster (at least 30 players)
      for (const team of league.teams) {
        assert.ok(
          team.roster.length >= 30,
          `${team.name} should have at least 30 players, has ${team.roster.length}`
        );
      }

      // Log summary
      const champions = results.map((r, i) => {
        const team = league.teams.find(t => t.id === r.championTeamId);
        return `S${i + 1}: ${team?.name || "?"}`;
      });
      const rosterSizes = league.teams.map(t => t.roster.length);

      console.log(`\n  Run ${run} completed in ${elapsed}s`);
      console.log(`  Champions: ${champions.join(", ")}`);
      console.log(`  Roster sizes: ${Math.min(...rosterSizes)}-${Math.max(...rosterSizes)}`);
      console.log(`  Free agents: ${league.freeAgents.length}`);
    });
  }
});
