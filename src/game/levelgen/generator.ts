/**
 * Segment-based level generator (REQUIREMENTS_1.md §3.3).
 *
 * Pure TypeScript — no Phaser — so it can be unit-tested in Node.
 * Every random choice comes from a seeded Rng; the same (seed, level) always
 * produces the same level.
 */
import {
  difficultyFor,
  ENEMY,
  LEVELGEN,
  maxGapTiles,
  maxStepTiles,
  TILE,
  WORLD,
  type DifficultyRow,
} from "../config";
import type { EnemyKind, EnemySpawn, Level, Point } from "../levels/level";
import { TileId, type LevelData } from "../tiles";
import { checkReachability } from "./reachability";
import { hash32, Rng } from "./rng";

export interface GeneratedLevel {
  level: Level;
  /** How many times the level was regenerated (seed + n) to be beatable. */
  attempts: number;
  reachable: boolean;
}

const W = WORLD.LEVEL_WIDTH_TILES;
const H = WORLD.LEVEL_HEIGHT_TILES;
const SAFE = WORLD.SAFE_ZONE_TILES;

/** Row index of the top ground tile for a ground height `h`. */
const surfaceRow = (h: number) => H - h;

/**
 * Generate a beatable level. If the reachability check fails, retry with
 * seed + 1, seed + 2, … (deterministic, so the seed still identifies the level).
 */
export function generateLevel(seed: number, levelNumber: number): GeneratedLevel {
  const difficulty = difficultyFor(levelNumber);
  let level: Level | undefined;
  for (let attempt = 0; attempt < LEVELGEN.MAX_ATTEMPTS; attempt++) {
    level = buildLevel(levelSeed(seed + attempt, levelNumber), difficulty);
    if (checkReachability(level).reachable) {
      if (attempt > 0 && process.env.NODE_ENV === "development") {
        console.info(
          `[levelgen] seed ${seed} level ${levelNumber}: regenerated ${attempt}× to be beatable`,
        );
      }
      return { level, attempts: attempt, reachable: true };
    }
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(`[levelgen] seed ${seed} level ${levelNumber}: no beatable level found`);
  }
  return { level: level!, attempts: LEVELGEN.MAX_ATTEMPTS, reachable: false };
}

/** Mix seed and level number so each level of a run differs. */
function levelSeed(seed: number, levelNumber: number): number {
  return hash32(hash32(seed) ^ Math.imul(levelNumber, 0x27d4eb2d));
}

/** Intermediate layout: ground heights per column plus extras. */
interface Layout {
  ground: number[];
  blocks: Set<string>;
  spikeCols: number[];
  coins: [number, number][];
  checkpointCol: number;
}

/** Builds one level from a PRNG seed. Exported for tests. */
export function buildLevel(rngSeed: number, difficulty: DifficultyRow): Level {
  const layout = buildLayout(new Rng(rngSeed), difficulty);
  const level = toLevel(layout);
  // Enemies use their own random streams, so adding them didn't change the
  // terrain of any existing seed (phase 7), and choosing their kind didn't
  // change where they are (phase 9).
  level.enemies = placeEnemies(
    level,
    layout,
    new Rng(hash32(rngSeed ^ 0x5eede11e)),
    new Rng(hash32(rngSeed ^ 0x6b1d5a7e)),
    difficulty,
  );
  return level;
}

/**
 * Enemies stay on flat stretches of ground: no spikes, no obstacles, enough
 * headroom to jump over or onto them, and away from the spawn, flag and
 * checkpoint areas. They never leave their stretch, so they can't block a
 * path the reachability check relies on: the player can always jump over
 * a walker, or stomp it, on open flat ground.
 */
