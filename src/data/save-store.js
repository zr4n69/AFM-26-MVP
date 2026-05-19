import { readFile, writeFile } from "node:fs/promises";
import { recordAutosave } from "./actions.js";

const SAVE_VERSION = 1;

export function createSaveSnapshot(league, reason = "manual") {
  return {
    version: SAVE_VERSION,
    reason,
    savedAt: new Date().toISOString(),
    league: structuredClone(league)
  };
}

export async function saveGame(league, filePath, reason = "manual") {
  const snapshot = createSaveSnapshot(league, reason);
  await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  recordAutosave(league, "season", { reason, filePath });
  return snapshot;
}

export async function loadSave(filePath) {
  const raw = await readFile(filePath, "utf8");
  const snapshot = JSON.parse(raw);
  if (snapshot.version !== SAVE_VERSION || !snapshot.league) {
    throw new Error(`Unsupported save format in ${filePath}.`);
  }
  return snapshot.league;
}

export { SAVE_VERSION };
