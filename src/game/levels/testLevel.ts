import { PLATFORM, TILE, WORLD } from "../config";
import { TileId, type LevelData } from "../tiles";
import type { Level, Point } from "./level";

export type { Level } from "./level";

/**
 * Handmade level for tuning the physics (phase 1).
 *
 * Each section tests one thing: step-ups of 1–3 tiles, drops, gaps of 2–4
 * tiles, a low ceiling for head bumps, a floating platform and a pillar.
 * Phase 3 adds spikes and a checkpoint in the middle. Phase 12 adds a moving
 * platform over the 4-tile gap, a hidden block near the start and a
 * breakable obstacle before the power-ups.
 */
export function buildTestLevel(): Level {
  const H = WORLD.LEVEL_HEIGHT_TILES;
  const W = 96;

  // Ground height (in tiles) per column. 0 = pit.
  const ground: number[] = new Array(W).fill(2);
  const setGround = (from: number, to: number, h: number) => {
    for (let x = from; x <= to; x++) ground[x] = h;
  };

  setGround(11, 14, 3); // step +1
  setGround(15, 18, 4); // step +1
  setGround(19, 22, 5); // step +1
  setGround(23, 26, 2); // drop 3
  setGround(27, 30, 5); // step +3 (max step height)
  setGround(31, 34, 2); // drop
  setGround(35, 36, 0); // gap 2
  setGround(43, 45, 0); // gap 3 (max gap width)
  setGround(53, 56, 0); // gap 4 (harder than the generator allows)
  setGround(77, 78, 5); // pillar

  const data: LevelData = Array.from({ length: H }, () =>
    new Array(W).fill(TileId.EMPTY),
  );

  for (let x = 0; x < W; x++) {
    const h = ground[x];
    for (let i = 0; i < h; i++) {
      const y = H - 1 - i;
      data[y][x] = i === h - 1 ? TileId.GROUND_TOP : TileId.GROUND;
    }
  }

  // Low ceiling: 3 tiles of headroom above the floor, for head-bump tests.
  for (let x = 63; x <= 70; x++) {
    for (let y = 0; y <= 3; y++) data[y][x] = TileId.BLOCK;
  }

  // Floating platform, 3 tiles above the floor.
  for (let x = 72; x <= 74; x++) data[4][x] = TileId.BLOCK;

  // Breakable obstacle, 2 tiles high (WO-10).
  for (let y = H - 4; y <= H - 3; y++) data[y][80] = TileId.BREAKABLE;

  // Solid walls at both ends (WO-1).
  for (let y = 0; y < H; y++) {
    data[y][0] = TileId.WALL;
    data[y][W - 1] = TileId.WALL;
  }

  const flagCol = W - 1 - WORLD.FLAG_TILES_FROM_END;
  /** Bottom-center of a tile column, standing on the ground. */
  const onGround = (col: number): Point => ({
    x: col * TILE + TILE / 2,
    y: (H - ground[col]) * TILE,
  });

  return {
    data,
    widthTiles: W,
    heightTiles: H,
    spawn: { x: 3 * TILE, y: (H - ground[3]) * TILE },
    flag: onGround(flagCol),
    spikes: [39, 40, 60, 88].map(onGround),
    checkpoints: [onGround(49)],
    coins: [],
    // One of each power-up on the flat stretch before the flag.
    powerUps: [
      { kind: "boots" as const, x: 82 * TILE + TILE / 2, y: (H - 2) * TILE - 10 },
      { kind: "shield" as const, x: 84 * TILE + TILE / 2, y: (H - 2) * TILE - 10 },
      { kind: "axe" as const, x: 86 * TILE + TILE / 2, y: (H - 2) * TILE - 10 },
    ],
    // One walker under the low ceiling: tests stomping with little headroom.
    movingPlatforms: [
      { fromX: 53 * TILE, toX: 57 * TILE - PLATFORM.WIDTH, y: (H - 2) * TILE, leftLedgeCol: 52, rightLedgeCol: 57 },
    ],
    // Four tiles above the floor near the spawn: jump into it from below.
    hiddenBlocks: [{ c: 7, r: H - 2 - 4 }],
    enemies: [
      {
        kind: "walker",
        x: 66 * TILE + TILE / 2,
        y: (H - 2) * TILE,
        minX: 63 * TILE,
        maxX: 71 * TILE,
        speed: 28,
        hp: 2,
        damage: 1,
        fireIntervalMs: 0,
        projectileSpeed: 0,
      },
    ],
  };
}