function placeEnemies(
  level: Level,
  layout: Layout,
  rng: Rng,
  kindRng: Rng,
  diff: DifficultyRow,
): EnemySpawn[] {
  const { ground, spikeCols, checkpointCol } = layout;
  const spikes = new Set(spikeCols);
  const free = (c: number) => {
    const g = ground[c];
    if (g <= 0 || spikes.has(c)) return false;
    if (c <= SAFE || c >= W - 1 - SAFE) return false;
    if (Math.abs(c - checkpointCol) <= ENEMY.CHECKPOINT_CLEARANCE) return false;
    for (let k = 1; k <= LEVELGEN.MIN_HEADROOM; k++) {
      if (level.data[surfaceRow(g) - k]?.[c] !== TileId.EMPTY) return false;
    }
    return true;
  };

  const enemies: EnemySpawn[] = [];
  let c = 1;
  while (c < W - 1) {
    if (!free(c)) {
      c++;
      continue;
    }
    // A run of free columns at the same ground height.
    let end = c;
    while (end + 1 < W - 1 && free(end + 1) && ground[end + 1] === ground[c]) end++;
    for (let s = c; s <= end; s += ENEMY.MAX_PATROL_TILES) {
      const e = Math.min(end, s + ENEMY.MAX_PATROL_TILES - 1);
      if (e - s + 1 < ENEMY.MIN_PATROL_TILES || !rng.chance(diff.enemyChance)) continue;
      const col = rng.int(s + 1, e - 1);
      const kind = kindRng.weighted<EnemyKind>({
        walker: diff.walkerWeight,
        jumper: diff.jumperWeight,
        shooter: diff.shooterWeight,
      });
      const baseHp = { walker: ENEMY.WALKER_HP, jumper: ENEMY.JUMPER_HP, shooter: ENEMY.SHOOTER_HP }[kind];
      enemies.push({
        kind,
        x: col * TILE + TILE / 2,
        y: surfaceRow(ground[col]) * TILE,
        minX: s * TILE,
        maxX: (e + 1) * TILE,
        speed: diff.walkerSpeed,
        hp: baseHp + diff.hpBonus,
        damage: diff.damage,
        fireIntervalMs: diff.fireIntervalMs,
        projectileSpeed: diff.projectileSpeed,
      });
    }
    c = end + 1;
  }
  return enemies;
}

function buildLayout(rng: Rng, diff: DifficultyRow): Layout {
  const ground: number[] = new Array(W).fill(0);
  const blocks = new Set<string>();
  const spikeCols: number[] = [];
  const coins: [number, number][] = [];
  let checkpointCol = -1;

  const maxStep = maxStepTiles();
  const gapCap = Math.max(1, Math.min(diff.maxGap, maxGapTiles()));
  const spikeCap = Math.max(1, Math.min(diff.maxSpikes, maxGapTiles() - 1));

  let x = 1; // column 0 is the left wall
  let h: number = LEVELGEN.START_GROUND;
  const endStart = W - 1 - SAFE; // first column of the flat flag area

  const put = (height: number) => {
    ground[x++] = height;
  };
  const addCoinRow = (from: number, to: number, row: number) => {
    for (let c = from; c <= to; c++) coins.push([c, row]);
  };
  /** Flat ground; sometimes with a row of coins above it. */
  const flat = (len: number, withCoins = true) => {
    const start = x;
    for (let i = 0; i < len; i++) put(h);
    if (withCoins && len >= 3 && rng.chance(diff.coinChance)) {
      addCoinRow(start + 1, start + len - 2, surfaceRow(h) - rng.int(1, 2));
    }
  };
  const fits = (len: number) => x + len <= endStart;

  // Spawn area (always flat and safe).
  for (let i = 0; i < SAFE; i++) put(h);

  while (x < endStart) {
    // Checkpoint: a guaranteed flat stretch at the middle of the level.
    if (checkpointCol < 0 && x >= W / 2 && fits(5)) {
      checkpointCol = x + 2;
      flat(5, false);
      continue;
    }

    const kind = rng.weighted({
      flat: diff.flat,
      step: diff.step,
      gap: diff.gap,
      spikes: diff.spikes,
      obstacle: diff.obstacle,
      platform: diff.platform,
    });

    switch (kind) {
      case "flat": {
        const len = rng.int(3, 6);
        if (!fits(len)) break;
        flat(len);
        continue;
      }

      case "step": {
        const up = Math.min(maxStep, LEVELGEN.MAX_GROUND - h);
        const down = Math.min(maxStep, h - LEVELGEN.MIN_GROUND);
        const len = rng.int(2, 4);
        if (up + down === 0 || !fits(len)) break;
        let delta = rng.int(-down, up);
        if (delta === 0) delta = up > 0 ? 1 : -1;
        h += delta;
        flat(len);
        continue;
      }

      case "gap": {
        let width = rng.int(1, gapCap);
        const delta = Math.max(
          LEVELGEN.MIN_GROUND - h,
          Math.min(LEVELGEN.MAX_GROUND - h, rng.int(-2, 1)),
        );
        // Jumping up costs distance: one tile less when landing higher.
        if (delta > 0) width = Math.max(1, Math.min(width, gapCap - 1));
        const landing = rng.int(3, 5);
        if (!fits(width + landing)) break;
        const takeoffRow = surfaceRow(Math.max(h, h + delta));
        const gapStart = x;
        for (let i = 0; i < width; i++) put(0);
        if (rng.chance(diff.coinChance)) {
          coins.push([gapStart + Math.floor(width / 2), takeoffRow - 3]);
        }
        h += delta;
        flat(landing, false);
        continue;
      }

      case "spikes": {
        const n = rng.int(1, spikeCap);
        if (!fits(2 + n + 3)) break;
        flat(2, false);
        for (let i = 0; i < n; i++) {
          spikeCols.push(x);
          put(h);
        }
        if (rng.chance(diff.coinChance)) {
          addCoinRow(x - n, x - 1, surfaceRow(h) - 3);
        }
        flat(3, false);
        continue;
      }

      case "obstacle": {
        const maxHeight = Math.min(maxStep, H - h - LEVELGEN.MIN_HEADROOM);
        const width = rng.int(1, 2);
        if (maxHeight < 1 || !fits(2 + width + 3)) break;
        const height = rng.int(1, maxHeight);
        flat(2, false);
        const top = surfaceRow(h) - height;
        for (let i = 0; i < width; i++) {
          for (let r = top; r < surfaceRow(h); r++) blocks.add(`${x},${r}`);
          if (rng.chance(diff.coinChance)) coins.push([x, top - 1]);
          put(h);
        }
        flat(3, false);
        continue;
      }

      case "platform": {
        // Floating platform over a pit: ground → platform → ground.
        const rise = rng.int(1, 2);
        const platformHeight = h + rise;
        if (H - platformHeight < LEVELGEN.MIN_HEADROOM + 1) break;
        const pw = rng.int(2, 3);
        const before = rng.int(1, Math.max(1, gapCap - (rise === 2 ? 1 : 0)));
        const after = rng.int(1, gapCap);
        const landing = rng.int(3, 5);
        if (!fits(before + pw + after + landing)) break;
        for (let i = 0; i < before; i++) put(0);
        const row = surfaceRow(platformHeight);
        for (let i = 0; i < pw; i++) {
          blocks.add(`${x},${row}`);
          if (rng.chance(diff.coinChance)) coins.push([x, row - 1]);
          put(0);
        }
        for (let i = 0; i < after; i++) put(0);
        flat(landing, false);
        continue;
      }
    }

    // The chosen segment didn't fit: fill with flat ground up to the end area.
    if (!fits(1)) break;
    flat(Math.min(3, endStart - x));
  }

  // Flag area (always flat and safe), then the right wall at W - 1.
  while (x < W - 1) put(h);

  // Fallback if the level was too short for the checkpoint loop.
  if (checkpointCol < 0) checkpointCol = SAFE - 2;

  return { ground, blocks, spikeCols, coins, checkpointCol };
}

