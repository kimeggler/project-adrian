/**
 * Parallax background layers (WO-9), drawn with code (original work).
 * Each layer is LAYER_WIDTH wide and repeats seamlessly: all wave periods
 * divide the width.
 */
import { GAME_HEIGHT } from "../config";

export const LAYER_WIDTH = 256;
const W = LAYER_WIDTH;
const H = GAME_HEIGHT;

type Ctx = CanvasRenderingContext2D;

/** Sum of sines whose periods divide the layer width, so it tiles. */
function wave(x: number, parts: [amp: number, periods: number, phase: number][]): number {
  return parts.reduce(
    (sum, [amp, periods, phase]) => sum + amp * Math.sin((x / W) * Math.PI * 2 * periods + phase),
    0,
  );
}

/** Sky: horizontal color bands with a dithered edge between them. */
export function drawSky(ctx: Ctx): void {
  const bands = ["#3f8fd6", "#4fa6e0", "#5fcde4", "#8fdcea", "#cbdbfc"];
  const bandH = Math.ceil(H / bands.length);
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * bandH, W, bandH);
    if (i === 0) return;
    // Checkerboard dither on the row above the band.
    for (let x = 0; x < W; x += 2) {
      ctx.fillRect(x + ((i * bandH) % 2), i * bandH - 1, 1, 1);
    }
  });
}

/** Small puffy clouds. */
export function drawClouds(ctx: Ctx): void {
  const clouds: [x: number, y: number, w: number][] = [[20, 18, 28], [110, 30, 20], [180, 12, 34]];
  for (const [x, y, w] of clouds) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y + 3, w, 5);
    ctx.fillRect(x + 4, y, w - 12, 4);
    ctx.fillRect(x + w / 2, y - 2, w / 3, 3);
    ctx.fillStyle = "#cbdbfc";
    ctx.fillRect(x + 1, y + 7, w - 2, 1);
  }
}

/** Distant blue mountains with snow caps. */
export function drawMountains(ctx: Ctx): void {
  for (let x = 0; x < W; x++) {
    const top = Math.round(
      78 + wave(x, [[14, 2, 0.4], [7, 5, 1.3], [3, 11, 2.1]]),
    );
    ctx.fillStyle = "#639bff";
    ctx.fillRect(x, top, 1, H - top);
    ctx.fillStyle = "#5b6ee1";
    ctx.fillRect(x, top + 10, 1, H - top - 10);
    if (top < 74) {
      ctx.fillStyle = "#cbdbfc";
      ctx.fillRect(x, top, 1, Math.min(4, 74 - top));
    }
  }
}

/** Closer green hills with a row of round trees. */
export function drawHills(ctx: Ctx): void {
  for (let x = 0; x < W; x++) {
    const top = Math.round(104 + wave(x, [[6, 3, 0.9], [3, 7, 0.2]]));
    ctx.fillStyle = "#37946e";
    ctx.fillRect(x, top, 1, H - top);
    ctx.fillStyle = "#306082";
    ctx.fillRect(x, top + 14, 1, H - top - 14);
  }
  // Trees: a dark round crown on a short trunk, spaced to tile.
  for (let i = 0; i < 8; i++) {
    const x = i * 32 + ((i * 13) % 11);
    const base = Math.round(104 + wave(x, [[6, 3, 0.9], [3, 7, 0.2]]));
    ctx.fillStyle = "#663931";
    ctx.fillRect(x + 3, base - 4, 2, 5);
    ctx.fillStyle = "#4b692f";
    ctx.fillRect(x, base - 12, 8, 8);
    ctx.fillRect(x + 1, base - 13, 6, 10);
    ctx.fillStyle = "#6abe30";
    ctx.fillRect(x + 2, base - 11, 2, 2);
  }
}
