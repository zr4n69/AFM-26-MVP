import {
  LEAGUE_RULES,
  PHASES,
  ROSTER_TEMPLATE
} from "../data/constants.js";
import {
  advanceSeasonPhase,
  castHallOfFameVotes,
  completeTrade,
  enforceCapCompliance,
  generatePlayoffBracket,
  proposeTrade,
  recordAwardWinner,
  recordAutosave
} from "../data/actions.js";
import {
  createContractFromSalary,
  salaryCapFromPrestige,
  createLeague,
  createStrategy,
  buildPositionSlots,
  generateProspectRating,
  createRookieContractScale,
  DRAFT_BASE_WEIGHTS,
  DRAFT_MINIMUMS,
  DRAFT_CLASS_THEMES
} from "../data/factories.js";
import { createRng, makeId } from "../data/random.js";
import {
  generatePlayoffSeeds,
  simulatePlayoffRound,
  simulateRegularSeason
} from "./engine.js";
import { runFreeAgencyPeriod } from "./free-agency.js";
import { executeCpuAutoDraft, executeCpuOffseasonSignings, validateRosterCompliance, repairRosterCompliance } from "./cpu-ai.js";
import { BUILD_PHASES, assessTeamBuildPhase, calculateTradeValue, evaluateCpuTradeResponse } from "./trade-value.js";

export function runSeasonReview(league) {
  if (league.awards?.regularSeasonProcessed) return league.awards.winners;
  advanceSeasonPhase(league, PHASES.SEASON_REVIEW);
  const awards = computeSeasonAwards(league);
  league.awards.regularSeasonProcessed = true;
  league.awards.winners = awards;

  // Record major award winners on player objects
  for (const [awardType, entry] of Object.entries(awards)) {
    try {
      recordAwardWinner(league, awardType, entry.playerId, entry.teamId);
    } catch (_) { /* ignore if player not found */ }
  }

  // Compute and record All-Pro teams
  computeAllProTeams(league);

  // Process contract bonus expectations and season-level prestige movement.
  processContractBonuses(league);
  updateFranchisePrestige(league);

  league.seasonHistory.push({
    season: league.currentSeason,
    standings: structuredClone(league.standings),
    championTeamId: league.playoff.championTeamId,
    awards: structuredClone(awards),
    allPro: structuredClone(league.awards.allPro)
  });
  recordAutosave(league, "season", { action: "review", season: league.currentSeason });
  return awards;
}

function computeAllProTeams(league) {
  const allPlayers = league.teams.flatMap((team) =>
    team.roster.map((player) => ({ ...player, teamId: team.id }))
  );

  const allProSlots = {
    QB: 1, RB: 1, WR: 2, TE: 1, OT: 2, OG: 2, C: 1,
    EDGE: 2, DL: 2, LB: 2, CB: 2, S: 2
  };

  const scoreFn = (p) => {
    if (["QB", "RB", "WR", "TE"].includes(p.position)) return totalOffensiveValue(p) + p.overall * 2;
    if (["OT", "OG", "C"].includes(p.position)) return p.overall * 5;
    return totalDefensiveValue(p) + p.overall * 2;
  };

  for (const [position, count] of Object.entries(allProSlots)) {
    const candidates = allPlayers
      .filter((p) => p.position === position)
      .sort((a, b) => scoreFn(b) - scoreFn(a));

    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      try {
        recordAwardWinner(league, "firstTeamAllPro", candidates[i].id, candidates[i].teamId, { position });
      } catch (_) { /* skip */ }
    }
    for (let i = count; i < Math.min(count * 2, candidates.length); i++) {
      try {
        recordAwardWinner(league, "secondTeamAllPro", candidates[i].id, candidates[i].teamId, { position });
      } catch (_) { /* skip */ }
    }
  }
}

function runCpuToCpuTrades(league, rng) {
  const trades = [];
  const cpuTeams = league.teams.filter(t => !t.isPlayerControlled);
  const maxTrades = Math.min(6, Math.max(3, Math.floor(cpuTeams.length / 3)));
  const postures = new Map(cpuTeams.map((team) => [team.id, assessTeamBuildPhase(league, team)]));

  for (let attempt = 0; attempt < maxTrades * 2 && trades.length < maxTrades; attempt++) {
    const strategic =
      tryCapAbsorptionCpuTrade(league, cpuTeams, postures, rng)
      || tryRebuilderSellTrade(league, cpuTeams, postures, rng)
      || tryStrategicCpuTrade(league, cpuTeams, postures, rng);
    if (!strategic) continue;
    trades.push(strategic);
    league.tradeMarket.cpuToCpuTrades.push(strategic);
  }

  for (let attempt = 0; attempt < maxTrades && trades.length < maxTrades; attempt++) {
    if (cpuTeams.length < 2) break;
    const teamA = rng.pick(cpuTeams);
    const teamB = rng.pick(cpuTeams.filter(t => t.id !== teamA.id));

    // Team A offers their lowest-value starter for Team B's best bench player at a needed position
    const aNeeds = Object.entries(ROSTER_TEMPLATE)
      .filter(([pos, count]) => teamA.roster.filter(p => p.position === pos).length < count)
      .map(([pos]) => pos);
    if (aNeeds.length === 0) continue;

    const targetPos = rng.pick(aNeeds);
    const bCandidates = teamB.roster
      .filter(p => p.position === targetPos && p.overall >= 65)
      .sort((a, b) => a.overall - b.overall);
    if (bCandidates.length < 2) continue; // Don't trade if B only has 1 at the position

    const offered = bCandidates[0];
    const aTradeables = teamA.roster
      .filter(p => p.overall >= 60 && p.overall <= offered.overall + 5)
      .sort((a, b) => a.overall - b.overall);
    if (aTradeables.length === 0) continue;

    const giving = aTradeables[0];
    const inVal = calculateTradeValue(league, teamA.id, { playerIds: [giving.id], pickIds: [] });
    const outVal = calculateTradeValue(league, teamB.id, { playerIds: [offered.id], pickIds: [] });
    if (outVal <= 0 || inVal / outVal < 0.7) continue;

    const trade = proposeTrade(league, teamA.id, teamB.id, {
      offeredPlayerIds: [giving.id],
      requestedPlayerIds: [offered.id],
      notes: ["cpuNeedSwap"]
    });
    trade.status = "accepted";
    completeTrade(league, trade.id);

    const record = {
      fromTeamId: teamA.id, toTeamId: teamB.id,
      given: { playerId: giving.id, name: `${giving.firstName} ${giving.lastName}`, position: giving.position },
      received: { playerId: offered.id, name: `${offered.firstName} ${offered.lastName}`, position: offered.position },
    };
    trades.push(record);
    league.tradeMarket.cpuToCpuTrades.push(record);
  }
  return trades;
}

