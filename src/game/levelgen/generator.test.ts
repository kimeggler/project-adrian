import { describe, expect, it } from "vitest";
import {
  ENEMY,
  LEVELGEN,
  maxGapTiles,
  maxStepTiles,
  TILE,
  WORLD,
} from "../config";
import type { Level } from "../levels/level";
import { TileId } from "../tiles";
import { generateLevel } from "./generator";
import { checkReachability } from "./reachability";
import { nextSeed, parseSeed } from "./seed";

const SEED_COUNT = 1000;
/** Generating hundreds of levels takes a few seconds. */
const SLOW = 60_000;
const LEVELS = 6; // difficulty table rows

/** Seeds spread over the whole range, with level numbers 1–6 mixed in. */
const cases = Array.from({ length: SEED_COUNT }, (_, i) => ({
  seed: 1 + ((i * 7919) % LEVELGEN.MAX_RANDOM_SEED),
  level: (i % LEVELS) + 1,
}));

/** Ground height per column, read back from the tile data. */
function groundHeights(level: Level): number[] {
  const { data, widthTiles: w, heightTiles: h } = level;
  return Array.from({ length: w }, (_, c) => {
    let height = 0;
    for (let r = h - 1; r >= 0; r--) {
      const t = data[r][c];
      if (t === TileId.GROUND || t === TileId.GROUND_TOP) height++;
      else break;
    }
    return height;
  });
}

