import { TILE, WORLD } from "../config";
import { TileId, type LevelData } from "../tiles";

export interface Level {
  data: LevelData;
  widthTiles: number;
  heightTiles: number;
  /** Spawn position in px (bottom-center of the player). */
  spawn: { x: number; y: number };
}

/**
 * Handmade level for tuning the physics (phase 1).
 *
 * Each section tests one thing: step-ups of 1–3 tiles, drops, gaps of 2–4
 * tiles, a low ceiling for head bumps, a floating platform and a pillar.
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

  // Solid walls at both ends (WO-1).
  for (let y = 0; y < H; y++) {
    data[y][0] = TileId.WALL;
    data[y][W - 1] = TileId.WALL;
  }

  return {
    data,
    widthTiles: W,
    heightTiles: H,
    spawn: { x: 3 * TILE, y: (H - ground[3]) * TILE },
  };
}
