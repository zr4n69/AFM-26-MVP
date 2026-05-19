/**
 * Batch simulation: 12 runs × 4 seasons each
 * Collects statistics on scoring, injuries, roster sizes, OVR distribution,
 * cap health, draft quality, retirements, FA pool, errors, and balance.
 */

const { createLeague } = require('../src/data/factories.js');
const { simulateFullSeason, runOffseason, advanceToNextSeason } = require('../src/simulation/season.js');

const NUM_RUNS = 12;
const SEASONS_PER_RUN = 4;

// Collectors
const allErrors = [];
const seasonStats = [];
const teamWinTotals = {};     // teamName -> total wins across all runs
const teamChampionships = {}; // teamName -> count
const scoringBySeason = [];   // { season, mean, median, min, max, std, over50, over40 }
const injuryBySeason = [];    // { season, total, perGame, perTeam }
const rosterBySeason = [];    // { season, avgSize, minSize, maxSize, emptyPositions }
const ovrBySeason = [];       // { season, leagueAvg, starterAvg, rookieAvg, min, max }
const capBySeason = [];       // { season, avgCapSpace, teamsOverCap, avgPayroll }
const faBySeason = [];        // { season, poolSize, signings, retirements }
const draftBySeason = [];     // { season, avgRookieOvr, minRookieOvr, maxRookieOvr }

function collectSeasonData(league, seasonResult, runIdx, seasonIdx) {
  const s = league.currentSeason;
  const teams = league.teams;

  // Scoring
  const allScores = [];
  for (const week of (league.schedule || [])) {
    for (const game of week.games) {
      if (game.boxScore) {
        allScores.push(game.boxScore.home.points);
        allScores.push(game.boxScore.away.points);
      }
    }
  }
  const mean = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const sorted = [...allScores].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const std = Math.sqrt(allScores.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, allScores.length));

  scoringBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    mean: Math.round(mean * 10) / 10,
    median,
    min: sorted[0] || 0,
    max: sorted.at(-1) || 0,
    std: Math.round(std * 10) / 10,
    over50: allScores.filter(s => s > 50).length,
    over40: allScores.filter(s => s > 40).length,
    games: allScores.length / 2,
  });

  // Injuries
  let totalInjuries = 0;
  let totalGames = 0;
  for (const week of (league.schedule || [])) {
    for (const game of week.games) {
      if (game.played) {
        totalGames++;
        totalInjuries += (game.injuries || []).length;
      }
    }
  }
  injuryBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    total: totalInjuries,
    perGame: totalGames ? Math.round(totalInjuries / totalGames * 100) / 100 : 0,
    perTeam: Math.round(totalInjuries / teams.length * 100) / 100,
  });

  // Rosters
  const rosterSizes = teams.map(t => t.roster.length);
  const emptyPos = teams.reduce((sum, t) => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C', 'EDGE', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
    return sum + positions.filter(p => !t.roster.some(pl => pl.position === p)).length;
  }, 0);
  rosterBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    avgSize: Math.round(rosterSizes.reduce((a, b) => a + b, 0) / rosterSizes.length * 10) / 10,
    minSize: Math.min(...rosterSizes),
    maxSize: Math.max(...rosterSizes),
    emptyPositions: emptyPos,
  });

  // OVR distribution
  const allOvrs = teams.flatMap(t => t.roster.map(p => p.overall));
  const starterOvrs = teams.flatMap(t => {
    const dc = t.depthChart || {};
    const starterIds = new Set(Object.values(dc).flatMap(arr => arr.slice(0, 1)));
    return t.roster.filter(p => starterIds.has(p.id)).map(p => p.overall);
  });
  const rookieOvrs = teams.flatMap(t => t.roster.filter(p => p.rookie).map(p => p.overall));
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
  ovrBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    leagueAvg: avg(allOvrs),
    starterAvg: avg(starterOvrs),
    rookieAvg: avg(rookieOvrs),
    min: allOvrs.length ? Math.min(...allOvrs) : 0,
    max: allOvrs.length ? Math.max(...allOvrs) : 0,
    rookieCount: rookieOvrs.length,
  });

  // Cap health
  const capSpaces = teams.map(t => t.contractSummary?.capSpace || 0);
  const payrolls = teams.map(t => t.contractSummary?.committedCap || 0);
  capBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    avgCapSpace: Math.round(capSpaces.reduce((a, b) => a + b, 0) / capSpaces.length / 1_000_000 * 10) / 10,
    teamsOverCap: capSpaces.filter(c => c < 0).length,
    avgPayroll: Math.round(payrolls.reduce((a, b) => a + b, 0) / payrolls.length / 1_000_000 * 10) / 10,
  });

  // Standings + parity check
  for (const t of teams) {
    const name = t.name;
    teamWinTotals[name] = (teamWinTotals[name] || 0) + (t.standings?.wins || 0);
    if (league.playoff?.championTeamId === t.id) {
      teamChampionships[name] = (teamChampionships[name] || 0) + 1;
    }
  }

  // FA pool
  faBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    poolSize: league.freeAgents.length,
  });
}

