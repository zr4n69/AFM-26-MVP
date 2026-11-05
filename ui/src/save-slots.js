const SAVE_VERSION = 1;
const MAX_SLOTS = 5;
const STORAGE_PREFIX = "afm26_save_slot_";
const LEGACY_MIGRATION_KEY = "afm26_legacy_save_migrated_to";
let activeProfileId = null;
const STAT_KEYS = [
  "passingYards", "passingTouchdowns", "interceptionsThrown",
  "rushingYards", "rushingTouchdowns", "receivingYards", "receivingTouchdowns",
  "tackles", "tacklesForLoss", "sacks", "interceptions", "passDeflections",
  "puntDeflections", "kickDeflections", "fieldGoalsAttempted", "fieldGoalsMade",
  "fieldGoalYards", "punts", "puntYards"
];

function slotKey(slotIndex, profileId = activeProfileId) {
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
    throw new Error(`Save slot must be between 0 and ${MAX_SLOTS - 1}.`);
  }
  return profileId ? `${STORAGE_PREFIX}${encodeURIComponent(profileId)}_${slotIndex}` : `${STORAGE_PREFIX}${slotIndex}`;
}

export function setSaveProfile(profileId) {
  activeProfileId = profileId || null;
  if (!activeProfileId) return;
  // One-time, non-destructive migration of pre-account local saves.
  if (localStorage.getItem(LEGACY_MIGRATION_KEY)) return;
  let migrated = false;
  for (let index = 0; index < MAX_SLOTS; index += 1) {
    const legacy = localStorage.getItem(slotKey(index, null));
    const scopedKey = slotKey(index, activeProfileId);
    if (legacy && !localStorage.getItem(scopedKey)) {
      localStorage.setItem(scopedKey, legacy);
      migrated = true;
    }
  }
  if (migrated) localStorage.setItem(LEGACY_MIGRATION_KEY, activeProfileId);
}

export function readLocalSnapshot(slotIndex) {
  const raw = localStorage.getItem(slotKey(slotIndex));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeLocalSnapshot(slotIndex, snapshot) {
  localStorage.setItem(slotKey(slotIndex), JSON.stringify(snapshot));
}

export function listSaveSlots() {
  const slots = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const raw = localStorage.getItem(slotKey(i));
    if (raw) {
      try {
        const snapshot = JSON.parse(raw);
        const team = snapshot.league?.teams?.find((t) => t.isPlayerControlled);
        slots.push({
          slotIndex: i,
          occupied: true,
          savedAt: snapshot.savedAt,
          reason: snapshot.reason,
          teamName: team?.name ?? "Unknown Team",
          season: snapshot.league?.currentSeason ?? 1,
          phase: snapshot.league?.phase ?? "preseason",
          record: team
            ? `${team.standings.wins}-${team.standings.losses}${team.standings.ties ? `-${team.standings.ties}` : ""}`
            : "0-0"
        });
      } catch {
        slots.push({ slotIndex: i, occupied: false });
      }
    } else {
      slots.push({ slotIndex: i, occupied: false });
    }
  }
  return slots;
}

/**
 * Strip data that is large and not required for persistence:
 *  - driveLog: ~114 KB per game, only needed during live sim view (regenerated each session)
 *  - schedule game results: already stored in league.games; schedule only needs id/teams/played
 *  - autosaveLog: cap to prevent unbounded growth
 */
function pruneLeagueForStorage(league) {
  if (Array.isArray(league.games)) {
    // The UI exposes current-season games; older results are represented by
    // seasonHistory and career stats, so retaining every historical box score
    // needlessly multiplies save size.
    const currentGameIds = new Set([
      ...(league.schedule || []).flatMap((week) => (week.games || []).map((game) => game.id)),
      ...(league.playoff?.rounds || []).flatMap((round) => (round.games || []).map((game) => game.id))
    ]);
    league.games = league.games
      .filter((game) => currentGameIds.has(game.id))
      .map(compactGame);
  }
  for (const round of league.playoff?.rounds || []) {
    round.games = (round.games || []).map(compactGame);
  }
  if (Array.isArray(league.schedule)) {
    for (const week of league.schedule) {
      for (const g of (week.games || [])) {
        delete g.driveLog;
        delete g.boxScore;
        delete g.keyEvents;
        delete g.injuries;
      }
    }
  }
  if (Array.isArray(league.autosaveLog)) league.autosaveLog = league.autosaveLog.slice(-50);
  // Undrafted prospects are already converted into league.freeAgents. This
  // collection is only a transient draft result cache and otherwise duplicates
  // the full prospect records in every save.
  league.prospectFreeAgents = [];
  for (const player of persistedPlayers(league)) {
    player.stats = compactStats(player.stats);
    player.careerStats = compactStats(player.careerStats);
  }
}

