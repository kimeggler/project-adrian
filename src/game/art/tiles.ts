/**
 * 16×16 level tiles, drawn with code (original work).
 * Details like pebbles use fixed positions, so tiles look the same every run.
 */
import { PALETTE } from "./sprites";

const T = 16;

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Pebbles and dark specks in the dirt (fixed layout that tiles seamlessly). */
function dirt(ctx: Ctx, ox: number, fromY: number): void {
  px(ctx, PALETTE.D, ox, fromY, T, T - fromY);
  const specks: [number, number][] = [[2, 6], [9, 9], [13, 5], [5, 13], [11, 14], [1, 10], [7, 3], [14, 11]];
  for (const [x, y] of specks) if (y >= fromY) px(ctx, PALETTE.d, ox + x, y, 2, 1);
  const pebbles: [number, number][] = [[4, 8], [12, 12], [8, 15]];
  for (const [x, y] of pebbles) if (y >= fromY) px(ctx, PALETTE.e, ox + x, y);
}

export function drawGroundTop(ctx: Ctx, ox: number): void {
  dirt(ctx, ox, 0);
  // Grass cap with an uneven bottom edge.
  const depth = [4, 5, 4, 3, 4, 5, 5, 4, 3, 4, 4, 5, 4, 3, 4, 5];
  for (let x = 0; x < T; x++) {
    px(ctx, PALETTE.G, ox + x, 0, 1, depth[x]);
    px(ctx, PALETTE.g, ox + x, depth[x] - 1);
  }
  // Highlights and little blades on top.
  for (const x of [1, 6, 10, 14]) px(ctx, PALETTE.l, ox + x, 0);
  for (const x of [3, 8, 12]) px(ctx, PALETTE.l, ox + x, 1);
}

export function drawGround(ctx: Ctx, ox: number): void {
  dirt(ctx, ox, 0);
}

/** Stone block with a bevel and rivets. */
export function drawBlock(ctx: Ctx, ox: number): void {
  px(ctx, PALETTE.O, ox, 0, T, T);
  px(ctx, PALETTE.H, ox + 1, 1, T - 2, T - 2);
  px(ctx, PALETTE.h, ox + 1, 1, T - 2, 1);
  px(ctx, PALETTE.h, ox + 1, 1, 1, T - 2);
  px(ctx, PALETTE.s, ox + 1, T - 2, T - 2, 1);
  px(ctx, PALETTE.s, ox + T - 2, 1, 1, T - 2);
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) {
    px(ctx, PALETTE.s, ox + x, y);
    px(ctx, PALETTE.h, ox + x - 1, y - 1);
  }
}

/** Dark castle bricks for the level walls. */
export function drawWall(ctx: Ctx, ox: number): void {
  px(ctx, PALETTE.O, ox, 0, T, T);
  const brick = (x: number, y: number, w: number) => {
    px(ctx, PALETTE.b, ox + x, y, w, 7);
    px(ctx, PALETTE.B, ox + x, y, w, 1);
  };
  brick(0, 0, 7);
  brick(8, 0, 8);
  brick(0, 8, 3);
  brick(4, 8, 8);
  brick(13, 8, 3);
}

/** Dark crack lines across a block, so breakable blocks stand out (WO-10). */
function cracks(ctx: Ctx, ox: number, color: string): void {
  const lines: [number, number][][] = [
    [[4, 2], [5, 3], [5, 4], [6, 5], [7, 6], [7, 7], [8, 8]],
    [[8, 8], [9, 9], [11, 9], [12, 10], [13, 11]],
    [[8, 8], [7, 9], [7, 10], [6, 11], [5, 12], [5, 13]],
    [[10, 3], [10, 4], [11, 5]],
  ];
  for (const line of lines) for (const [x, y] of line) px(ctx, color, ox + x, y);
}

export function drawBreakableBlock(ctx: Ctx, ox: number): void {
  drawBlock(ctx, ox);
  cracks(ctx, ox, PALETTE.O);
}

/** One world's tiles (same slots as TileId). */
export interface TileArt {
  groundTop: (ctx: Ctx, ox: number) => void;
  ground: (ctx: Ctx, ox: number) => void;
  block: (ctx: Ctx, ox: number) => void;
  wall: (ctx: Ctx, ox: number) => void;
  breakable: (ctx: Ctx, ox: number) => void;
}

