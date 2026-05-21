import { OFFENSIVE_STARTERS, DEFENSIVE_STARTERS, getSchemeStarters } from '@engine/data/constants.js';

const OFF_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'];
const DEF_POSITIONS = ['EDGE', 'DL', 'LB', 'CB', 'S'];
const ST_POSITIONS = ['K', 'P', 'RET'];

const BASE = import.meta.env.BASE_URL;

const TEAM_VISUALS = {
  'Portland Stags':       { abbr: 'SF',  conf: 'West',  primary: '#A8322B', secondary: '#5A5754', tertiary: '#7A4B2A', logo: `${BASE}logos/SF.svg` },
  'Austin Founders':      { abbr: 'AUS', conf: 'East',  primary: '#D9C9A8', secondary: '#1B3A6B', tertiary: '#A8A8AC', logo: `${BASE}logos/AUS.svg` },
  'Columbus Comets':      { abbr: 'NYC', conf: 'East',  primary: '#E8631A', secondary: '#6B6F76', tertiary: '#F4F4F4', logo: `${BASE}logos/NYC.svg` },
  'Sacramento Ridgebacks': { abbr: 'LA',  conf: 'West',  primary: '#3E1F6B', secondary: '#0B0B12', tertiary: '#7DC8E8', logo: `${BASE}logos/LA.svg` },
  'Orlando Pilots':       { abbr: 'SD',  conf: 'West',  primary: '#E8851A', secondary: '#F2C94C', tertiary: '#C0392B', logo: `${BASE}logos/SD.svg` },
  'Memphis Kings':        { abbr: 'LV',  conf: 'West',  primary: '#0E0E10', secondary: '#F2F2F2', tertiary: '#D4AF37', logo: `${BASE}logos/LV.svg` },
  'Omaha Steel':          { abbr: 'WYO', conf: 'North', primary: '#5A3A22', secondary: '#1F3B2D', tertiary: '#F4EFE6', logo: `${BASE}logos/WYO.svg` },
  'Raleigh Redwoods':     { abbr: 'SLC', conf: 'North', primary: '#F4EFE6', secondary: '#C9A227', tertiary: '#F2C94C', logo: `${BASE}logos/SLC.svg` },
  'Salt Lake Summit':     { abbr: 'NM',  conf: 'North', primary: '#0E0E10', secondary: '#E8C547', tertiary: '#C0392B', logo: `${BASE}logos/NM.svg` },
  'Milwaukee Harbors':    { abbr: 'PHX', conf: 'North', primary: '#B11226', secondary: '#E8B042', tertiary: '#1A1A1A', logo: `${BASE}logos/PHX.svg` },
  'San Antonio Marshals': { abbr: 'PA',  conf: 'East',  primary: '#13294B', secondary: '#A8322B', tertiary: '#F4F4F4', logo: `${BASE}logos/PA.svg` },
  'Louisville Thoroughbreds': { abbr: 'PHI', conf: 'East', primary: '#7A4B2A', secondary: '#F4EAD2', tertiary: '#8B2E1F', logo: `${BASE}logos/PHI.svg` },
  'Boise Cutthroats':     { abbr: 'TB',  conf: 'South', primary: '#A8322B', secondary: '#E8851A', tertiary: '#F4F4F4', logo: `${BASE}logos/TB.svg` },
  'Birmingham Vulcans':   { abbr: 'MIA', conf: 'South', primary: '#0F4C81', secondary: '#3FB8AF', tertiary: '#F4F4F4', logo: `${BASE}logos/MIA.svg` },
  'Albuquerque Roadrunners': { abbr: 'HOU', conf: 'South', primary: '#0B1F3A', secondary: '#A8A8AC', tertiary: '#F4F4F4', logo: `${BASE}logos/HOU.svg` },
  'Providence Anchors':   { abbr: 'JAX', conf: 'South', primary: '#2F5233', secondary: '#F4F4F4', tertiary: '#E8C547', logo: `${BASE}logos/JAX.svg` },
};

