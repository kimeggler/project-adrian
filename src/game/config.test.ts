import { describe, expect, it } from "vitest";
import { DIFFICULTY, difficultyFor, SWORD_UPGRADES, swordForLevel } from "./config";

describe("difficulty table (CB-7)", () => {
  const nonDecreasing = (key: keyof (typeof DIFFICULTY)[number]) => {
    for (let i = 1; i < DIFFICULTY.length; i++) {
      expect(DIFFICULTY[i][key], `${String(key)} at level ${i + 1}`).toBeGreaterThanOrEqual(DIFFICULTY[i - 1][key] as number);
    }
  };

  it("makes enemies stronger as the level rises", () => {
    for (const key of ["enemyChance", "walkerSpeed", "hpBonus", "damage", "projectileSpeed"] as const) nonDecreasing(key);
    for (let i = 1; i < DIFFICULTY.length; i++) {
      expect(DIFFICULTY[i].fireIntervalMs).toBeLessThanOrEqual(DIFFICULTY[i - 1].fireIntervalMs);
    }
  });

  it("keeps the terrain the same from level 6 on (existing seeds stay identical)", () => {
    const terrain = (level: number) => {
      const { flat, step, gap, spikes, obstacle, platform, maxGap, maxSpikes, coinChance } = difficultyFor(level);
      return { flat, step, gap, spikes, obstacle, platform, maxGap, maxSpikes, coinChance };
    };
    for (let level = 7; level <= 20; level++) expect(terrain(level)).toEqual(terrain(6));
  });

  it("introduces new enemy kinds gradually", () => {
    expect(difficultyFor(1).jumperWeight).toBe(0);
    expect(difficultyFor(1).shooterWeight).toBe(0);
    expect(difficultyFor(3).shooterWeight).toBeGreaterThan(0);
  });

  it("uses the last row beyond the table", () => {
    expect(difficultyFor(99)).toEqual(DIFFICULTY[DIFFICULTY.length - 1]);
  });
});

describe("sword upgrades (CB-5)", () => {
  it("only ever get better", () => {
    for (let i = 1; i < SWORD_UPGRADES.length; i++) {
      const [a, b] = [SWORD_UPGRADES[i - 1], SWORD_UPGRADES[i]];
      expect(b.fromLevel).toBeGreaterThan(a.fromLevel);
      expect(b.damage).toBeGreaterThanOrEqual(a.damage);
      expect(b.range).toBeGreaterThanOrEqual(a.range);
      expect(b.cooldownMs).toBeLessThanOrEqual(a.cooldownMs);
    }
  });

  it("picks the upgrade for a level", () => {
    expect(swordForLevel(1).swordLevel).toBe(1);
    expect(swordForLevel(2).swordLevel).toBe(1);
    expect(swordForLevel(3).swordLevel).toBe(2);
    expect(swordForLevel(100).swordLevel).toBe(SWORD_UPGRADES.length);
  });
});