function tryCapAbsorptionCpuTrade(league, cpuTeams, postures, rng) {
  const absorbers = shuffled(cpuTeams, rng).filter((team) => {
    const phase = postures.get(team.id)?.phase;
    const capSpace = team.contractSummary?.capSpace ?? 0;
    return (phase === BUILD_PHASES.REBUILDING || phase === BUILD_PHASES.RETOOLING)
      && capSpace > (team.salaryCap || 200_000_000) * 0.12
      && team.roster.length < LEAGUE_RULES.rosterLimit;
  });
  if (absorbers.length === 0) return null;

  const senders = shuffled(cpuTeams, rng).filter((team) => {
    const phase = postures.get(team.id)?.phase;
    return phase === BUILD_PHASES.CONTENDING
      || phase === BUILD_PHASES.ALL_IN
      || (team.contractSummary?.capSpace ?? 0) < (team.salaryCap || 200_000_000) * 0.04;
  });

  for (const absorber of absorbers) {
    for (const sender of senders) {
      if (sender.id === absorber.id) continue;
      const dumpCandidate = sender.roster
        .filter((player) =>
          player.age >= 30
          && player.overall >= 72
          && player.overall <= 82
          && (player.contract?.capHit || 0) >= 8_000_000
          && (absorber.contractSummary?.capSpace ?? 0) > (player.contract?.capHit || 0) + 2_000_000
          && sender.roster.filter((candidate) => candidate.position === player.position).length > Math.max(1, Math.floor((ROSTER_TEMPLATE[player.position] || 1) * 0.6))
        )
        .sort((a, b) => (b.contract?.capHit || 0) - (a.contract?.capHit || 0))[0];
      if (!dumpCandidate) continue;

      const compensationPickIds = chooseCapDumpPickPackage(league, sender, dumpCandidate);
      if (compensationPickIds.length === 0) continue;

      const trade = proposeTrade(league, sender.id, absorber.id, {
        offeredPlayerIds: [dumpCandidate.id],
        offeredPickIds: compensationPickIds,
        notes: ["cpuCapAbsorption"]
      });
      const response = evaluateCpuTradeResponse(league, trade);
      if (response.response !== "accepted" && response.effectiveRatio < 90) {
        trade.status = "rejected";
        continue;
      }

      trade.status = "accepted";
      completeTrade(league, trade.id);
      return {
        fromTeamId: sender.id,
        toTeamId: absorber.id,
        type: "capAbsorption",
        given: {
          playerId: dumpCandidate.id,
          name: `${dumpCandidate.firstName} ${dumpCandidate.lastName}`,
          position: dumpCandidate.position,
          pickIds: compensationPickIds
        },
        received: { capRelief: dumpCandidate.contract?.capHit || 0 },
        response
      };
    }
  }

  return null;
}

function tryStrategicCpuTrade(league, cpuTeams, postures, rng) {
  const buyers = cpuTeams.filter((team) => {
    const phase = postures.get(team.id)?.phase;
    return phase === BUILD_PHASES.CONTENDING || phase === BUILD_PHASES.ALL_IN;
  });
  const sellers = cpuTeams.filter((team) => {
    const phase = postures.get(team.id)?.phase;
    return phase === BUILD_PHASES.REBUILDING || phase === BUILD_PHASES.RETOOLING;
  });

  if (buyers.length === 0 || sellers.length === 0) return null;

  const buyer = rng.pick(buyers);
  const neededPositions = Object.entries(ROSTER_TEMPLATE)
    .filter(([position, target]) => buyer.roster.filter((player) => player.position === position).length < target)
    .map(([position]) => position);
  if (neededPositions.length === 0) return null;

  const sellerPool = shuffled(sellers.filter((team) => team.id !== buyer.id), rng);
  for (const seller of sellerPool) {
    const sellerCandidates = seller.roster
      .filter((player) =>
        neededPositions.includes(player.position)
        && player.overall >= 76
        && player.age >= 27
        && !isYoungCoreAsset(player)
        && seller.roster.filter((candidate) => candidate.position === player.position).length > Math.max(1, Math.floor((ROSTER_TEMPLATE[player.position] || 1) * 0.55))
      )
      .sort((a, b) => b.overall - a.overall);
    if (sellerCandidates.length === 0) continue;

    const targetPlayer = sellerCandidates[0];
    const offeredPickIds = chooseContenderPickPackage(league, buyer, seller, targetPlayer);
    if (offeredPickIds.length === 0) continue;

    const trade = proposeTrade(league, buyer.id, seller.id, {
      offeredPickIds,
      requestedPlayerIds: [targetPlayer.id],
      notes: ["cpuStrategicTrade"]
    });
    const response = evaluateCpuTradeResponse(league, trade);
    if (response.response !== "accepted" && response.effectiveRatio < 90) {
      trade.status = "rejected";
      continue;
    }

    trade.status = "accepted";
    completeTrade(league, trade.id);
    return {
      fromTeamId: buyer.id,
      toTeamId: seller.id,
      type: "contenderBuy",
      given: { pickIds: offeredPickIds },
      received: {
        playerId: targetPlayer.id,
        name: `${targetPlayer.firstName} ${targetPlayer.lastName}`,
        position: targetPlayer.position
      },
      response
    };
  }

  return null;
}