function toLevel(layout: Layout): Level {
  const { ground, blocks, spikeCols, coins, checkpointCol } = layout;

  const data: LevelData = Array.from({ length: H }, () =>
    new Array<number>(W).fill(TileId.EMPTY),
  );
  for (let c = 1; c < W - 1; c++) {
    const g = ground[c];
    for (let i = 0; i < g; i++) {
      const r = H - 1 - i;
      data[r][c] = i === g - 1 ? TileId.GROUND_TOP : TileId.GROUND;
    }
  }
  for (const key of blocks) {
    const [c, r] = key.split(",").map(Number);
    data[r][c] = TileId.BLOCK;
  }
  for (let r = 0; r < H; r++) {
    data[r][0] = TileId.WALL;
    data[r][W - 1] = TileId.WALL;
  }

  const onGround = (c: number): Point => ({
    x: c * TILE + TILE / 2,
    y: (H - ground[c]) * TILE,
  });

  // Coins: skip any that ended up inside a tile, on a spike, or twice.
  const spikeSet = new Set(spikeCols);
  const seen = new Set<string>();
  const coinPoints: Point[] = [];
  for (const [c, r] of coins) {
    const key = `${c},${r}`;
    if (seen.has(key) || r < 1 || r >= H || data[r][c] !== TileId.EMPTY) continue;
    if (spikeSet.has(c) && r === H - ground[c] - 1) continue;
    seen.add(key);
    coinPoints.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
  }

  return {
    data,
    widthTiles: W,
    heightTiles: H,
    spawn: { x: 3 * TILE, y: (H - LEVELGEN.START_GROUND) * TILE },
    flag: onGround(W - 1 - WORLD.FLAG_TILES_FROM_END),
    spikes: spikeCols.map(onGround),
    checkpoints: [onGround(checkpointCol)],
    coins: coinPoints,
    enemies: [], // placed by placeEnemies()
  };
}