function compactStats(stats) {
  return Object.fromEntries(Object.entries(stats || {}).filter(([, value]) => value !== 0));
}

function persistedPlayers(league) {
  return [
    ...(league.teams || []).flatMap((team) => team.roster || []),
    ...(league.freeAgents || []),
    ...(league.hallOfFame?.eligiblePlayers || [])
  ];
}

function compactGame(game) {
  const compactSide = (side) => side ? {
    points: side.points ?? 0,
    totalYards: side.totalYards ?? 0,
    turnovers: side.turnovers ?? 0
  } : null;
  return {
    ...game,
    driveLog: [],
    boxScore: game.boxScore ? {
      home: compactSide(game.boxScore.home),
      away: compactSide(game.boxScore.away)
    } : null,
    injuries: game.injuries || [],
    keyEvents: (game.keyEvents || []).slice(0, 8)
  };
}

export function saveToSlot(league, slotIndex, reason = "manual") {
  let cloned;
  try {
    cloned = JSON.parse(JSON.stringify(league, (key, value) => {
      if (key === "driveLog" || key === "offensiveEvents" || key === "defensiveEvents") return undefined;
      return value;
    }));
  } catch (e) {
    throw new Error(`Save failed: could not clone state — ${e.message}`, { cause: e });
  }
  pruneLeagueForStorage(cloned);
  const snapshot = {
    version: SAVE_VERSION,
    reason,
    savedAt: new Date().toISOString(),
    league: cloned,
  };
  try {
    localStorage.setItem(slotKey(slotIndex), JSON.stringify(snapshot));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Save failed: storage quota exceeded. Try deleting another save slot.', { cause: e });
    }
    throw e;
  }
  return snapshot;
}

export function loadFromSlot(slotIndex) {
  const raw = localStorage.getItem(slotKey(slotIndex));
  if (!raw) throw new Error(`Save slot ${slotIndex} is empty.`);
  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Save slot ${slotIndex} is corrupted and cannot be read.`, { cause: error });
  }
  if (snapshot.version !== SAVE_VERSION || !snapshot.league) {
    throw new Error(`Unsupported save format in slot ${slotIndex}.`);
  }
  const league = snapshot.league;
  // Validate minimum shape to guard against tampered/corrupted saves
  if (!isValidLeagueShape(league)) {
    throw new Error(`Save slot ${slotIndex} contains invalid data.`);
  }
  for (const player of persistedPlayers(league)) {
    player.stats = hydrateStats(player.stats);
    player.careerStats = hydrateStats(player.careerStats);
  }
  rehydrateCurrentSchedule(league);
  return league;
}

function hydrateStats(stats) {
  return Object.fromEntries(STAT_KEYS.map((key) => [key, stats?.[key] ?? 0]));
}

function isValidLeagueShape(league) {
  return Array.isArray(league.teams)
    && league.teams.length > 0
    && new Set(league.teams.map((team) => team.id)).size === league.teams.length
    && league.teams.some((team) => team.isPlayerControlled)
    && league.teams.every((team) => Array.isArray(team.roster) && team.depthChart)
    && Array.isArray(league.schedule)
    && Array.isArray(league.standings)
    && typeof league.currentSeason === 'number'
    && typeof league.currentWeek === 'number'
    && league.draft
    && Array.isArray(league.draftClass);
}

function rehydrateCurrentSchedule(league) {
  const gamesById = new Map((league.games || []).map((game) => [game.id, game]));
  for (const week of league.schedule) {
    week.games = (week.games || []).map((scheduledGame) => {
      const savedGame = gamesById.get(scheduledGame.id);
      return savedGame ? { ...scheduledGame, ...savedGame, driveLog: [] } : scheduledGame;
    });
  }
}

export function deleteSlot(slotIndex) {
  localStorage.removeItem(slotKey(slotIndex));
}

export { MAX_SLOTS };
