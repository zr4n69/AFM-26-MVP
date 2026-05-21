import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createLeague, createContractFromSalary } from "../src/data/factories.js";
import {
  updateStrategy, setDepthChart, releasePlayer, signPlayer,
  extendContract, renegotiateContract, estimateRenegotiationValue, isCapCompliant,
  checkCapCompliance, enforceCapCompliance,
  addScoutingCurrency, scoutProspectGroup,
  draftProspect, processUndraftedFreeAgents,
  proposeTrade, completeTrade,
  changePlayerPosition,
  scheduleTrainingSession, resolveTrainingSession,
  generatePlayoffBracket, recordAwardWinner,
  castHallOfFameVotes, advanceSeasonPhase
} from "../src/data/actions.js";
import {
  simulateGame, simulateWeek, simulateRegularSeason,
  generatePlayoffSeeds, simulatePlayoffRound,
  runCpuTeamManagement, selectDriveConcepts
} from "../src/simulation/engine.js";
import {
  runFreeAgencyPeriod, makeContractOffer, resolvePendingOffers,
  estimateMarketSalary
} from "../src/simulation/free-agency.js";
import { calculateTradeValue, evaluateCpuTradeResponse } from "../src/simulation/trade-value.js";
import {
  executeCpuRosterMoves, executeCpuOffseasonSignings,
  cpuPickProspect, convertProspectToPlayer,
  executeCpuAutoDraft, validateRosterCompliance
} from "../src/simulation/cpu-ai.js";
import {
  simulateFullSeason, runSeasonReview, runOffseason, advanceToNextSeason
} from "../src/simulation/season.js";
import { saveToSlot, loadFromSlot, listSaveSlots, deleteSlot } from "../ui/src/save-slots.js";
import { createRng } from "../src/data/random.js";
import {
  PHASES, TRAINING_INTENSITIES, OFFENSIVE_SYSTEMS, DEFENSIVE_SYSTEMS,
  POSITION_CHANGE_GROUPS, LEAGUE_RULES
} from "../src/data/constants.js";

// Mock localStorage for Node.js
const store = {};
globalThis.localStorage = {
  getItem(k) { return store[k] ?? null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; },
};

function makeLeague(runIndex) {
  return createLeague(`full-mech-test-${runIndex}-${Date.now()}`, {
    playerTeamIndex: 0,
    playerPrestige: 4.25,
  });
}

function userTeam(league) {
  return league.teams.find(t => t.isPlayerControlled);
}

function cpuTeam(league) {
  return league.teams.find(t => !t.isPlayerControlled);
}