function tryRebuilderSellTrade(league, cpuTeams, postures, rng) {
  const sellers = shuffled(cpuTeams, rng).filter((team) => {
    const phase = postures.get(team.id)?.phase;
    return phase === BUILD_PHASES.REBUILDING || phase === BUILD_PHASES.RETOOLING;
  });
  const buyers = shuffled(cpuTeams, rng).filter((team) => {
    const phase = postures.get(team.id)?.phase;
    return phase === BUILD_PHASES.CONTENDING || phase === BUILD_PHASES.ALL_IN || phase === BUILD_PHASES.BALANCED;
  });

  for (const seller of sellers) {
    const veteran = findSellableVeteran(seller);
    if (!veteran) continue;

    for (const buyer of buyers) {
      if (buyer.id === seller.id) continue;
      if (!isBuyerFitForVeteran(buyer, veteran, postures.get(buyer.id))) continue;

      const requestedPickIds = chooseBuyerPickPackageForVeteran(league, buyer, seller, veteran);
      if (requestedPickIds.length === 0) continue;

      const trade = proposeTrade(league, seller.id, buyer.id, {
        offeredPlayerIds: [veteran.id],
        requestedPickIds,
        notes: ["cpuRebuilderSell"]
      });
      const response = evaluateCpuTradeResponse(league, trade);
      if (response.response !== "accepted" && response.effectiveRatio < 88) {
        trade.status = "rejected";
        continue;
      }

      trade.status = "accepted";
      completeTrade(league, trade.id);
      return {
        fromTeamId: seller.id,
        toTeamId: buyer.id,
        type: "rebuilderSell",
        given: {
          playerId: veteran.id,
          name: `${veteran.firstName} ${veteran.lastName}`,
          position: veteran.position
        },
        received: { pickIds: requestedPickIds },
        response
      };
    }
  }

  return null;
}

function chooseContenderPickPackage(league, buyer, seller, targetPlayer) {
  const playerValue = calculateTradeValue(league, seller.id, { playerIds: [targetPlayer.id], pickIds: [] });
  const picks = league.draft.picks
    .filter((pick) => pick.currentTeamId === buyer.id && !pick.selectedProspectId)
    .filter((pick) => {
      if (pick.overallPick <= 8) return false;
      if (pick.round === 1) return targetPlayer.overall >= 84;
      return pick.round >= 2 && pick.round <= 4;
    })
    .sort((a, b) => calculateDraftPickSortWeight(a) - calculateDraftPickSortWeight(b));

  const offered = [];
  let value = 0;
  const minRatio = targetPlayer.overall >= 84 ? 0.78 : 0.68;
  const maxRatio = targetPlayer.overall >= 84 ? 1.35 : 1.15;

  for (const pick of picks) {
    const pickValue = calculateTradeValue(league, buyer.id, { pickIds: [pick.id] });
    if (value > 0 && (value + pickValue) / Math.max(1, playerValue) > maxRatio) continue;
    offered.push(pick.id);
    value += pickValue;
    if (value / Math.max(1, playerValue) >= minRatio) break;
  }

  if (value / Math.max(1, playerValue) < minRatio) return [];
  return offered;
}

function chooseCapDumpPickPackage(league, sender, dumpCandidate) {
  const capHitM = (dumpCandidate.contract?.capHit || 0) / 1_000_000;
  const picks = league.draft.picks
    .filter((pick) => pick.currentTeamId === sender.id && !pick.selectedProspectId)
    .filter((pick) => {
      if (pick.overallPick <= 16) return false;
      if (capHitM >= 16) return pick.round >= 2 && pick.round <= 4;
      return pick.round >= 3 && pick.round <= 5;
    })
    .sort((a, b) => a.round - b.round || a.overallPick - b.overallPick);

  if (picks.length === 0) return [];
  const packageSize = capHitM >= 16 ? 2 : 1;
  return picks.slice(0, packageSize).map((pick) => pick.id);
}

function chooseBuyerPickPackageForVeteran(league, buyer, seller, veteran) {
  const playerValue = calculateTradeValue(league, seller.id, { playerIds: [veteran.id], pickIds: [] });
  const picks = league.draft.picks
    .filter((pick) => pick.currentTeamId === buyer.id && !pick.selectedProspectId)
    .filter((pick) => {
      if (pick.overallPick <= 16) return veteran.overall >= 84 && veteran.age <= 30;
      return pick.round >= 2 && pick.round <= 5;
    })
    .sort((a, b) => a.round - b.round || a.overallPick - b.overallPick);

  const offered = [];
  let value = 0;
  const minRatio = veteran.overall >= 82 ? 0.72 : 0.58;
  const maxRatio = veteran.overall >= 82 ? 1.2 : 1.0;

  for (const pick of picks) {
    const pickValue = calculateTradeValue(league, buyer.id, { pickIds: [pick.id] });
    if (value > 0 && (value + pickValue) / Math.max(1, playerValue) > maxRatio) continue;
    offered.push(pick.id);
    value += pickValue;
    if (value / Math.max(1, playerValue) >= minRatio) break;
  }

  if (value / Math.max(1, playerValue) < minRatio) return [];
  return offered;
}

function findSellableVeteran(team) {
  return team.roster
    .filter((player) =>
      player.age >= 28
      && player.overall >= 74
      && player.overall <= 84
      && !isYoungCoreAsset(player)
      && team.roster.filter((candidate) => candidate.position === player.position).length > Math.max(1, Math.floor((ROSTER_TEMPLATE[player.position] || 1) * 0.65))
    )
    .sort((a, b) =>
      (b.age - a.age)
      || (b.contract?.capHit || 0) - (a.contract?.capHit || 0)
      || b.overall - a.overall
    )[0];
}

function isBuyerFitForVeteran(buyer, veteran, posture) {
  const samePosition = buyer.roster.filter((player) => player.position === veteran.position);
  const target = ROSTER_TEMPLATE[veteran.position] || 1;
  const best = Math.max(0, ...samePosition.map((player) => player.overall || 0));
  const need = samePosition.length < target || veteran.overall >= best + 5;
  const winNow = posture?.phase === BUILD_PHASES.CONTENDING || posture?.phase === BUILD_PHASES.ALL_IN;
  const balancedGoodFit = posture?.phase === BUILD_PHASES.BALANCED && veteran.age <= 30 && veteran.overall >= 78;
  return need && (winNow || balancedGoodFit) && (buyer.contractSummary?.capSpace ?? 0) > (veteran.contract?.capHit || 0);
}

