import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultSave,
  getSave,
  readSave,
  recordProgress,
  resetSaveCache,
  SAVE_KEY,
  SAVE_VERSION,
  sanitizeSave,
  selectCharacter,
  writeSave,
  type StorageLike,
} from "./Save";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const throwing: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("local save", () => {
  it("returns defaults when nothing is stored", () => {
    expect(readSave(memoryStorage())).toEqual(defaultSave());
  });

  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const data = {
      ...defaultSave(),
      bestScore: 1234,
      highestLevel: 7,
      unlockedCharacters: ["knight" as const, "ranger" as const, "paladin" as const],
      character: "ranger" as const,
    };
    data.settings.muted = true;
    expect(writeSave(data, storage)).toBe(true);
    expect(readSave(storage)).toEqual(data);
  });

  it("keeps working when storage throws (PS-2)", () => {
    expect(readSave(throwing)).toEqual(defaultSave());
    expect(writeSave(defaultSave(), throwing)).toBe(false);
    expect(readSave(undefined)).toEqual(defaultSave());
    expect(writeSave(defaultSave(), undefined)).toBe(false);
  });

  it("ignores corrupt JSON", () => {
    expect(readSave(memoryStorage({ [SAVE_KEY]: "{not json" }))).toEqual(defaultSave());
  });

  it("repairs invalid fields one by one", () => {
    const fixed = sanitizeSave({
      version: 0,
      bestScore: -5,
      highestLevel: 3,
      settings: { sfxVolume: 7, musicVolume: "loud", muted: true },
      unlockedCharacters: [],
      weaponLevel: 2.5,
    });
    const d = defaultSave();
    expect(fixed.version).toBe(SAVE_VERSION);
    expect(fixed.bestScore).toBe(0);
    expect(fixed.highestLevel).toBe(3);
    expect(fixed.settings.sfxVolume).toBe(1); // clamped
    expect(fixed.settings.musicVolume).toBe(d.settings.musicVolume);
    expect(fixed.settings.muted).toBe(true);
    expect(fixed.settings.screenShake).toBe(d.settings.screenShake);
    // Level 3 reached: the ranger is unlocked even though the list was empty.
    expect(fixed.unlockedCharacters).toEqual(["knight", "ranger"]);
    expect(fixed.weaponLevel).toBe(d.weaponLevel);
  });

  it("keeps the picked hero only if it is a known, unlocked one (LP-5)", () => {
    expect(sanitizeSave({ highestLevel: 3, character: "ranger" }).character).toBe("ranger");
    expect(sanitizeSave({ highestLevel: 3, character: "paladin" }).character).toBe("knight");
    expect(sanitizeSave({ highestLevel: 9, character: "dragon" }).character).toBe("knight");
    expect(sanitizeSave({ unlockedCharacters: ["paladin", "dragon"] }).unlockedCharacters).toEqual([
      "knight",
      "paladin",
    ]);
  });
});

describe("hero unlocks (CB-9)", () => {
  beforeEach(() => resetSaveCache());

  it("reports heroes unlocked by reaching a level, once", () => {
    expect(recordProgress({ level: 2 })).toEqual([]);
    expect(recordProgress({ level: 3 })).toEqual(["ranger"]);
    expect(recordProgress({ level: 3 })).toEqual([]);
    expect(recordProgress({ level: 6 })).toEqual(["paladin"]);
    expect(getSave().unlockedCharacters).toEqual(["knight", "ranger", "paladin"]);
  });

  it("ignores picking a locked hero", () => {
    selectCharacter("paladin");
    expect(getSave().character).toBe("knight");
    recordProgress({ level: 6 });
    selectCharacter("paladin");
    expect(getSave().character).toBe("paladin");
  });
});
