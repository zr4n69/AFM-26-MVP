import { createLeague } from "../data/factories.js";
import { executeCpuOffseasonSignings, executeCpuRosterMoves } from "./cpu-ai.js";
import { simulateFullSeason, runOffseason, advanceToNextSeason } from "./season.js";

export function runBatchSeasons(count, options = {}) {
  const seasonsPerLeague = options.seasonsPerLeague ?? 1;
  const results = [];

  for (let i = 0; i < count; i += 1) {
    const seed = options.seed ? `${options.seed}-${i}` : `batch-${i}`;
    const league = createLeague(seed);

    for (let s = 0; s < seasonsPerLeague; s += 1) {
      executeCpuRosterMoves(league);
      const result = simulateFullSeason(league, { seed: `${seed}-s${s}` });
      results.push(collectSeasonStats(league, result, seed, s + 1));
      if (s < seasonsPerLeague - 1) {
        runOffseason(league);
        executeCpuOffseasonSignings(league);
        advanceToNextSeason(league);
      }
    }
  }

  return summarizeBatch(results);
}

function collectSeasonStats(league, result, seed, seasonNumber) {
  const allPlayers = league.teams.flatMap((team) => team.roster);
  const allGames = league.games.concat(
    league.schedule.flatMap((week) => week.games.filter((g) => g.played))
  );
  const playedGames = allGames.filter((g) => g.boxScore);
  const uniqueGames = deduplicateGames(playedGames);

  const scores = uniqueGames.flatMap((g) => [g.boxScore.home.points, g.boxScore.away.points]);
  const totalYards = uniqueGames.flatMap((g) => [g.boxScore.home.totalYards, g.boxScore.away.totalYards]);
  const turnovers = uniqueGames.flatMap((g) => [g.boxScore.home.turnovers, g.boxScore.away.turnovers]);
  const injuries = uniqueGames.reduce((sum, g) => sum + (g.injuries?.length ?? 0), 0);

  const defensiveLeaders = allPlayers
    .map((p) => ({
      id: p.id,
      position: p.position,
      tackles: p.stats.tackles,
      tfl: p.stats.tacklesForLoss,
      sacks: p.stats.sacks,
      ints: p.stats.interceptions,
      pds: p.stats.passDeflections,
      score: p.stats.tackles * 2 + p.stats.tacklesForLoss * 5 + p.stats.sacks * 8 +
        p.stats.interceptions * 12 + p.stats.passDeflections * 4
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const systemWins = {};
  for (const team of league.teams) {
    const standing = league.standings.find((s) => s.teamId === team.id);
    const sys = team.strategy.offensiveSystem;
    systemWins[sys] ??= { wins: 0, losses: 0 };
    systemWins[sys].wins += standing?.wins ?? 0;
    systemWins[sys].losses += standing?.losses ?? 0;
  }

  return {
    seed,
    seasonNumber,
    championTeamId: result.championTeamId,
    scoring: {
      mean: mean(scores),
      median: median(scores),
      min: Math.min(...scores),
      max: Math.max(...scores),
      stddev: stddev(scores)
    },
    yards: {
      mean: mean(totalYards),
      median: median(totalYards),
      min: Math.min(...totalYards),
      max: Math.max(...totalYards)
    },
    turnovers: {
      mean: mean(turnovers),
      total: turnovers.reduce((a, b) => a + b, 0)
    },
    injuries: {
      total: injuries,
      perGame: uniqueGames.length > 0 ? injuries / uniqueGames.length : 0
    },
    defensiveLeaders,
    systemWins,
    gamesPlayed: uniqueGames.length
  };
}

export function summarizeBatch(seasonResults) {
  const n = seasonResults.length;
  if (n === 0) return { seasons: 0 };

  const allScoring = seasonResults.map((r) => r.scoring.mean);
  const allYards = seasonResults.map((r) => r.yards.mean);
  const allInjuryRates = seasonResults.map((r) => r.injuries.perGame);
  const allTurnovers = seasonResults.map((r) => r.turnovers.mean);

  const champions = {};
  for (const r of seasonResults) {
    champions[r.championTeamId] = (champions[r.championTeamId] ?? 0) + 1;
  }
  const uniqueChampions = Object.keys(champions).length;

  const aggregateSystemWins = {};
  for (const r of seasonResults) {
    for (const [sys, record] of Object.entries(r.systemWins)) {
      aggregateSystemWins[sys] ??= { wins: 0, losses: 0 };
      aggregateSystemWins[sys].wins += record.wins;
      aggregateSystemWins[sys].losses += record.losses;
    }
  }
  for (const sys of Object.keys(aggregateSystemWins)) {
    const rec = aggregateSystemWins[sys];
    rec.winPct = rec.wins + rec.losses > 0
      ? Number((rec.wins / (rec.wins + rec.losses)).toFixed(3))
      : 0;
  }

  const defPositionCounts = {};
  for (const r of seasonResults) {
    for (const leader of r.defensiveLeaders) {
      defPositionCounts[leader.position] = (defPositionCounts[leader.position] ?? 0) + 1;
    }
  }

  return {
    seasons: n,
    scoring: {
      mean: mean(allScoring),
      stddev: stddev(allScoring),
      min: Math.min(...allScoring),
      max: Math.max(...allScoring)
    },
    yards: {
      mean: mean(allYards),
      stddev: stddev(allYards)
    },
    turnovers: {
      meanPerTeamPerGame: mean(allTurnovers)
    },
    injuries: {
      meanPerGame: mean(allInjuryRates)
    },
    playoffVariety: {
      uniqueChampions,
      championDistribution: champions
    },
    systemBalance: aggregateSystemWins,
    defensiveLeaderPositions: defPositionCounts,
    seasonDetails: seasonResults
  };
}

function deduplicateGames(games) {
  const seen = new Set();
  return games.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

function mean(values) {
  if (values.length === 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
    : sorted[mid];
}

function stddev(values) {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}