function calculateDraftPickSortWeight(pick) {
  if (pick.round === 2) return 0;
  if (pick.round === 3) return 1;
  if (pick.round === 4) return 2;
  return 3;
}

function isYoungCoreAsset(player) {
  const ceiling = player.development?.potentialCeiling ?? player.overall;
  return player.age <= 25 && (player.overall >= 72 || (player.potentialStars || 1) >= 4 || ceiling - player.overall >= 5);
}

function shuffled(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}


function updateFranchisePrestige(league) {
  const standings = [...(league.standings || [])].sort((a, b) =>
    (b.wins - a.wins) || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))
  );
  const bestRecordId = standings[0]?.teamId ?? null;
  const bottomFourIds = new Set(standings.slice(-4).map(s => s.teamId));
  const championId = league.playoff.championTeamId;
  const playoffIds = new Set((league.playoff.seeds || []).map(seed => seed.teamId ?? seed));
  const bestOffenseId = standings.slice().sort((a, b) => b.pointsFor - a.pointsFor)[0]?.teamId ?? null;
  const bestDefenseId = standings.slice().sort((a, b) => a.pointsAgainst - b.pointsAgainst)[0]?.teamId ?? null;

  const highestRatedId = league.teams
    .map(team => ({
      team,
      rating: team.roster.length ? team.roster.reduce((sum, p) => sum + p.overall, 0) / team.roster.length : 0
    }))
    .sort((a, b) => b.rating - a.rating)[0]?.team.id ?? null;

  league.prestigeHistory ??= [];
  for (const team of league.teams) {
    const before = team.prestige;
    let delta = 0;
    const reasons = [];
    const youngCoreScore = rebuildingCoreScore(team);
    const previousStanding = league.seasonHistory?.at(-1)?.standings?.find((standing) => standing.teamId === team.id);
    const winsImproved = previousStanding ? (team.standings?.wins || 0) >= (previousStanding.wins || 0) + 2 : false;
    if (team.id === championId) { delta += 0.5; reasons.push('championship'); }
    if (playoffIds.has(team.id)) { delta += 0.125; reasons.push('playoffs'); }
    if (team.id === bestRecordId) { delta += 0.125; reasons.push('bestRecord'); }
    if (team.id === highestRatedId) { delta += 0.125; reasons.push('highestRating'); }
    if (team.id === bestOffenseId) { delta += 0.125; reasons.push('bestOffense'); }
    if (team.id === bestDefenseId) { delta += 0.125; reasons.push('bestDefense'); }
    if (bottomFourIds.has(team.id)) {
      const penalty = youngCoreScore >= 6 ? -0.075 : youngCoreScore >= 4 ? -0.125 : -0.25;
      delta += penalty;
      reasons.push(penalty > -0.25 ? 'bottomFourYoungCoreProtected' : 'bottomFour');
    }
    if (!bottomFourIds.has(team.id) && youngCoreScore >= 5 && winsImproved) {
      delta += 0.05;
      reasons.push('youngCoreProgress');
    }

    const next = Math.max(1, Math.min(5, Math.round((before + delta) * 1000) / 1000));
    team.prestige = next;
    team.salaryCap = salaryCapFromPrestige(next);
    refreshContractSummary(team);
    league.prestigeHistory.push({ season: league.currentSeason, teamId: team.id, before, after: next, delta: next - before, reasons });
  }
}

function rebuildingCoreScore(team) {
  const youngCore = team.roster.filter((player) =>
    player.age <= 25
    && (
      player.overall >= 70
      || (player.potentialStars || 1) >= 4
      || (player.development?.potentialCeiling ?? player.overall) - player.overall >= 5
    )
  ).length;
  const recentGrowth = team.roster.filter((player) =>
    player.age <= 26 && (player.development?.lastTrainingGain || 0) > 0
  ).length;
  const topYoung = team.roster.filter((player) => player.age <= 25 && player.overall >= 74).length;
  return youngCore + Math.min(3, recentGrowth) + topYoung;
}

function processContractBonuses(league) {
  const playoffTeamIds = new Set(league.playoff.seeds || []);
  const championId = league.playoff.championTeamId;
  const awardWinnerIds = new Set(
    Object.values(league.awards.winners || {}).map(w => w.playerId)
  );

  for (const team of league.teams) {
    const s = team.standings || {};
    const isPlayoff = playoffTeamIds.has(team.id);
    const isChampion = team.id === championId;
    const divTeams = league.teams.filter(t => t.division === team.division);
    const isDivisionWinner = divTeams.every(t => (t.standings?.wins || 0) <= (s.wins || 0));

    for (const player of team.roster) {
      const bonus = player.contract?.bonusExpectation;
      if (!bonus) continue;

      let triggered = false;
      if (bonus === "playoffs" && isPlayoff) triggered = true;
      else if (bonus === "divisionTitle" && isDivisionWinner) triggered = true;
      else if (bonus === "award" && awardWinnerIds.has(player.id)) triggered = true;
      else if (bonus === "statThreshold") {
        // Triggered if player had significant production
        const totalOutput = totalOffensiveValue(player) + totalDefensiveValue(player);
        triggered = totalOutput >= 500;
      }

      if (triggered && player.contract.bonusAmount > 0) {
        // Bonus paid — increase cap hit for this year
        player.contract.capHit += player.contract.bonusAmount;
        player.contract.bonusPaid = true;
      }
    }
    // Refresh summary after bonus adjustments
    refreshContractSummary(team);
  }
}