describe("level generator", () => {
  it(`produces a beatable level for all ${SEED_COUNT} seeds`, () => {
    const failures: string[] = [];
    let regenerated = 0;
    let maxAttempts = 0;
    for (const { seed, level } of cases) {
      const result = generateLevel(seed, level);
      if (!result.reachable) failures.push(`seed ${seed} level ${level}`);
      if (result.attempts > 0) regenerated++;
      maxAttempts = Math.max(maxAttempts, result.attempts);
    }
    console.info(
      `[levelgen] ${SEED_COUNT} seeds: ${regenerated} needed regeneration, most retries: ${maxAttempts}`,
    );
    expect(failures).toEqual([]);
    // Regeneration is a fallback, not the normal path.
    expect(regenerated / SEED_COUNT).toBeLessThan(0.2);
  }, 120_000);

  it("gives the same level for the same seed and level number", () => {
    for (const { seed, level } of cases.slice(0, 50)) {
      expect(generateLevel(seed, level)).toEqual(generateLevel(seed, level));
    }
  }, SLOW);

  it("gives different levels for different seeds", () => {
    const a = generateLevel(1234, 1).level.data;
    const b = generateLevel(1235, 1).level.data;
    expect(a).not.toEqual(b);
  });

  it("respects the physics-derived limits and safe zones", () => {
    const maxGap = maxGapTiles();
    const maxStep = maxStepTiles();
    const safe = WORLD.SAFE_ZONE_TILES;

    for (const { seed, level } of cases.slice(0, 200)) {
      const lvl = generateLevel(seed, level).level;
      const ground = groundHeights(lvl);
      const w = lvl.widthTiles;

      // Fixed size with walls at both ends.
      expect(w).toBe(WORLD.LEVEL_WIDTH_TILES);
      expect(lvl.heightTiles).toBe(WORLD.LEVEL_HEIGHT_TILES);
      for (let r = 0; r < lvl.heightTiles; r++) {
        expect(lvl.data[r][0]).toBe(TileId.WALL);
        expect(lvl.data[r][w - 1]).toBe(TileId.WALL);
      }

      // Spawn and flag areas: flat ground, no spikes.
      const spikeCols = new Set(lvl.spikes.map((s) => Math.floor(s.x / TILE)));
      for (const [from, to] of [
        [1, safe],
        [w - 1 - safe, w - 2],
      ]) {
        for (let c = from; c <= to; c++) {
          expect(ground[c]).toBe(ground[from]);
          expect(ground[c]).toBeGreaterThan(0);
          expect(spikeCols.has(c)).toBe(false);
        }
      }

      // Gaps no wider than the limit; ground steps no higher than the limit.
      // A floating platform tile counts as support and splits a pit in two.
      const hasPlatform = (c: number) =>
        lvl.data.some((row) => row[c] === TileId.BLOCK);
      let gap = 0;
      for (let c = 1; c < w - 1; c++) {
        if (ground[c] === 0 && hasPlatform(c)) {
          expect(gap).toBeLessThanOrEqual(maxGap);
          gap = 0;
          continue;
        }
        if (ground[c] === 0) {
          gap++;
          continue;
        }
        expect(gap).toBeLessThanOrEqual(maxGap);
        gap = 0;
        if (ground[c - 1] > 0) {
          expect(ground[c] - ground[c - 1]).toBeLessThanOrEqual(maxStep);
        }
        // Headroom above every ground surface.
        expect(lvl.heightTiles - ground[c]).toBeGreaterThanOrEqual(LEVELGEN.MIN_HEADROOM);
      }

      // Exactly one checkpoint, standing on ground.
      expect(lvl.checkpoints).toHaveLength(1);
      expect(ground[Math.floor(lvl.checkpoints[0].x / TILE)]).toBeGreaterThan(0);
    }
  }, SLOW);

  it("places walkers only on free, flat patrol areas", () => {
    const safe = WORLD.SAFE_ZONE_TILES;
    const perLevel: number[][] = Array.from({ length: LEVELS }, () => []);
    for (const { seed, level } of cases.slice(0, 300)) {
      const lvl = generateLevel(seed, level).level;
      const ground = groundHeights(lvl);
      const w = lvl.widthTiles;
      const spikeCols = new Set(lvl.spikes.map((s) => Math.floor(s.x / TILE)));
      const checkpointCol = Math.floor(lvl.checkpoints[0].x / TILE);
      perLevel[level - 1].push(lvl.enemies.length);

      for (const e of lvl.enemies) {
        const from = e.minX / TILE;
        const to = e.maxX / TILE - 1;
        expect(to - from + 1).toBeGreaterThanOrEqual(ENEMY.MIN_PATROL_TILES);
        expect(e.x).toBeGreaterThan(e.minX);
        expect(e.x).toBeLessThan(e.maxX);
        expect(from).toBeGreaterThan(safe);
        expect(to).toBeLessThan(w - 1 - safe);
        const row = e.y / TILE; // surface row the walker stands on
        for (let c = from; c <= to; c++) {
          expect(lvl.heightTiles - ground[c], `ground at ${c}`).toBe(row);
          expect(spikeCols.has(c)).toBe(false);
          expect(Math.abs(c - checkpointCol)).toBeGreaterThan(ENEMY.CHECKPOINT_CLEARANCE);
          for (let k = 1; k <= LEVELGEN.MIN_HEADROOM; k++) {
            expect(lvl.data[row - k][c]).toBe(TileId.EMPTY);
          }
        }
      }
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // Every level type has some enemies, and harder levels have more.
    expect(avg(perLevel[0])).toBeGreaterThan(0.5);
    expect(avg(perLevel[LEVELS - 1])).toBeGreaterThan(avg(perLevel[0]));
  }, SLOW);

  it("places coins in free space only", () => {
    for (const { seed, level } of cases.slice(0, 100)) {
      const lvl = generateLevel(seed, level).level;
      for (const coin of lvl.coins) {
        const c = Math.floor(coin.x / TILE);
        const r = Math.floor(coin.y / TILE);
        expect(lvl.data[r][c]).toBe(TileId.EMPTY);
      }
    }
  }, SLOW);
});

describe("reachability check", () => {
  /** Flat test level with one gap of `gapWidth` tiles in the middle. */
  function levelWithGap(gapWidth: number): Level {
    const w = 40;
    const h = WORLD.LEVEL_HEIGHT_TILES;
    const data = Array.from({ length: h }, () => new Array<number>(w).fill(TileId.EMPTY));
    for (let c = 0; c < w; c++) {
      const inGap = c >= 20 && c < 20 + gapWidth;
      if (c === 0 || c === w - 1) {
        for (let r = 0; r < h; r++) data[r][c] = TileId.WALL;
      } else if (!inGap) {
        data[h - 2][c] = TileId.GROUND_TOP;
        data[h - 1][c] = TileId.GROUND;
      }
    }
    const ground = (c: number) => ({ x: c * TILE + TILE / 2, y: (h - 2) * TILE });
    return {
      data,
      widthTiles: w,
      heightTiles: h,
      spawn: ground(3),
      flag: ground(w - 5),
      spikes: [],
      checkpoints: [],
      coins: [],
      enemies: [],
    };
  }

  it("accepts a gap the player can jump", () => {
    expect(checkReachability(levelWithGap(maxGapTiles())).reachable).toBe(true);
  });

  it("rejects a gap that is too wide", () => {
    expect(checkReachability(levelWithGap(6)).reachable).toBe(false);
  });

  it("rejects a path blocked by a wall of spikes", () => {
    const lvl = levelWithGap(0);
    lvl.spikes = [10, 11, 12, 13, 14, 15, 16].map((c) => ({
      x: c * TILE + TILE / 2,
      y: (lvl.heightTiles - 2) * TILE,
    }));
    expect(checkReachability(lvl).reachable).toBe(false);
  });
});

describe("seeds", () => {
  it("parses only plain non-negative integers", () => {
    expect(parseSeed("4821")).toBe(4821);
    expect(parseSeed("0")).toBe(0);
    expect(parseSeed("-1")).toBeUndefined();
    expect(parseSeed("12abc")).toBeUndefined();
    expect(parseSeed("99999999999")).toBeUndefined();
    expect(parseSeed(null)).toBeUndefined();
  });

  it("derives the next seed deterministically within range", () => {
    const s = nextSeed(4821);
    expect(nextSeed(4821)).toBe(s);
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(LEVELGEN.MAX_RANDOM_SEED);
    expect(s).not.toBe(4821);
  });
});
