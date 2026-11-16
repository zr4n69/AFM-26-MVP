import { TEAM_IDENTITIES } from '../../src/data/team-identities.js';

const SAVE_VERSION = 2;
const MAX_SLOTS = 3;
const STORAGE_PREFIX = "afm26_save_slot_";
const TEAM_NICKNAME_BY_CITY = Object.freeze(Object.fromEntries(TEAM_IDENTITIES.map(team => [team.city, team.nickname])));

function migrateTeamBranding(league) {
  for (const team of league?.teams || []) {
    const nickname = TEAM_NICKNAME_BY_CITY[team.city];
    if (!nickname) continue;
    team.nickname = nickname;
    team.name = `${team.city} ${nickname}`;
  }
  return league;
}

function migrateCareerProfiles(league) {
  const team = league?.teams?.find((entry) => entry.isPlayerControlled);
  league.coach ||= {
    firstName: 'Alex', lastName: 'Morgan', portraitIndex: 0,
    title: 'Head Coach & General Manager', trackingStartSeason: league.currentSeason || 1,
    seasonLedger: [], honors: [],
    frontOffice: { draftSelections: 0, firstRoundPicks: 0, tradesCompleted: 0, freeAgentSignings: 0 }
  };
  league.coach.trackingStartSeason ||= league.currentSeason || 1;
  league.coach.seasonLedger ||= [];
  league.coach.honors ||= [];
  league.coach.frontOffice ||= { draftSelections: 0, firstRoundPicks: 0, tradesCompleted: 0, freeAgentSignings: 0 };
  for (const player of [...(league.freeAgents || []), ...(league.teams || []).flatMap((entry) => entry.roster || [])]) {
    player.origin ||= { type: 'preCareer' };
    player.championships ||= [];
    player.achievementTrackingStartSeason ||= league.currentSeason || 1;
  }
  if (team && !Number.isFinite(league.coach.portraitIndex)) league.coach.portraitIndex = 0;
  return league;
}

function slotKey(slotIndex) {
  if (slotIndex < 0 || slotIndex >= MAX_SLOTS) {
    throw new Error(`Save slot must be between 0 and ${MAX_SLOTS - 1}.`);
  }
  return `${STORAGE_PREFIX}${slotIndex}`;
}

export function listSaveSlots() {
  const slots = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const raw = localStorage.getItem(slotKey(i));
    if (raw) {
      try {
        const snapshot = JSON.parse(raw);
        const team = snapshot.league?.teams?.find((t) => t.isPlayerControlled);
        const currentNickname = TEAM_NICKNAME_BY_CITY[team?.city];
        slots.push({
          slotIndex: i,
          occupied: true,
          savedAt: snapshot.savedAt,
          reason: snapshot.reason,
          teamName: team ? `${team.city} ${currentNickname || team.nickname}` : "Unknown Team",
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
    for (const g of league.games) {
      delete g.driveLog;
    }
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
  if (Array.isArray(league.autosaveLog) && league.autosaveLog.length > 200) {
    league.autosaveLog = league.autosaveLog.slice(-100);
  }
}

export function saveToSlot(league, slotIndex, reason = "manual") {
  let cloned;
  try {
    cloned = structuredClone(league);
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
  const snapshot = JSON.parse(raw);
  if (![1, SAVE_VERSION].includes(snapshot.version) || !snapshot.league) {
    throw new Error(`Unsupported save format in slot ${slotIndex}.`);
  }
  const league = snapshot.league;
  // Validate minimum shape to guard against tampered/corrupted saves
  if (!Array.isArray(league.teams) || typeof league.currentSeason !== 'number') {
    throw new Error(`Save slot ${slotIndex} contains invalid data.`);
  }
  return migrateCareerProfiles(migrateTeamBranding(league));
}

export function deleteSlot(slotIndex) {
  localStorage.removeItem(slotKey(slotIndex));
}

export { MAX_SLOTS };