export function bridgeTeam(engineTeam, league) {
  if (!engineTeam) return { id: null, city: '', name: '', fullName: '', abbr: '???', conf: '', primary: '#333', secondary: '#999', tertiary: '#ccc', logo: null, roster: [], w: 0, l: 0, tie: 0, pf: 0, pa: 0, pct: 0, diff: 0, cap: 150, payroll: 0, capSpace: 150, ovr: 0, offRating: 0, defRating: 0, strategy: {}, storylines: [], rosterNeeds: {}, morale: 50, moraleNotes: [], _engine: {} };
  const visual = TEAM_VISUALS[engineTeam.name] || {};
  const roster = (engineTeam.roster || []).map(p => bridgePlayer(p, engineTeam));

  // Use scheme starter counts for accurate OVR calculations
  const offScheme = engineTeam.strategy ? (OFFENSIVE_STARTERS[engineTeam.strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro) : {};
  const defScheme = engineTeam.strategy ? (DEFENSIVE_STARTERS[engineTeam.strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone) : {};

  const offPlayers = [];
  for (const pos of OFF_POSITIONS) {
    const count = offScheme[pos] || 0;
    if (count > 0) {
      offPlayers.push(...roster.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, count));
    }
  }
  if (offPlayers.length === 0) offPlayers.push(...roster.filter(p => OFF_POSITIONS.includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 11));

  const defPlayers = [];
  for (const pos of DEF_POSITIONS) {
    const enginePos = pos === 'DT' ? 'DL' : pos;
    const count = defScheme[enginePos] || 0;
    if (count > 0) {
      defPlayers.push(...roster.filter(p => p.pos === pos || (pos === 'DT' && p.pos === 'DT')).sort((a, b) => b.ovr - a.ovr).slice(0, count));
    }
  }
  if (defPlayers.length === 0) defPlayers.push(...roster.filter(p => DEF_POSITIONS.includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 11));

  const starters = [...offPlayers, ...defPlayers];

  const s = engineTeam.standings || {};
  const payroll = engineTeam.contractSummary?.committedCap || 0;
  const cap = engineTeam.salaryCap || 150_000_000;

  return {
    id: engineTeam.id,
    city: engineTeam.city,
    name: engineTeam.nickname,
    fullName: engineTeam.name,
    abbr: visual.abbr || engineTeam.city.slice(0, 3).toUpperCase(),
    conf: visual.conf || engineTeam.division,
    primary: visual.primary || '#333',
    secondary: visual.secondary || '#999',
    tertiary: visual.tertiary || '#ccc',
    logo: visual.logo || null,
    prestige: engineTeam.prestige,
    w: s.wins || 0,
    l: s.losses || 0,
    tie: s.ties || 0,
    pf: s.pointsFor || 0,
    pa: s.pointsAgainst || 0,
    pct: (s.wins || 0) / Math.max(1, (s.wins || 0) + (s.losses || 0) + (s.ties || 0)),
    diff: (s.pointsFor || 0) - (s.pointsAgainst || 0),
    cap: cap / 1_000_000,
    payroll: payroll / 1_000_000,
    capSpace: (cap - payroll) / 1_000_000,
    ovr: starters.length ? Math.round(starters.reduce((s, p) => s + p.ovr, 0) / starters.length) : 0,
    offRating: offPlayers.length ? Math.round(offPlayers.reduce((s, p) => s + p.ovr, 0) / offPlayers.length) : 0,
    defRating: defPlayers.length ? Math.round(defPlayers.reduce((s, p) => s + p.ovr, 0) / defPlayers.length) : 0,
    roster,
    strategy: engineTeam.strategy,
    isPlayerControlled: engineTeam.isPlayerControlled,
    morale: engineTeam.morale?.score ?? 50,
    moraleNotes: engineTeam.morale?.notes || [],
    storylines: (engineTeam.storylines || []).map(s => s.text || s),
    rosterNeeds: engineTeam.rosterNeeds || {},
    schemeStarters: engineTeam.strategy ? getSchemeStarters(engineTeam.strategy) : {},
    offStarters: engineTeam.strategy ? (OFFENSIVE_STARTERS[engineTeam.strategy.offensiveSystem] || OFFENSIVE_STARTERS.balancedPro) : {},
    defStarters: engineTeam.strategy ? (DEFENSIVE_STARTERS[engineTeam.strategy.defensiveSystem] || DEFENSIVE_STARTERS.fourThreeZone) : {},
    _engine: engineTeam,
  };
}

export function bridgePlayer(enginePlayer, engineTeam) {
  if (!enginePlayer) return { id: null, name: '?', pos: '?', ovr: 0, _engine: {} };
  const c = enginePlayer.contract || {};
  const depthAt = engineTeam?.depthChart?.[enginePlayer.position] || [];
  const depthIndex = depthAt.indexOf(enginePlayer.id);

  const posMap = {
    OT: 'OT', OG: 'OG', C: 'C', DL: 'DT',
    RET: 'LS',
  };

  const groupMap = p => {
    if (OFF_POSITIONS.includes(p)) return 'OFF';
    if (DEF_POSITIONS.includes(p)) return 'DEF';
    return 'ST';
  };

  const healthMap = {
    healthy: null,
    questionable: 'Questionable',
    doubtful: 'Doubtful',
    out: 'Out',
    injured: 'Out',  // fallback for legacy data
  };

  return {
    id: enginePlayer.id,
    name: `${enginePlayer.firstName} ${enginePlayer.lastName}`,
    first: enginePlayer.firstName,
    last: enginePlayer.lastName,
    teamId: engineTeam.id,
    pos: posMap[enginePlayer.position] || enginePlayer.position,
    group: groupMap(enginePlayer.position),
    age: enginePlayer.age,
    ovr: enginePlayer.overall,
    potential: enginePlayer.potentialStars,
    ceiling: [64, 72, 79, 89, 99][(enginePlayer.potentialStars || 1) - 1],
    attrs: enginePlayer.ratings || {},
    traits: (enginePlayer.traits || []).map(t => t.name || t),
    fatigue: enginePlayer.fatigue || 0,
    injStatus: healthMap[enginePlayer.health?.status] || null,
    years: c.yearsRemaining || 0,
    salary: (c.salary || 0) / 1_000_000,
    cap: (c.capHit || 0) / 1_000_000,
    guaranteed: (c.guaranteedAmount || 0) / 1_000_000,
    bonusType: c.bonusExpectation || null,
    bonusPaid: c.bonusPaid || false,
    bonusAmt: (c.bonusAmount || 0) / 1_000_000,
    careerStats: enginePlayer.careerStats || {},
    isStarter: depthIndex === 0,
    depth: depthIndex >= 0 ? depthIndex : 99,
    _engine: enginePlayer,
  };
}

const SCOUTING_GROUPS = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'WR', OT: 'OL', OG: 'OL', C: 'OL',
  EDGE: 'EDGE', DL: 'DT', LB: 'LB', CB: 'CB', S: 'S', K: 'K', P: 'P',
};

