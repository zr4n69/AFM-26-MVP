const SAVE_VERSION = 1;
const MAX_SLOTS = 3;
const STORAGE_PREFIX = "afm26_save_slot_";

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

export function saveToSlot(league, slotIndex, reason = "manual") {
  const snapshot = {
    version: SAVE_VERSION,
    reason,
    savedAt: new Date().toISOString(),
    league: structuredClone(league)
  };
  try {
    localStorage.setItem(slotKey(slotIndex), JSON.stringify(snapshot));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Save failed: storage quota exceeded. Try deleting another save slot.');
    }
    throw e;
  }
  return snapshot;
}

export function loadFromSlot(slotIndex) {
  const raw = localStorage.getItem(slotKey(slotIndex));
  if (!raw) throw new Error(`Save slot ${slotIndex} is empty.`);
  const snapshot = JSON.parse(raw);
  if (snapshot.version !== SAVE_VERSION || !snapshot.league) {
    throw new Error(`Unsupported save format in slot ${slotIndex}.`);
  }
  const league = snapshot.league;
  // Validate minimum shape to guard against tampered/corrupted saves
  if (!Array.isArray(league.teams) || typeof league.currentSeason !== 'number') {
    throw new Error(`Save slot ${slotIndex} contains invalid data.`);
  }
  return league;
}

export function deleteSlot(slotIndex) {
  localStorage.removeItem(slotKey(slotIndex));
}

export { MAX_SLOTS };