export const MEADOW_TILES: TileArt = {
  groundTop: drawGroundTop,
  ground: drawGround,
  block: drawBlock,
  wall: drawWall,
  breakable: drawBreakableBlock,
};

// ---------------------------------------------------------------------------
// Dungeon world
// ---------------------------------------------------------------------------

const DUNGEON = {
  mortar: "#222034",
  stone: "#45444f",
  stoneLight: "#595652",
  edge: "#847e87",
  edgeLight: "#9badb7",
  moss: "#4b692f",
  mossLight: "#6abe30",
  brick: "#45283c",
  brickLight: "#76428a",
  wood: "#8f563b",
  woodDark: "#663931",
  iron: "#847e87",
} as const;

/** Offset stone bricks with dark mortar (rows of 8 px, tiles seamlessly). */
function stoneBricks(ctx: Ctx, ox: number, color: string): void {
  px(ctx, color, ox, 0, T, T);
  px(ctx, DUNGEON.mortar, ox, 7, T, 1);
  px(ctx, DUNGEON.mortar, ox, 15, T, 1);
  px(ctx, DUNGEON.mortar, ox + 5, 0, 1, 7);
  px(ctx, DUNGEON.mortar, ox + 12, 8, 1, 7);
  // Cracks and chips at fixed spots.
  for (const [x, y] of [[9, 3], [10, 4], [2, 11], [14, 2], [7, 12]]) px(ctx, DUNGEON.mortar, ox + x, y);
}

/** Worn flagstone floor with moss on the walking edge. */
export function drawDungeonFloor(ctx: Ctx, ox: number): void {
  stoneBricks(ctx, ox, DUNGEON.stoneLight);
  px(ctx, DUNGEON.edge, ox, 0, T, 2);
  for (const x of [1, 4, 8, 11, 15]) px(ctx, DUNGEON.edgeLight, ox + x, 0);
  // Moss creeping over the edge.
  for (const [x, len] of [[2, 2], [3, 3], [9, 1], [10, 2], [13, 2]]) {
    px(ctx, DUNGEON.moss, ox + x, 0, 1, len);
  }
  px(ctx, DUNGEON.mossLight, ox + 3, 0);
  px(ctx, DUNGEON.mossLight, ox + 10, 0);
}

export function drawDungeonStone(ctx: Ctx, ox: number): void {
  stoneBricks(ctx, ox, DUNGEON.stone);
}

/** Iron-bound wooden crate. */
export function drawCrate(ctx: Ctx, ox: number): void {
  px(ctx, DUNGEON.mortar, ox, 0, T, T);
  px(ctx, DUNGEON.wood, ox + 1, 1, T - 2, T - 2);
  for (const y of [5, 10]) px(ctx, DUNGEON.woodDark, ox + 1, y, T - 2, 1);
  // Diagonal brace.
  for (let i = 2; i < T - 2; i++) px(ctx, DUNGEON.woodDark, ox + i, T - 1 - i);
  // Iron corners with rivets.
  for (const [x, y] of [[1, 1], [12, 1], [1, 12], [12, 12]]) {
    px(ctx, DUNGEON.iron, ox + x, y, 3, 3);
    px(ctx, DUNGEON.mortar, ox + x + 1, y + 1);
  }
}

/** Purple-grey dungeon bricks for the level walls. */
export function drawDungeonWall(ctx: Ctx, ox: number): void {
  px(ctx, DUNGEON.mortar, ox, 0, T, T);
  const brick = (x: number, y: number, w: number) => {
    px(ctx, DUNGEON.brick, ox + x, y, w, 7);
    px(ctx, DUNGEON.brickLight, ox + x, y, w, 1);
  };
  brick(0, 0, 7);
  brick(8, 0, 8);
  brick(0, 8, 3);
  brick(4, 8, 8);
  brick(13, 8, 3);
}

/** A cracked, rotten crate. */
export function drawBrokenCrate(ctx: Ctx, ox: number): void {
  drawCrate(ctx, ox);
  cracks(ctx, ox, DUNGEON.mortar);
}

export const DUNGEON_TILES: TileArt = {
  groundTop: drawDungeonFloor,
  ground: drawDungeonStone,
  block: drawCrate,
  wall: drawDungeonWall,
  breakable: drawBrokenCrate,
};