function collectOffseasonData(offseason, runIdx, seasonIdx) {
  // Draft / offseason data
  draftBySeason.push({
    run: runIdx, season: seasonIdx + 1,
    retirements: offseason.retirements?.length || 0,
    contractExpirations: offseason.contractExpirations?.length || 0,
    faSignings: offseason.freeAgency?.signings?.length || 0,
    cpuTrades: offseason.cpuTrades?.length || 0,
    capEnforcements: offseason.capEnforcement?.length || 0,
    freeAgentPoolExits: offseason.freeAgentPoolExits?.length || 0,
  });
}

// ── Run simulations ─────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`BATCH SIMULATION: ${NUM_RUNS} runs × ${SEASONS_PER_RUN} seasons`);
console.log(`${'='.repeat(60)}\n`);

const startTime = Date.now();

for (let r = 0; r < NUM_RUNS; r++) {
  const seed = `batch-test-${r + 1}`;
  const teamIdx = r % 16; // Vary which team is player-controlled

  let league;
  try {
    league = createLeague(seed, { playerTeamIndex: teamIdx, playerPrestige: 4.25 });
  } catch (e) {
    allErrors.push({ run: r + 1, phase: 'createLeague', error: e.message });
    continue;
  }

  for (let s = 0; s < SEASONS_PER_RUN; s++) {
    const seasonLabel = `Run ${r + 1}, Season ${s + 1}`;

    // Simulate full season
    let seasonResult;
    try {
      seasonResult = simulateFullSeason(league, { seed: `${seed}-s${s + 1}` });
    } catch (e) {
      allErrors.push({ run: r + 1, season: s + 1, phase: 'simulateFullSeason', error: e.message, stack: e.stack?.split('\n').slice(0, 3).join('\n') });
      console.log(`  ❌ ${seasonLabel}: simulateFullSeason FAILED — ${e.message}`);
      break;
    }

    // Collect data
    try {
      collectSeasonData(league, seasonResult, r + 1, s);
    } catch (e) {
      allErrors.push({ run: r + 1, season: s + 1, phase: 'collectData', error: e.message });
    }

    const champ = league.teams.find(t => t.id === league.playoff?.championTeamId);
    const champName = champ ? `${champ.city} ${champ.nickname}` : '??';

    // Run offseason + advance (except after last season)
    if (s < SEASONS_PER_RUN - 1) {
      let offseason;
      try {
        offseason = runOffseason(league);
      } catch (e) {
        allErrors.push({ run: r + 1, season: s + 1, phase: 'runOffseason', error: e.message, stack: e.stack?.split('\n').slice(0, 3).join('\n') });
        console.log(`  ❌ ${seasonLabel}: runOffseason FAILED — ${e.message}`);
        break;
      }

      try {
        collectOffseasonData(offseason, r + 1, s);
      } catch (e) {
        allErrors.push({ run: r + 1, season: s + 1, phase: 'collectOffseasonData', error: e.message });
      }

      try {
        advanceToNextSeason(league);
      } catch (e) {
        allErrors.push({ run: r + 1, season: s + 1, phase: 'advanceToNextSeason', error: e.message, stack: e.stack?.split('\n').slice(0, 3).join('\n') });
        console.log(`  ❌ ${seasonLabel}: advanceToNextSeason FAILED — ${e.message}`);
        break;
      }
    }

    process.stdout.write(`  ✅ ${seasonLabel}: Champion = ${champName}\n`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ── Report ──────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`REPORT — completed in ${elapsed}s`);
console.log(`${'='.repeat(60)}`);

// Errors
console.log(`\n── ERRORS (${allErrors.length}) ──`);
if (allErrors.length === 0) {
  console.log('  ✅ No errors!');
} else {
  for (const e of allErrors) {
    console.log(`  Run ${e.run}, S${e.season || '?'} [${e.phase}]: ${e.error}`);
    if (e.stack) console.log(`    ${e.stack.replace(/\n/g, '\n    ')}`);
  }
}

// Scoring
console.log('\n── SCORING ──');
const allMeans = scoringBySeason.map(s => s.mean);
const allOver50 = scoringBySeason.reduce((s, v) => s + v.over50, 0);
const allOver40 = scoringBySeason.reduce((s, v) => s + v.over40, 0);
const totalGameScores = scoringBySeason.reduce((s, v) => s + v.games * 2, 0);
console.log(`  Avg pts/team:   ${(allMeans.reduce((a,b)=>a+b,0)/allMeans.length).toFixed(1)}`);
console.log(`  Min game score:  ${Math.min(...scoringBySeason.map(s=>s.min))}`);
console.log(`  Max game score:  ${Math.max(...scoringBySeason.map(s=>s.max))}`);
console.log(`  Scores > 50:     ${allOver50} / ${totalGameScores} (${(allOver50/totalGameScores*100).toFixed(1)}%)`);
console.log(`  Scores > 40:     ${allOver40} / ${totalGameScores} (${(allOver40/totalGameScores*100).toFixed(1)}%)`);
console.log(`  Avg std dev:     ${(scoringBySeason.reduce((s,v)=>s+v.std,0)/scoringBySeason.length).toFixed(1)}`);

// Injuries
console.log('\n── INJURIES ──');
const avgPerGame = injuryBySeason.reduce((s, v) => s + v.perGame, 0) / injuryBySeason.length;
const avgTotal = injuryBySeason.reduce((s, v) => s + v.total, 0) / injuryBySeason.length;
console.log(`  Avg injuries/game:    ${avgPerGame.toFixed(2)}`);
console.log(`  Avg total/season:     ${avgTotal.toFixed(0)}`);
console.log(`  Min in a season:      ${Math.min(...injuryBySeason.map(s=>s.total))}`);
console.log(`  Max in a season:      ${Math.max(...injuryBySeason.map(s=>s.total))}`);

// Rosters
console.log('\n── ROSTERS ──');
const avgRosterSize = rosterBySeason.reduce((s, v) => s + v.avgSize, 0) / rosterBySeason.length;
console.log(`  Avg roster size:      ${avgRosterSize.toFixed(1)}`);
console.log(`  Min roster seen:      ${Math.min(...rosterBySeason.map(s=>s.minSize))}`);
console.log(`  Max roster seen:      ${Math.max(...rosterBySeason.map(s=>s.maxSize))}`);
console.log(`  Total empty positions: ${rosterBySeason.reduce((s,v)=>s+v.emptyPositions,0)} across all seasons`);

// OVR
console.log('\n── PLAYER RATINGS ──');
const avgLeagueOvr = ovrBySeason.reduce((s, v) => s + v.leagueAvg, 0) / ovrBySeason.length;
const avgStarterOvr = ovrBySeason.reduce((s, v) => s + v.starterAvg, 0) / ovrBySeason.length;
const avgRookieOvr = ovrBySeason.filter(v => v.rookieCount > 0).reduce((s, v) => s + v.rookieAvg, 0) / Math.max(1, ovrBySeason.filter(v => v.rookieCount > 0).length);
console.log(`  Avg league OVR:       ${avgLeagueOvr.toFixed(1)}`);
console.log(`  Avg starter OVR:      ${avgStarterOvr.toFixed(1)}`);
console.log(`  Avg rookie OVR:       ${avgRookieOvr.toFixed(1)} (${ovrBySeason.filter(v=>v.rookieCount>0).length} seasons with rookies)`);
console.log(`  Global min OVR:       ${Math.min(...ovrBySeason.map(s=>s.min))}`);
console.log(`  Global max OVR:       ${Math.max(...ovrBySeason.map(s=>s.max))}`);

// By season progression
console.log('\n  OVR by season progression:');
for (let si = 0; si < SEASONS_PER_RUN; si++) {
  const entries = ovrBySeason.filter(v => v.season === si + 1);
  const avg = entries.reduce((s, v) => s + v.leagueAvg, 0) / entries.length;
  const savg = entries.reduce((s, v) => s + v.starterAvg, 0) / entries.length;
  console.log(`    Season ${si + 1}: League ${avg.toFixed(1)} | Starters ${savg.toFixed(1)}`);
}

// Cap health
console.log('\n── CAP HEALTH ──');
const avgCap = capBySeason.reduce((s, v) => s + v.avgCapSpace, 0) / capBySeason.length;
const totalOverCap = capBySeason.reduce((s, v) => s + v.teamsOverCap, 0);
console.log(`  Avg cap space:        $${avgCap.toFixed(1)}M`);
console.log(`  Teams over cap:       ${totalOverCap} instances across all seasons`);
console.log(`  Avg payroll:          $${(capBySeason.reduce((s,v)=>s+v.avgPayroll,0)/capBySeason.length).toFixed(1)}M`);

// FA pool
console.log('\n── FREE AGENCY ──');
const avgFAPool = faBySeason.reduce((s, v) => s + v.poolSize, 0) / faBySeason.length;
console.log(`  Avg FA pool size:     ${avgFAPool.toFixed(0)}`);
console.log(`  Min FA pool:          ${Math.min(...faBySeason.map(s=>s.poolSize))}`);
console.log(`  Max FA pool:          ${Math.max(...faBySeason.map(s=>s.poolSize))}`);

// Offseason data
if (draftBySeason.length > 0) {
  console.log('\n── OFFSEASON FLOW ──');
  const avgRet = draftBySeason.reduce((s,v)=>s+v.retirements,0)/draftBySeason.length;
  const avgExp = draftBySeason.reduce((s,v)=>s+v.contractExpirations,0)/draftBySeason.length;
  const avgFA = draftBySeason.reduce((s,v)=>s+v.faSignings,0)/draftBySeason.length;
  const avgTrades = draftBySeason.reduce((s,v)=>s+v.cpuTrades,0)/draftBySeason.length;
  const avgCE = draftBySeason.reduce((s,v)=>s+v.capEnforcements,0)/draftBySeason.length;
  const avgPoolExits = draftBySeason.reduce((s,v)=>s+v.freeAgentPoolExits,0)/draftBySeason.length;
  console.log(`  Avg retirements:      ${avgRet.toFixed(1)}/season`);
  console.log(`  Avg contract exp:     ${avgExp.toFixed(1)}/season`);
  console.log(`  Avg FA signings:      ${avgFA.toFixed(1)}/season`);
  console.log(`  Avg CPU trades:       ${avgTrades.toFixed(1)}/season`);
  console.log(`  Avg cap enforcements: ${avgCE.toFixed(1)}/season`);
  console.log(`  Avg FA pool exits:    ${avgPoolExits.toFixed(1)}/season`);
}

// Parity / balance
console.log('\n── COMPETITIVE BALANCE ──');
const teamNames = Object.keys(teamWinTotals);
const winValues = Object.values(teamWinTotals);
const avgWins = winValues.reduce((a,b)=>a+b,0) / winValues.length;
const winStd = Math.sqrt(winValues.reduce((s,v)=>s+(v-avgWins)**2,0)/winValues.length);
console.log(`  Avg total wins:       ${avgWins.toFixed(1)} per team (across ${NUM_RUNS * SEASONS_PER_RUN} seasons)`);
console.log(`  Win std dev:          ${winStd.toFixed(1)} (lower = more parity)`);
console.log(`  Most wins:            ${teamNames.reduce((best,n)=>teamWinTotals[n]>teamWinTotals[best]?n:best,teamNames[0])} (${Math.max(...winValues)})`);
console.log(`  Fewest wins:          ${teamNames.reduce((worst,n)=>teamWinTotals[n]<teamWinTotals[worst]?n:worst,teamNames[0])} (${Math.min(...winValues)})`);

console.log('\n  Championships:');
const champEntries = Object.entries(teamChampionships).sort((a,b) => b[1] - a[1]);
if (champEntries.length === 0) console.log('    None recorded');
for (const [name, count] of champEntries) {
  console.log(`    ${name}: ${count}`);
}

const uniqueChamps = new Set(champEntries.map(e => e[0]));
console.log(`\n  Unique champions:     ${uniqueChamps.size} out of 16 teams`);
console.log(`  Max by one team:      ${champEntries.length ? champEntries[0][1] : 0}`);

// Win distribution table
console.log('\n  Win distribution (sorted):');
const sortedTeams = Object.entries(teamWinTotals).sort((a,b) => b[1] - a[1]);
for (const [name, wins] of sortedTeams) {
  const champs = teamChampionships[name] || 0;
  const bar = '█'.repeat(Math.round(wins / 2));
  console.log(`    ${name.padEnd(20)} ${String(wins).padStart(3)} wins  ${champs ? `🏆×${champs}` : '     '} ${bar}`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Done. ${allErrors.length} error(s) in ${elapsed}s.`);
console.log(`${'='.repeat(60)}\n`);
