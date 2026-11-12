/**
 * Local save in localStorage (PS-1, PS-2). Pure TypeScript, no Phaser, so
 * the landing page and the game share it.
 *
 * - Versioned schema; older versions are migrated, unknown/corrupt data is
 *   replaced field by field with defaults instead of crashing.
 * - Every storage access is wrapped in try/catch. Without storage (private
 *   mode, blocked cookies, SSR) the game keeps working from memory.
 */
import { AUDIO, JUICE } from "../config";

export const SAVE_KEY = "little-knight:save";
export const SAVE_VERSION = 1;

export interface Settings {
  /** 0–1 */
  sfxVolume: number;
  /** 0–1 (music arrives with AU-4) */
  musicVolume: number;
  muted: boolean;
  screenShake: boolean;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  settings: Settings;
  bestScore: number;
  /** Highest level number the player has reached. */
  highestLevel: number;
  /** For character select (P2). */
  unlockedCharacters: string[];
  /** For sword upgrades (P2). */
  weaponLevel: number;
}

/** Minimal Storage interface, so tests can pass a fake. */
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: {
      sfxVolume: AUDIO.SFX_VOLUME,
      musicVolume: AUDIO.MUSIC_VOLUME,
      muted: AUDIO.MUTED,
      screenShake: JUICE.SCREEN_SHAKE,
    },
    bestScore: 0,
    highestLevel: 0,
    unlockedCharacters: ["knight"],
    weaponLevel: 1,
  };
}

const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const int = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;

/** Turn anything (old version, partial or corrupt data) into a valid SaveData. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  // Future versions migrate here: if (r.version === 1) { ...convert to 2... }
  const s = (r.settings ?? {}) as Record<string, unknown>;
  return {
    version: SAVE_VERSION,
    settings: {
      sfxVolume: num(s.sfxVolume, d.settings.sfxVolume, 0, 1),
      musicVolume: num(s.musicVolume, d.settings.musicVolume, 0, 1),
      muted: bool(s.muted, d.settings.muted),
      screenShake: bool(s.screenShake, d.settings.screenShake),
    },
    bestScore: int(r.bestScore, d.bestScore),
    highestLevel: int(r.highestLevel, d.highestLevel),
    unlockedCharacters:
      Array.isArray(r.unlockedCharacters) &&
      r.unlockedCharacters.every((c) => typeof c === "string") &&
      r.unlockedCharacters.length > 0
        ? (r.unlockedCharacters as string[])
        : d.unlockedCharacters,
    weaponLevel: int(r.weaponLevel, d.weaponLevel) || d.weaponLevel,
  };
}

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined; // accessing localStorage itself can throw
  }
}

export function readSave(storage: StorageLike | undefined = browserStorage()): SaveData {
  try {
    const json = storage?.getItem(SAVE_KEY);
    return json ? sanitizeSave(JSON.parse(json)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

/** Returns false if the data could not be stored (it still lives in memory). */
export function writeSave(data: SaveData, storage: StorageLike | undefined = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // quota exceeded, storage disabled, …
  }
}

// ---------------------------------------------------------------------------
// In-memory copy shared by the game and the page (loaded on first use).
// ---------------------------------------------------------------------------

let current: SaveData | undefined;
const listeners = new Set<(data: SaveData) => void>();

export function getSave(): SaveData {
  current ??= readSave();
  return current;
}

export function getSettings(): Settings {
  return getSave().settings;
}

/** Change the save, persist it and notify subscribers. */
export function updateSave(change: (data: SaveData) => SaveData): SaveData {
  current = sanitizeSave(change(getSave()));
  writeSave(current);
  for (const listener of listeners) listener(current);
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  return updateSave((d) => ({ ...d, settings: { ...d.settings, ...patch } })).settings;
}

/** Record progress: keeps the best score, highest level and best sword reached. */
export function recordProgress({
  score,
  level,
  weaponLevel,
}: {
  score?: number;
  level?: number;
  weaponLevel?: number;
}): void {
  const d = getSave();
  const bestScore = Math.max(d.bestScore, score ?? 0);
  const highestLevel = Math.max(d.highestLevel, level ?? 0);
  const bestWeapon = Math.max(d.weaponLevel, weaponLevel ?? 0);
  if (bestScore === d.bestScore && highestLevel === d.highestLevel && bestWeapon === d.weaponLevel) return;
  updateSave((s) => ({ ...s, bestScore, highestLevel, weaponLevel: bestWeapon }));
}

/** Subscribe to save changes (e.g. the landing page). Returns an unsubscribe function. */
export function subscribeSave(listener: (data: SaveData) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forget the in-memory copy (tests, or reloading after another tab changed it). */
export function resetSaveCache(): void {
  current = undefined;
}