export function runOffseason(league, options = {}) {
  advanceSeasonPhase(league, PHASES.OFFSEASON);
  league.offseasonEvents = { freeAgencyComplete: false, ...(league.offseasonEvents || {}) };
  const rng = createRng(`offseason-${league.seed}-${league.currentSeason}`);
  const summary = {
    season: league.currentSeason,
    retirements: [],
    contractExpirations: [],
    developmentChanges: [],
    freeAgency: null
  };

  for (const team of league.teams) {
    const retirements = processRetirements(team, league, rng);
    summary.retirements.push(...retirements);

    const expirations = processContractExpirations(team, league);
    summary.contractExpirations.push(...expirations);

    const developments = processDevelopment(team, rng);
    summary.developmentChanges.push(...developments);

    resetSeasonState(team);
  }

  // CPU teams auto-vote HOF; the player submits their ballot during the offseason gate.
  const hofEligible = league.hallOfFame?.eligiblePlayers || [];
  if (hofEligible.length > 0) {
    const ranked = [...hofEligible].sort((a, b) =>
      ((b.awards?.length || 0) * 10 + (b.overall || 70)) -
      ((a.awards?.length || 0) * 10 + (a.overall || 70))
    );
    for (const team of league.teams) {
      if (team.isPlayerControlled) continue;
      const teamRng = createRng(`hof-vote-${team.id}-${league.currentSeason}`);
      const pool = ranked.slice(0, Math.min(8, ranked.length));
      const votes = [];
      while (votes.length < LEAGUE_RULES.hallOfFameVotesPerTeam && pool.length > 0) {
        const idx = teamRng.int(0, Math.min(3, pool.length - 1));
        votes.push(pool[idx].id);
        pool.splice(idx, 1);
      }
      castHallOfFameVotes(league, team.id, votes);
    }
  }

  summary.freeAgentRetirements = processFreeAgentRetirements(league, rng);

  // CPU-to-CPU trades during offseason
  summary.cpuTrades = runCpuToCpuTrades(league, rng);

  summary.freeAgentPoolExits = [];
  const survivingFreeAgents = [];
  for (const player of league.freeAgents) {
    player.fatigue = 0;
    for (const key of Object.keys(player.stats)) player.stats[key] = 0;
    if (player.development) {
      player.development.meaningfulPlaytime = false;
      player.development.seasonPlaytime = 0;
    }
    if (player.health.status !== "healthy" && player.health.weeksRemaining <= 3) {
      player.health = { status: "healthy", injury: null, weeksRemaining: 0 };
    }
    player.freeAgentSeasonsUnsigned = (player.freeAgentSeasonsUnsigned ?? 0) + 1;
    // Prune aggressively: 2+ seasons unsigned, OR low OVR after 1 season, OR old+unsigned
    const shouldExit = player.freeAgentSeasonsUnsigned >= 2
      || (player.freeAgentSeasonsUnsigned >= 1 && player.overall < 60)
      || (player.freeAgentSeasonsUnsigned >= 1 && player.age >= 33);
    if (shouldExit) {
      summary.freeAgentPoolExits.push({ playerId: player.id, position: player.position, overall: player.overall, seasonsUnsigned: player.freeAgentSeasonsUnsigned });
    } else {
      survivingFreeAgents.push(player);
    }
  }
  league.freeAgents = survivingFreeAgents;

  if (!options.skipFreeAgency) {
    summary.freeAgency = runFreeAgencyPeriod(league, {
      seed: `fa-offseason-${league.seed}-${league.currentSeason}`
    });
    league.offseasonEvents.freeAgencyComplete = true;
  }

  summary.capEnforcement = [];
  for (const team of league.teams) {
    if (team.contractSummary.capSpace < 0) {
      const result = enforceCapCompliance(league, team.id);
      summary.capEnforcement.push(result);
    }
  }

  if (!options.skipDraft && league.draft.status !== "completed") {
    summary.draft = executeCpuAutoDraft(league, {
      seed: `autodraft-${league.seed}-${league.currentSeason}`
    });
  }

  recordAutosave(league, "season", { action: "offseason", season: league.currentSeason });
  return summary;
}

export function advanceToNextSeason(league) {
  league.currentSeason += 1;
  league.currentWeek = 0;

  const rng = createRng(`${league.seed}-season-${league.currentSeason}`);

  const teams = league.teams;
  league.schedule = createNextSchedule(teams, league.currentSeason);
  league.standings = teams.map((team) => ({
    teamId: team.id,
    division: team.division,
    wins: 0,
    losses: 0,
    ties: 0,
    winPct: 0,
    pointsFor: 0,
    pointsAgainst: 0
  }));
  const previousStandings = league.seasonHistory.length > 0
    ? league.seasonHistory.at(-1).standings
    : league.standings;
  league.draftClass = createNextDraftClass(rng, league.currentSeason);
  league.draft = createNextDraftState(teams, league.draftClass, league.currentSeason, previousStandings);
  league.playoff = {
    format: {
      teams: LEAGUE_RULES.playoffTeams,
      firstRoundByes: LEAGUE_RULES.firstRoundByes,
      reseedSemifinals: true
    },
    seeds: [],
    rounds: [],
    championTeamId: null
  };
  league.awards = {
    regularSeasonProcessed: false,
    winners: {},
    allPro: { firstTeam: [], secondTeam: [] },
    valueImpacts: []
  };
  league.offseasonEvents = { freeAgencyComplete: false };
  league.training = {
    camp: { days: LEAGUE_RULES.trainingCampDays, completed: false, sessions: [] },
    regularSeason: {
      windows: LEAGUE_RULES.regularSeasonTrainingWindows.map((afterWeek) => ({
        afterWeek,
        completed: false,
        sessions: []
      }))
    }
  };

  ageAllPlayers(league, rng);

  for (const team of league.teams) {
    if (team.contractSummary.capSpace < 0) {
      enforceCapCompliance(league, team.id);
    }
  }

  executeCpuOffseasonSignings(league, {
    seed: `cpu-fill-${league.seed}-${league.currentSeason}`
  });

  // Aggressive pre-season compliance: cap + roster hard limit
  for (const team of league.teams) {
    // Hard-enforce roster cap at 55
    while (team.roster.length > LEAGUE_RULES.rosterLimit) {
      const worst = team.roster
        .slice()
        .sort((a, b) => a.overall - b.overall)[0];
      if (!worst) break;
      team.roster = team.roster.filter(p => p.id !== worst.id);
      worst.freeAgentSeasonsUnsigned = 0;
      league.freeAgents.push(worst);
    }
    refreshContractSummary(team);
    // Enforce cap compliance aggressively — release highest-paid expendable until under cap
    let safetyCounter = 0;
    while (team.contractSummary.capSpace < 0 && team.roster.length > 0 && safetyCounter < 25) {
      // Find highest-salary player we can cut (not sole player at position, protect specialists)
      const candidate = team.roster
        .filter(p => {
          const posCount = team.roster.filter(r => r.position === p.position).length;
          return posCount > 1;
        })
        .sort((a, b) => b.contract.salary - a.contract.salary)[0];
      if (!candidate) {
        // Fallback: if stuck, also try the built-in enforcer which uses savings/ovr ratio
        enforceCapCompliance(league, team.id);
        break;
      }
      team.roster = team.roster.filter(p => p.id !== candidate.id);
      candidate.freeAgentSeasonsUnsigned = 0;
      league.freeAgents.push(candidate);
      for (const position of Object.keys(team.depthChart)) {
        team.depthChart[position] = (team.depthChart[position] || []).filter(id => id !== candidate.id);
      }
      refreshContractSummary(team);
      safetyCounter++;
    }
  }

  // Re-fill any gaps created by cap cuts (especially specialists like K, P)
  executeCpuOffseasonSignings(league, {
    seed: `cpu-refill-${league.seed}-${league.currentSeason}`
  });

  // Final cap enforcement after refill
  for (const team of league.teams) {
    refreshContractSummary(team);
    if (team.contractSummary.capSpace < 0) {
      enforceCapCompliance(league, team.id);
    }
  }

  const violations = validateRosterCompliance(league);
  if (violations.length > 0) {
    const repaired = repairRosterCompliance(league);
    if (repaired.length > 0) {
      console.log(`Roster violations repaired: ${repaired.map(r => `${r.teamName} signed ${r.position} (OVR ${r.overall})`).join(', ')}`);
    }
    const remaining = validateRosterCompliance(league);
    if (remaining.length > 0) {
      console.warn(`Unrepaired roster violations at season start: ${remaining.map(v => `${v.teamName} missing ${v.position}`).join(', ')}`);
    }
  }

  advanceSeasonPhase(league, PHASES.PRESEASON);
  recordAutosave(league, "season", { action: "advanceToSeason", season: league.currentSeason });
  return league.currentSeason;
}