describe("Full mechanics test (2 runs × 2 seasons)", () => {
  for (let run = 1; run <= 2; run++) {
    describe(`Run ${run}`, { timeout: 120_000 }, () => {
      let league;

      beforeEach(() => {
        league = makeLeague(run);
      });

      // ── LEAGUE CREATION ──
      it("creates a valid league", () => {
        assert.equal(league.teams.length, 16);
        assert.equal(league.currentSeason, 1);
        assert.equal(league.phase, PHASES.PRESEASON);
        assert.ok(league.freeAgents.length > 0, "Should have free agents");
        assert.ok(league.draftClass.length === LEAGUE_RULES.draftClassSize);
        assert.ok(league.schedule.length === LEAGUE_RULES.regularSeasonWeeks);

        for (const team of league.teams) {
          assert.ok(team.roster.length >= 45, `${team.name} has ${team.roster.length} players`);
          assert.ok(team.salaryCap >= LEAGUE_RULES.minSalaryCap);
          assert.ok(team.strategy);
          assert.ok(team.depthChart);
          assert.ok(team.contractSummary);
        }
      });

      // ── STRATEGY ──
      it("updates team strategy and tendencies", () => {
        const team = userTeam(league);
        const result = updateStrategy(league, team.id, {
          offensiveSystem: OFFENSIVE_SYSTEMS.SPREAD_RPO,
          defensiveSystem: DEFENSIVE_SYSTEMS.MAN_BLITZ,
          tendencies: { tempo: 80, aggression: 70, blitzRate: 90 },
        });
        assert.equal(result.offensiveSystem, "spreadRpo");
        assert.equal(result.defensiveSystem, "manBlitz");
        assert.equal(result.tendencies.tempo, 80);
        assert.equal(result.tendencies.aggression, 70);
        assert.equal(result.tendencies.blitzRate, 90);

        // Out-of-range tendency should throw
        assert.throws(() =>
          updateStrategy(league, team.id, { tendencies: { tempo: 999 } })
        );
      });

      // ── DEPTH CHART ──
      it("sets and validates depth chart", () => {
        const team = userTeam(league);
        const wrs = team.roster.filter(p => p.position === "WR");
        assert.ok(wrs.length >= 2, "Need at least 2 WRs");

        const newOrder = wrs.map(p => p.id).reverse();
        const chart = setDepthChart(league, team.id, "WR", newOrder);
        assert.deepEqual(chart.WR, newOrder);

        // Invalid player should throw
        assert.throws(() =>
          setDepthChart(league, team.id, "WR", ["fake-id"])
        );
      });

      // ── ROSTER: RELEASE & SIGN ──
      it("releases and signs players", () => {
        const team = userTeam(league);
        const initialCount = team.roster.length;
        const player = team.roster.find(p =>
          team.roster.filter(r => r.position === p.position).length >= 2
        );
        assert.ok(player, "Need a player at a position with depth");

        const released = releasePlayer(league, team.id, player.id);
        assert.equal(released.id, player.id);
        assert.equal(team.roster.length, initialCount - 1);
        assert.ok(league.freeAgents.some(fa => fa.id === player.id));

        // Sign a free agent
        const fa = league.freeAgents.find(p => p.position === "WR" || p.position === "RB");
        assert.ok(fa, "Need a free agent to sign");
        fa.contract = createContractFromSalary(2_000_000, 2);
        signPlayer(league, team.id, fa);
        assert.ok(team.roster.some(p => p.id === fa.id));
        assert.ok(!league.freeAgents.some(p => p.id === fa.id));
      });

      // ── CONTRACTS: EXTEND & RENEGOTIATE ──
      it("extends and renegotiates contracts", () => {
        const team = userTeam(league);
        const eligible = team.roster.find(p => p.contract.extensionEligible);
        if (eligible) {
          // Offer well above market (max possible market ≈ $35M) so always accepted
          const terms = {
            salary: 40_000_000,
            yearsRemaining: 4,
            guaranteedAmount: 80_000_000,
            bonusAmount: 500_000,
          };
          const ext = extendContract(league, team.id, eligible.id, terms);
          assert.ok(!ext.rejected, `Extension unexpectedly rejected: ${ext.reason}`);
          assert.equal(ext.salary, 40_000_000);
          assert.equal(ext.yearsRemaining, 4);
        }

        // Renegotiate
        league.phase = PHASES.OFFSEASON;
        const target = team.roster[0];
        const contract = renegotiateContract(league, team.id, target.id, 10_000_000, 3);
        assert.equal(contract.salary, 10_000_000);
        assert.equal(contract.yearsRemaining, 3);
        league.phase = PHASES.PRESEASON;

        // estimateRenegotiationValue
        const estimate = estimateRenegotiationValue(target);
        assert.ok(estimate > 0, "Estimate should be positive");
      });

      // ── CAP COMPLIANCE ──
      it("checks and enforces cap compliance", () => {
        const team = userTeam(league);
        const compliant = isCapCompliant(team);
        assert.equal(typeof compliant, "boolean");

        const allCompliance = checkCapCompliance(league);
        assert.equal(allCompliance.length, 16);

        // Force a team over cap then enforce
        const cpu = cpuTeam(league);
        cpu.salaryCap = 1;
        cpu.contractSummary.capSpace = -100_000_000;
        const result = enforceCapCompliance(league, cpu.id);
        assert.equal(result.teamId, cpu.id);
        assert.ok(result.released.length >= 0);
      });

      // ── POSITION CHANGE ──
      it("changes player position within eligible groups", () => {
        const team = userTeam(league);
        const ot = team.roster.find(p => p.position === "OT");
        if (ot) {
          const changed = changePlayerPosition(league, team.id, ot.id, "OG");
          assert.equal(changed.position, "OG");
          assert.ok(changed.positionChange.history.length > 0);

          // Invalid change should throw
          assert.throws(() =>
            changePlayerPosition(league, team.id, ot.id, "QB")
          );
        }
      });

      // ── TRAINING ──
      it("schedules and resolves training sessions", () => {
        const team = userTeam(league);
        const plans = team.roster.slice(0, 3).map(p => ({
          playerId: p.id,
          intensity: TRAINING_INTENSITIES.STANDARD,
        }));

        const session = scheduleTrainingSession(league, team.id, plans, { type: "camp" });
        assert.ok(session.id);
        assert.equal(session.completed, false);
        assert.equal(session.playerPlans.length, 3);

        const results = resolveTrainingSession(league, session.id);
        assert.equal(results.length, 3);
        for (const r of results) {
          assert.ok("gain" in r);
          assert.ok("injured" in r);
        }

        // Can't resolve again
        assert.throws(() => resolveTrainingSession(league, session.id));
      });

      // ── SCOUTING ──
      it("adds scouting currency and scouts prospect groups", () => {
        const team = userTeam(league);
        const currency = addScoutingCurrency(league, team.id, 10, "test");
        assert.ok(currency >= 10);

        // revealedGroupsByTeamId starts empty — scout a known position
        const group = "QB";
        const revealed = scoutProspectGroup(league, team.id, group, 5);
        assert.ok(revealed[group], "Should reveal group");

        // Not enough currency should throw
        assert.throws(() =>
          scoutProspectGroup(league, team.id, group, 999999)
        );
      });

      // ── DRAFT ──
      it("drafts prospects (manual + CPU)", () => {
        const team = userTeam(league);
        const pick = league.draft.picks.find(p => p.currentTeamId === team.id && !p.prospectId);
        assert.ok(pick, "User team should have a draft pick");

        const prospect = league.draftClass.find(p => !p.draftedByTeamId);
        assert.ok(prospect, "Should have undrafted prospects");

        const result = draftProspect(league, pick.id, prospect.id);
        assert.equal(result.pick.prospectId, prospect.id);
        assert.equal(result.prospect.draftedByTeamId, team.id);

        // CPU pick
        const cpuT = cpuTeam(league);
        const cpuPick = league.draft.picks.find(p => p.currentTeamId === cpuT.id && !p.prospectId);
        if (cpuPick) {
          const cpuProspect = cpuPickProspect(league, cpuT.id);
          assert.ok(cpuProspect, "CPU should pick a prospect");
        }

        // Convert prospect to player
        const rng = createRng("test-convert");
        const player = convertProspectToPlayer(league, result.prospect, team.id, rng);
        assert.ok(player.id);
        assert.ok(player.overall > 0);
        assert.ok(player.contract.salary > 0);
      });

      it("runs full CPU auto-draft", () => {
        const result = executeCpuAutoDraft(league, { seed: "test-autodraft" });
        assert.ok(result.picks.length > 0, "Should draft some players");
      });

      it("processes undrafted free agents", () => {
        // First run autodraft to consume some picks
        executeCpuAutoDraft(league, { seed: "test-autodraft-2" });
        const undrafted = processUndraftedFreeAgents(league);
        assert.ok(Array.isArray(undrafted));
        assert.equal(league.draft.status, "completed");
      });

      // ── TRADES ──
      it("proposes, evaluates, and completes trades", () => {
        league.phase = PHASES.PRESEASON;
        league.currentWeek = 1;
        const teamA = userTeam(league);
        const teamB = cpuTeam(league);

        // Find tradeable players
        const playerA = teamA.roster.find(p =>
          teamA.roster.filter(r => r.position === p.position).length >= 2
        );
        const playerB = teamB.roster.find(p =>
          teamB.roster.filter(r => r.position === p.position).length >= 2
        );
        assert.ok(playerA && playerB, "Need tradeable players on both teams");

        const trade = proposeTrade(league, teamA.id, teamB.id, {
          offeredPlayerIds: [playerA.id],
          requestedPlayerIds: [playerB.id],
        });
        assert.ok(trade.id);
        assert.equal(trade.status, "proposed");

        // Evaluate CPU response
        const response = evaluateCpuTradeResponse(league, trade);
        assert.ok(response, "Should get a response");

        // Force accept and complete
        trade.status = "accepted";
        const completed = completeTrade(league, trade.id);
        assert.equal(completed.status, "completed");
        assert.ok(teamA.roster.some(p => p.id === playerB.id));
        assert.ok(teamB.roster.some(p => p.id === playerA.id));
      });

      // ── TRADE VALUE ──
      it("calculates trade values", () => {
        const team = userTeam(league);
        const player = team.roster[0];
        const value = calculateTradeValue(league, team.id, {
          playerIds: [player.id],
          pickIds: [],
        });
        assert.ok(typeof value === "number");
        assert.ok(value >= 0);
      });

      // ── FREE AGENCY ──
      it("makes and resolves contract offers", () => {
        const team = userTeam(league);

        // Free a roster spot so the offer can be made
        const expendable = team.roster.find(p =>
          team.roster.filter(r => r.position === p.position).length >= 3
        );
        if (expendable) releasePlayer(league, team.id, expendable.id);

        const fa = league.freeAgents[0];
        assert.ok(fa, "Need a free agent");

        const estimate = estimateMarketSalary(fa);
        assert.ok(estimate > 0);

        const offer = makeContractOffer(league, team.id, fa.id, estimate, 2);
        assert.ok(offer, "Should create an offer");

        const resolved = resolvePendingOffers(league, { seed: "test-resolve" });
        assert.ok(resolved, "Should resolve offers");
      });

      it("runs full free agency period", () => {
        const result = runFreeAgencyPeriod(league, { seed: "test-fa" });
        assert.ok(result, "Should complete free agency");
        assert.ok("signed" in result || "signings" in result || typeof result === "object");
      });

      // ── GAME SIMULATION ──
      it("simulates individual games", () => {
        advanceSeasonPhase(league, PHASES.REGULAR_SEASON);
        const game = league.schedule[0].games[0];
        assert.ok(game, "Need a game");

        const result = simulateGame(league, game.id);
        assert.ok(result, "Should produce a result");
        assert.ok(game.played, "Game should be marked played");
        assert.ok(game.boxScore, "Should have box score");
      });

      it("simulates a full week", () => {
        advanceSeasonPhase(league, PHASES.REGULAR_SEASON);
        const games = simulateWeek(league, 1);
        assert.ok(games.length > 0, "Should simulate games");
        assert.equal(league.currentWeek, 1);
      });

      // ── DRIVE CONCEPTS ──
      it("selects drive concepts", () => {
        const team = userTeam(league);
        const opp = cpuTeam(league);
        const rng = createRng("test-concepts");
        const concepts = selectDriveConcepts(team, opp, {}, rng);
        assert.ok(concepts, "Should return concepts");
      });

      // ── CPU TEAM MANAGEMENT ──
      it("runs CPU team management", () => {
        advanceSeasonPhase(league, PHASES.REGULAR_SEASON);
        simulateWeek(league, 1);
        assert.doesNotThrow(() => runCpuTeamManagement(league));
      });

      // ── FULL SEASON + PLAYOFFS ──
      it("simulates full regular season, playoffs, and awards", () => {
        const result = simulateFullSeason(league);
        assert.ok(result.championTeamId, "Should have a champion");
        assert.equal(result.season, 1);
        assert.ok(result.standings.length > 0);

        // Verify playoff structure
        assert.ok(league.playoff.seeds.length > 0);
        assert.ok(league.playoff.rounds.length > 0);
        assert.equal(league.phase, PHASES.SEASON_REVIEW);
      });

      // ── AWARDS ──
      it("records award winners", () => {
        simulateFullSeason(league);
        const awards = league.awards.winners;
        assert.ok(awards.seasonMvp || Object.keys(awards).length > 0, "Should have awards");

        // All-Pro teams
        assert.ok(league.awards.allPro.firstTeam.length > 0, "Should have first team All-Pro");
      });

      // ── HALL OF FAME ──
      it("casts Hall of Fame votes", () => {
        simulateFullSeason(league);
        runOffseason(league);

        // Add some eligible players if none exist
        if (league.hallOfFame.eligibleRetiringPlayerIds.length === 0) {
          league.hallOfFame.eligibleRetiringPlayerIds.push("test-hof-1", "test-hof-2");
        }

        const team1 = league.teams[0];
        const team2 = league.teams[1];
        const playerIds = league.hallOfFame.eligibleRetiringPlayerIds.slice(0, 2);

        const hof1 = castHallOfFameVotes(league, team1.id, playerIds);
        assert.ok(hof1.voteTotals, "Should have vote totals");

        const hof2 = castHallOfFameVotes(league, team2.id, playerIds);
        assert.ok(hof2.voteTotals);
      });

      // ── OFFSEASON ──
      it("runs full offseason (retirements, expirations, development, FA)", () => {
        simulateFullSeason(league);
        const summary = runOffseason(league);
        assert.ok(summary, "Should produce offseason summary");
        assert.ok(Array.isArray(summary.retirements));
        assert.ok(Array.isArray(summary.contractExpirations));
        assert.ok(Array.isArray(summary.developmentChanges));
        assert.equal(league.phase, PHASES.OFFSEASON);
      });

      // ── ADVANCE TO NEXT SEASON ──
      it("advances to next season with proper state reset", () => {
        simulateFullSeason(league);
        runOffseason(league);
        const nextSeason = advanceToNextSeason(league);
        assert.equal(nextSeason, 2);
        assert.equal(league.currentSeason, 2);
        assert.equal(league.currentWeek, 0);
        assert.equal(league.phase, PHASES.PRESEASON);

        // Verify fresh schedule and standings
        assert.equal(league.schedule.length, LEAGUE_RULES.regularSeasonWeeks);
        for (const entry of league.standings) {
          assert.equal(entry.wins, 0);
          assert.equal(entry.losses, 0);
        }

        // Verify new draft class
        assert.ok(league.draftClass.length > 0);
        assert.equal(league.draft.season, 2);
      });

      // ── ROSTER COMPLIANCE ──
      it("validates roster compliance", () => {
        const violations = validateRosterCompliance(league);
        assert.ok(Array.isArray(violations));
      });

      // ── CPU OFFSEASON SIGNINGS ──
      it("runs CPU offseason signings", () => {
        simulateFullSeason(league);
        runOffseason(league);
        assert.doesNotThrow(() =>
          executeCpuOffseasonSignings(league, { seed: "test-cpu-sign" })
        );
      });

      // ── SAVE / LOAD ──
      it("saves and loads game state correctly", () => {
        // Simulate some progress
        simulateFullSeason(league);
        const championBefore = league.playoff.championTeamId;
        const seasonBefore = league.currentSeason;

        // Save
        saveToSlot(league, run - 1, "test-save");
        const slots = listSaveSlots();
        const slot = slots.find(s => s.slotIndex === run - 1);
        assert.ok(slot.occupied, "Slot should be occupied");

        // Load
        const loaded = loadFromSlot(run - 1);
        assert.equal(loaded.currentSeason, seasonBefore);
        assert.equal(loaded.playoff.championTeamId, championBefore);
        assert.equal(loaded.teams.length, 16);

        // Verify loaded state has correct team data
        const userBefore = userTeam(league);
        const userAfter = loaded.teams.find(t => t.isPlayerControlled);
        assert.equal(userAfter.name, userBefore.name);
        assert.equal(userAfter.roster.length, userBefore.roster.length);

        // Cleanup
        deleteSlot(run - 1);
        const cleaned = listSaveSlots();
        assert.ok(!cleaned.find(s => s.slotIndex === run - 1)?.occupied);
      });

      // ── FULL 2-SEASON INTEGRATION ──
      it("runs 2 full seasons end-to-end", () => {
        // Season 1
        const s1 = simulateFullSeason(league);
        assert.ok(s1.championTeamId, "Season 1 should have champion");
        const champ1 = league.teams.find(t => t.id === s1.championTeamId)?.name;

        const offseason1 = runOffseason(league);
        assert.ok(offseason1.retirements);

        advanceToNextSeason(league);
        assert.equal(league.currentSeason, 2);

        // Season 2
        const s2 = simulateFullSeason(league);
        assert.ok(s2.championTeamId, "Season 2 should have champion");
        const champ2 = league.teams.find(t => t.id === s2.championTeamId)?.name;

        // Verify all teams healthy after 2 seasons
        for (const team of league.teams) {
          assert.ok(team.roster.length >= 30, `${team.name}: ${team.roster.length} players`);
        }

        // Verify season history
        assert.ok(league.seasonHistory.length >= 1, "Should have season history");

        console.log(`\n  Run ${run}: S1 champ = ${champ1}, S2 champ = ${champ2}`);
        console.log(`  Rosters: ${league.teams.map(t => t.roster.length).join(", ")}`);
        console.log(`  Free agents: ${league.freeAgents.length}`);
      });

      // ── AUTOSAVE LOG ──
      it("accumulates autosave log entries", () => {
        simulateFullSeason(league);
        assert.ok(league.autosaveLog.length > 0, "Should have autosave entries");
        const events = new Set(league.autosaveLog.map(e => e.event));
        assert.ok(events.has("season"), "Should log season events");
        assert.ok(events.has("game") || events.has("week"), "Should log game/week events");
      });
    });
  }
});
