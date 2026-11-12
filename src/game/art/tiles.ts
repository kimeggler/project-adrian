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