export function simulateFullSeason(league, options = {}) {
  simulateRegularSeason(league, options);
  const seeds = generatePlayoffSeeds(league);
  generatePlayoffBracket(league, seeds);
  simulatePlayoffRound(league, "firstRound", options);
  simulatePlayoffRound(league, "semifinals", options);
  simulatePlayoffRound(league, "championship", options);
  runSeasonReview(league);
  return {
    season: league.currentSeason,
    championTeamId: league.playoff.championTeamId,
    standings: league.standings,
    awards: league.awards.winners
  };
}

export function simulateMultipleSeasons(league, count, options = {}) {
  const results = [];
  for (let i = 0; i < count; i += 1) {
    const result = simulateFullSeason(league, options);
    results.push(result);
    if (i < count - 1) {
      runOffseason(league);
      advanceToNextSeason(league);
    }
  }
  return results;
}

function retirementChance(age) {
  if (age < 34) return 0;
  return 0.25 + (age - 34) * 0.05;
}

function processRetirements(team, league, rng) {
  const retirements = [];
  const toRetire = [];
  for (const player of team.roster) {
    const chance = retirementChance(player.age);
    if (chance > 0 && rng.next() < chance) {
      toRetire.push(player);
      retirements.push({ playerId: player.id, teamId: team.id, age: player.age, overall: player.overall, position: player.position });
    }
  }
  for (const player of toRetire) {
    team.roster = team.roster.filter((p) => p.id !== player.id);
    league.hallOfFame.eligibleRetiringPlayerIds.push(player.id);
    // Preserve full player snapshot for HoF display
    league.hallOfFame.eligiblePlayers ??= [];
    league.hallOfFame.eligiblePlayers.push(structuredClone({ ...player, lastTeamId: team.id }));
  }
  return retirements;
}

function processFreeAgentRetirements(league, rng) {
  const retirements = [];
  const surviving = [];
  for (const player of league.freeAgents) {
    const chance = retirementChance(player.age);
    if (chance > 0 && rng.next() < chance) {
      retirements.push({ playerId: player.id, age: player.age, overall: player.overall, position: player.position });
      league.hallOfFame.eligibleRetiringPlayerIds.push(player.id);
      league.hallOfFame.eligiblePlayers ??= [];
      league.hallOfFame.eligiblePlayers.push(structuredClone({ ...player, lastTeamId: null }));
    } else {
      surviving.push(player);
    }
  }
  league.freeAgents = surviving;
  return retirements;
}

function processContractExpirations(team, league) {
  const expirations = [];
  const expiring = [];
  for (const player of team.roster) {
    player.contract.yearsRemaining -= 1;
    if (player.contract.yearsRemaining <= 0) {
      expiring.push(player);
      expirations.push({ playerId: player.id, teamId: team.id, position: player.position });
    }
  }
  for (const player of expiring) {
    team.roster = team.roster.filter((p) => p.id !== player.id);
    player.contract = createContractFromSalary(0, 0);
    player.freeAgentSeasonsUnsigned = 0;
    league.freeAgents.push(player);
  }
  refreshContractSummary(team);
  return expirations;
}

