import { describe, expect, it } from "vitest";
import { defaultSave, readSave, SAVE_KEY, SAVE_VERSION, sanitizeSave, writeSave, type StorageLike } from "./Save";

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
    const data = { ...defaultSave(), bestScore: 1234, highestLevel: 7 };
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
    expect(fixed.unlockedCharacters).toEqual(d.unlockedCharacters);
    expect(fixed.weaponLevel).toBe(d.weaponLevel);
  });
});
