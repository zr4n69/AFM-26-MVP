import test from "node:test";
import assert from "node:assert/strict";

import { compactCareerHistory, createLeague, LEAGUE_RULES } from "../src/index.js";

test("career history keeps five detailed seasons and permanent compact records", () => {
  const league = createLeague("history-retention", { playerTeamIndex: 0 });
  const userTeam = league.teams.find((team) => team.isPlayerControlled);
  const champion = league.teams[1];

  league.seasonHistory = Array.from({ length: 7 }, (_, index) => ({
    season: index + 1,
    standings: league.teams.map((team) => ({
      teamId: team.id,
      wins: team.id === userTeam.id ? index + 3 : 5,
      losses: team.id === userTeam.id ? 7 - index : 5,
      ties: 0,
      pointsFor: 200 + index,
      pointsAgainst: 190
    })),
    championTeamId: index === 0 ? userTeam.id : champion.id,
    awards: {
      seasonMvp: { playerId: `mvp-${index + 1}`, teamId: index === 1 ? userTeam.id : champion.id }
    },
    allPro: { firstTeam: [], secondTeam: [] }
  }));

  compactCareerHistory(league);

  assert.equal(league.seasonHistory.length, LEAGUE_RULES.detailedHistorySeasons);
  assert.deepEqual(league.seasonHistory.map((season) => season.season), [3, 4, 5, 6, 7]);
  assert.deepEqual(league.careerArchive.seasons.map((season) => season.season), [1, 2]);
  assert.equal(league.careerArchive.seasons[0].championTeamId, userTeam.id);
  assert.equal(league.careerArchive.seasons[0].userFranchise.champion, true);
  assert.equal(league.careerArchive.seasons[1].userFranchise.awards.seasonMvp.playerId, "mvp-2");
});
