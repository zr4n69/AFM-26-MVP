import test from "node:test";
import assert from "node:assert/strict";

import { createLeague, simulateRegularSeason } from "../src/index.js";

function specialTeamsTotals(league) {
  const specialists = league.teams.flatMap((team) => team.roster)
    .filter((player) => player.position === "K" || player.position === "P");
  return specialists.reduce((totals, player) => ({
    attempts: totals.attempts + player.stats.fieldGoalsAttempted,
    made: totals.made + player.stats.fieldGoalsMade,
    punts: totals.punts + player.stats.punts,
    puntYards: totals.puntYards + player.stats.puntYards
  }), { attempts: 0, made: 0, punts: 0, puntYards: 0 });
}

test("kickers and punters accumulate meaningful game statistics", () => {
  const league = createLeague("special-teams-stats");
  simulateRegularSeason(league, { seed: "special-teams-season" });
  const totals = specialTeamsTotals(league);

  assert.ok(totals.attempts > 0);
  assert.ok(totals.made > 0 && totals.made <= totals.attempts);
  assert.ok(totals.punts > 0);
  assert.ok(totals.puntYards >= totals.punts * 25);
});

test("elite kickers convert a higher share than replacement-level kickers", () => {
  const eliteLeague = createLeague("kicker-rating-impact");
  const replacementLeague = createLeague("kicker-rating-impact");
  for (const team of eliteLeague.teams) team.roster.find((player) => player.position === "K").overall = 99;
  for (const team of replacementLeague.teams) team.roster.find((player) => player.position === "K").overall = 40;

  simulateRegularSeason(eliteLeague, { seed: "shared-kicker-season" });
  simulateRegularSeason(replacementLeague, { seed: "shared-kicker-season" });
  const elite = specialTeamsTotals(eliteLeague);
  const replacement = specialTeamsTotals(replacementLeague);

  assert.ok(elite.made / elite.attempts > replacement.made / replacement.attempts);
});