export function bridgeProspect(prospect, revealedGroups) {
  if (!prospect) return { id: null, name: '?', pos: '?', ratingRange: [0, 0], projRank: 99, _engine: {} };
  const group = SCOUTING_GROUPS[prospect.position] || prospect.position;
  const revealLevel = revealedGroups?.[group] || null;
  const range = prospect.ratingRange || [0, 0];
  const mid = Math.round((range[0] + range[1]) / 2);

  return {
    id: prospect.id,
    name: `${prospect.firstName} ${prospect.lastName}`,
    pos: prospect.position,
    age: prospect.age,
    college: prospect.collegeHistory,
    ratingRange: range,
    projRank: prospect.expectedDraftPosition,
    combine: prospect.combineResults,
    combineRank: prospect.combineRank,
    drafted: !!prospect.draftedByTeamId,
    // Revealed at surface+
    ovr: revealLevel ? mid : null,
    // Revealed at standard+
    traits: (revealLevel === 'standard' || revealLevel === 'deep') ? (prospect.traits || []) : null,
    // Revealed at deep
    potential: revealLevel === 'deep' ? (prospect.potentialStars || null) : null,
    revealLevel,
    _engine: prospect,
  };
}

export function isTradeWindowOpen(league) {
  if (!league) return false;
  return league.phase === 'offseason' || league.phase === 'preseason' || (league.phase === 'regularSeason' && league.currentWeek <= 4);
}