function processDevelopment(team, rng) {
  const changes = [];
  const moraleBonus = (team.morale?.score ?? 50) >= 70 ? 1 : (team.morale?.score ?? 50) <= 30 ? -1 : 0;
  for (const player of team.roster) {
    const ceiling = player.development?.potentialCeiling ?? player.overall;
    const headroom = ceiling - player.overall;
    if (headroom > 0 && player.age <= 28) {
      const usageScore = seasonUsageScore(player);
      const meaningfulUsage = usageScore >= 0.35 || player.development?.meaningfulPlaytime;
      const playtimeBonus = usageScore >= 0.75 ? 2 : usageScore >= 0.35 ? 1 : 0;
      const upsideBonus = player.age <= 25 && (player.potentialStars || 1) >= 4 && meaningfulUsage ? 1 : 0;
      const ageBase =
        player.age <= 23 ? rng.int(0, 2) :
        player.age <= 26 ? rng.int(0, 1) :
        meaningfulUsage ? rng.int(0, 1) : 0;
      const maxGain = player.age <= 23 ? 4 : player.age <= 26 ? 3 : 2;
      const rawGain = ageBase + moraleBonus + playtimeBonus + upsideBonus;
      const gain = Math.max(0, Math.min(maxGain, rawGain, headroom));
      const newOverall = Math.min(ceiling, player.overall + gain);
      if (newOverall !== player.overall) {
        const previousOverall = player.overall;
        changes.push({ playerId: player.id, from: previousOverall, to: newOverall, type: "growth", usageScore });
        player.development.lastTrainingGain = newOverall - previousOverall;
        player.overall = newOverall;
      }
      if (player.overall >= ceiling - 2) {
        player.development.developmentState = "nearCeiling";
      }
    }
  }
  return changes;
}

function seasonUsageScore(player) {
  const playtime = player.development?.seasonPlaytime || 0;
  const stats = player.stats || {};
  const production =
    stats.passingYards / 28
    + stats.rushingYards / 14
    + stats.receivingYards / 14
    + (stats.tackles || 0) * 2.2
    + (stats.tacklesForLoss || 0) * 4
    + (stats.sacks || 0) * 7
    + (stats.interceptions || 0) * 9
    + (stats.passDeflections || 0) * 3
    + (stats.puntDeflections || 0) * 5
    + (stats.kickDeflections || 0) * 5;
  const playtimeScore = Math.min(1, playtime / 180);
  const productionScore = Math.min(1, production / 140);
  return Math.max(playtimeScore, productionScore);
}

function processAgingDeclines(players, rng) {
  const declines = [];
  for (const player of players) {
    let declineRate = 0;
    if (player.age >= 36) declineRate = rng.int(3, 6);
    else if (player.age >= 33) declineRate = rng.int(1, 4);
    else if (player.age >= 30) declineRate = rng.int(1, 2);  // guaranteed -1 minimum
    else if (player.age >= 28) declineRate = rng.next() < 0.22 ? 1 : 0;  // 22% mild decline ages 28-29

    if (declineRate > 0) {
      const newOverall = Math.max(55, player.overall - declineRate);  // floor at 55
      declines.push({ playerId: player.id, from: player.overall, to: newOverall });
      player.overall = newOverall;
      player.development.yearlyDeclineRate = declineRate;
    }
  }
  return declines;
}

function ageAllPlayers(league, rng) {
  const allPlayers = league.teams.flatMap((t) => t.roster);
  const freeAgents = league.freeAgents;
  const everyone = [...allPlayers, ...freeAgents];
  const declines = processAgingDeclines(everyone, rng);
  for (const player of everyone) player.age += 1;
  return declines;
}

function resetSeasonState(team) {
  for (const player of team.roster) {
    // Accumulate season stats into career totals before reset
    player.careerStats ??= {};
    for (const key of Object.keys(player.stats)) {
      player.careerStats[key] = (player.careerStats[key] || 0) + player.stats[key];
      player.stats[key] = 0;
    }
    if (player.development) {
      player.development.meaningfulPlaytime = false;
      player.development.seasonPlaytime = 0;
    }
    player.fatigue = 0;
    player.rookie = false;
    if (player.health.status !== "healthy" && player.health.weeksRemaining <= 3) {
      player.health = { status: "healthy", injury: null, weeksRemaining: 0 };
    }
  }
  team.standings = { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
}

function computeSeasonAwards(league) {
  const allPlayers = league.teams.flatMap((team) =>
    team.roster.map((player) => ({ ...player, teamId: team.id }))
  );

  const bestPasser = topBy(allPlayers, (p) => p.stats.passingYards + p.stats.passingTouchdowns * 50);
  const bestRusher = topBy(allPlayers, (p) => p.stats.rushingYards + p.stats.rushingTouchdowns * 50);
  const bestReceiver = topBy(allPlayers, (p) => p.stats.receivingYards + p.stats.receivingTouchdowns * 50);
  const bestDefender = topBy(allPlayers, (p) =>
    p.stats.tackles * 2 + p.stats.tacklesForLoss * 5 + p.stats.sacks * 8 +
    p.stats.interceptions * 12 + p.stats.passDeflections * 4
  );

  const offensiveCandidates = [bestPasser, bestRusher, bestReceiver].filter(Boolean);
  const mvpPool = [...offensiveCandidates, bestDefender].filter(Boolean);
  const mvp = topBy(mvpPool, (p) => p.overall + totalOffensiveValue(p) * 0.01 + totalDefensiveValue(p) * 0.01);

  const rookieOffense = topBy(
    allPlayers.filter((p) => p.rookie && ["QB", "RB", "WR", "TE"].includes(p.position)),
    (p) => totalOffensiveValue(p)
  );
  const rookieDefense = topBy(
    allPlayers.filter((p) => p.rookie && ["DL", "EDGE", "LB", "CB", "S"].includes(p.position)),
    (p) => totalDefensiveValue(p)
  );

  const awards = {};
  if (mvp) awards.seasonMvp = { playerId: mvp.id, teamId: mvp.teamId };
  if (offensiveCandidates[0]) awards.offensivePlayerOfYear = { playerId: offensiveCandidates[0].id, teamId: offensiveCandidates[0].teamId };
  if (bestDefender) awards.defensivePlayerOfYear = { playerId: bestDefender.id, teamId: bestDefender.teamId };
  if (rookieOffense) awards.offensiveRookieOfYear = { playerId: rookieOffense.id, teamId: rookieOffense.teamId };
  if (rookieDefense) awards.defensiveRookieOfYear = { playerId: rookieDefense.id, teamId: rookieDefense.teamId };
  return awards;
}

function totalOffensiveValue(player) {
  return player.stats.passingYards + player.stats.rushingYards + player.stats.receivingYards
    + (player.stats.passingTouchdowns + player.stats.rushingTouchdowns + player.stats.receivingTouchdowns) * 50;
}

function totalDefensiveValue(player) {
  return player.stats.tackles * 2 + player.stats.tacklesForLoss * 5 + player.stats.sacks * 8
    + player.stats.interceptions * 12 + player.stats.passDeflections * 4
    + player.stats.puntDeflections * 10 + player.stats.kickDeflections * 10;
}

function topBy(items, scoreFn) {
  if (items.length === 0) return null;
  return items.reduce((best, item) => scoreFn(item) > scoreFn(best) ? item : best);
}

function refreshContractSummary(team) {
  const committedCap = team.roster.reduce((sum, player) => sum + player.contract.capHit, 0);
  team.contractSummary = {
    salaryCap: team.salaryCap,
    committedCap,
    capSpace: team.salaryCap - committedCap,
    rosterCount: team.roster.length,
    activeRosterCount: team.roster.filter((p) => p.health.status === "healthy").length
  };
}

function createNextSchedule(teams, season) {
  return Array.from({ length: LEAGUE_RULES.regularSeasonWeeks }, (_, weekIndex) => ({
    week: weekIndex + 1,
    games: pairTeams(teams, weekIndex, season)
  }));
}

function pairTeams(teams, weekIndex, season) {
  const ids = teams.map((team) => team.id);
  const rotated = [ids[0], ...ids.slice(1 + weekIndex), ...ids.slice(1, 1 + weekIndex)];
  return Array.from({ length: ids.length / 2 }, (_, index) => ({
    id: makeId("game", [season, weekIndex + 1, index + 1]),
    week: weekIndex + 1,
    awayTeamId: rotated[index],
    homeTeamId: rotated[rotated.length - 1 - index],
    played: false,
    driveLog: [],
    boxScore: null,
    injuries: [],
    keyEvents: []
  }));
}

function createNextDraftClass(rng, season) {
  const FIRST_NAMES = ["Marcus", "Eli", "Dante", "Theo", "Caleb", "Jalen", "Miles", "Nico", "Roman", "Isaiah",
    "Graham", "Kai", "Luca", "Andre", "Jonah", "Malik", "Reed", "Tariq", "Cole", "Samir"];
  const LAST_NAMES = ["Cross", "Mercer", "Vale", "Booker", "Stone", "Hale", "Bishop", "Rivers", "Knight", "Sutton",
    "Wells", "Maddox", "Price", "Hollis", "Foster", "Graves", "Monroe", "Vega", "Hayes", "Pierce"];
  const positions = Object.keys(ROSTER_TEMPLATE);

  const classStrength = (rng.next() - 0.5) * 2;
  const positionSlots = buildPositionSlots(rng, positions, LEAGUE_RULES.draftClassSize);
  return Array.from({ length: LEAGUE_RULES.draftClassSize }, (_, index) => {
    const position = positionSlots[index];
    const projectedOverall = generateProspectRating(index, rng, classStrength);
    return {
      id: makeId("prospect", [season, index + 1]),
      firstName: rng.pick(FIRST_NAMES),
      lastName: rng.pick(LAST_NAMES),
      position,
      age: rng.int(20, 23),
      ratingRange: [Math.max(55, projectedOverall - rng.int(4, 10)), Math.min(92, projectedOverall + rng.int(3, 8))],
      scouted: false,
      exactRating: null,
      detailedRatings: null,
      traits: null,
      potentialStars: null,
      schemeFit: null,
      expectedDraftPosition: index + 1,
      rookieContract: createRookieContractScale(index + 1),
      collegeHistory: `${rng.pick(["State", "Tech", "Northern", "Coastal", "Central"])} ${rng.pick(["A&M", "University", "College"])}`,
      collegeProduction: { games: rng.int(18, 42), allConference: rng.int(0, 1) === 1, awards: [] },
      combineResults: { speedScore: rng.int(45, 99), powerScore: rng.int(45, 99), agilityScore: rng.int(45, 99) },
      combineRank: rng.int(1, LEAGUE_RULES.draftClassSize),
      draftedByTeamId: null,
      draftPickId: null,
      signedAsUndrafted: false
    };
  });
}


function createNextDraftState(teams, draftClass, season, standings) {
  const draftOrder = buildDraftOrder(teams, standings);
  const picks = [];
  for (const team of teams) {
    team.draftPicks = [];
  }
  for (let round = 1; round <= LEAGUE_RULES.draftRounds; round += 1) {
    for (let slot = 1; slot <= LEAGUE_RULES.picksPerRound; slot += 1) {
      const overallPick = (round - 1) * LEAGUE_RULES.picksPerRound + slot;
      const originalTeamId = draftOrder[slot - 1];
      const originalTeam = teams.find((team) => team.id === originalTeamId);
      const pick = {
        id: makeId("pick", [season, round, slot]),
        season,
        round,
        slot,
        overallPick,
        originalTeamId,
        currentTeamId: originalTeamId,
        prospectId: null,
        rookieContract: createRookieContractScale(overallPick)
      };
      picks.push(pick);
      originalTeam.draftPicks.push(pick.id);
    }
  }
  return {
    season,
    status: "upcoming",
    picks,
    draftOrder,
    draftedProspectIds: [],
    undraftedProspectIds: draftClass.map((p) => p.id),
    rookieContractScale: picks.map((pick) => ({
      overallPick: pick.overallPick,
      salary: pick.rookieContract.salary,
      yearsRemaining: pick.rookieContract.yearsRemaining
    }))
  };
}

function buildDraftOrder(teams, standings) {
  if (!standings || standings.length === 0) {
    return teams.map((team) => team.id);
  }
  const sorted = [...standings].sort((a, b) => {
    const aWinPct = a.winPct ?? (a.wins / Math.max(1, a.wins + a.losses + a.ties));
    const bWinPct = b.winPct ?? (b.wins / Math.max(1, b.wins + b.losses + b.ties));
    if (aWinPct !== bWinPct) return aWinPct - bWinPct;
    const aPF = a.pointsFor ?? 0;
    const bPF = b.pointsFor ?? 0;
    return aPF - bPF;
  });
  return sorted.map((entry) => entry.teamId);
}