export function bridgeFreeAgent(player) {
  if (!player) return { id: null, name: '?', pos: '?', ovr: 0, traits: [], _engine: {} };
  const posMap = { OT: 'OT', OG: 'OG', C: 'C', DL: 'DT', RET: 'LS' };
  const groupMap = p => {
    if (OFF_POSITIONS.includes(p)) return 'OFF';
    if (DEF_POSITIONS.includes(p)) return 'DEF';
    return 'ST';
  };
  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    first: player.firstName,
    last: player.lastName,
    pos: posMap[player.position] || player.position,
    group: groupMap(player.position),
    age: player.age,
    ovr: player.overall,
    potential: player.potentialStars,
    traits: (player.traits || []).map(t => t.name || t),
    injStatus: player.health?.status === 'healthy' ? null : player.health?.status?.[0]?.toUpperCase(),
    careerStats: player.careerStats || {},
    stats: player.stats || {},
    _engine: player,
  };
}

export function isTrainingWindowOpen(league) {
  const closed = { open: false, type: null, label: 'No training window available' };
  if (!league?.training) return closed;
  if (league.phase === 'preseason') {
    const camp = league.training.camp;
    if (!camp) return closed;
    const campUsed = camp.completed || (camp.sessions || []).some(s => s.completed);
    if (campUsed) return { open: false, type: null, label: 'Training camp session already used' };
    return { open: true, type: 'camp', label: 'Training Camp' };
  }
  if (league.phase === 'regularSeason') {
    const windows = [3, 6, 9];
    const currentWindow = windows.find(w => league.currentWeek === w);
    if (currentWindow != null) {
      const regWindows = league.training.regularSeason?.windows || [];
      const windowObj = regWindows.find(w => w.afterWeek === currentWindow);
      if (windowObj && !windowObj.completed) {
        const idx = windows.indexOf(currentWindow) + 1;
        return { open: true, type: 'regularSeason', afterWeek: currentWindow, label: `In-Season Window ${idx} of 3` };
      }
    }
  }
  return closed;
}

export function bridgeLeague(league) {
  if (!league) return { teams: [], userTeam: null, season: 1, week: 0, phase: 'preseason', _engine: {} };
  const teams = (league.teams || []).map(t => bridgeTeam(t, league));
  const userTeam = teams.find(t => t._engine?.isPlayerControlled) || teams[0];

  const byId = (id) => teams.find(t => t.id === id);

  return {
    teams,
    userTeam,
    byId,
    season: league.currentSeason,
    week: league.currentWeek,
    phase: league.phase,
    training: league.training,
    scouting: league.scouting,
    draft: league.draft,
    trades: league.trades || [],
    pendingOffers: league.pendingOffers || [],
    cpuTrades: league.tradeMarket?.cpuToCpuTrades || [],
    awards: league.awards,
    hallOfFame: league.hallOfFame,
    seasonHistory: league.seasonHistory || [],
    freeAgents: league.freeAgents || [],
    draftClass: league.draftClass || [],
    _engine: league,
  };
}
