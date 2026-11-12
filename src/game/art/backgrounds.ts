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

/** One world's parallax layers, from the back (static) to the front. */
export interface LayerArt {
  sky: (ctx: Ctx) => void;
  far: (ctx: Ctx) => void;
  mid: (ctx: Ctx) => void;
  near: (ctx: Ctx) => void;
}

export const MEADOW_LAYERS: LayerArt = { sky: drawSky, far: drawClouds, mid: drawMountains, near: drawHills };

// ---------------------------------------------------------------------------
// Dungeon world
// ---------------------------------------------------------------------------

/** Darkness, getting a little lighter towards the floor. */
export function drawDungeonDark(ctx: Ctx): void {
  const bands = ["#0b0a12", "#110f1b", "#171524", "#1d1a2d", "#222034"];
  const bandH = Math.ceil(H / bands.length);
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * bandH, W, bandH);
    if (i === 0) return;
    for (let x = 0; x < W; x += 2) ctx.fillRect(x + ((i * bandH) % 2), i * bandH - 1, 1, 1);
  });
}

/** Distant arches: thin pillars every 64 px joined by round arches. */
export function drawDungeonArches(ctx: Ctx): void {
  const color = "#262338";
  const span = 64;
  const pillar = 8;
  const archY = 40;
  ctx.fillStyle = color;
  for (let i = 0; i < W / span; i++) {
    const x = i * span;
    ctx.fillRect(x, archY, pillar, H - archY);
    // Arch from this pillar to the next: the band between two half circles.
    const cx = x + pillar + (span - pillar) / 2;
    const r = (span - pillar) / 2;
    for (let dx = -r; dx < r; dx++) {
      const inner = Math.sqrt(Math.max(0, r * r - (dx + 0.5) ** 2));
      ctx.fillRect(Math.floor(cx + dx), Math.round(archY - inner), 1, 4);
    }
  }
}

/** Wall torches with a soft glow, and hanging chains (tiles every 128 px). */
export function drawDungeonTorches(ctx: Ctx): void {
  for (const tx of [40, 168]) {
    const ty = 72;
    // Dithered glow: a checkerboard of warm pixels around the flame.
    ctx.fillStyle = "rgba(223, 113, 38, 0.16)";
    for (let y = -18; y <= 18; y++) {
      for (let x = -18; x <= 18; x++) {
        if (x * x + y * y > 18 * 18 || (x + y) % 2 !== 0) continue;
        ctx.fillRect(tx + x, ty + y, 1, 1);
      }
    }
    ctx.fillStyle = "#595652";
    ctx.fillRect(tx - 1, ty + 2, 3, 7); // bracket
    ctx.fillStyle = "#df7126";
    ctx.fillRect(tx - 1, ty - 3, 3, 5); // flame
    ctx.fillRect(tx, ty - 5, 1, 2);
    ctx.fillStyle = "#fbf236";
    ctx.fillRect(tx, ty - 1, 1, 2);
  }
  for (const cx of [100, 228]) {
    for (let y = 0; y < 44; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? "#595652" : "#847e87";
      ctx.fillRect(cx + ((y / 2) % 2), y, 1, 2);
    }
  }
}

/** Big pillars and rubble close to the player (tiles every 128 px). */
export function drawDungeonPillars(ctx: Ctx): void {
  for (let x = 0; x < W; x++) {
    const top = Math.round(112 + wave(x, [[4, 4, 0.3], [2, 9, 1.7]]));
    ctx.fillStyle = "#2b2838";
    ctx.fillRect(x, top, 1, H - top);
  }
  for (const px0 of [70, 198]) {
    const w = 20;
    ctx.fillStyle = "#2b2838";
    ctx.fillRect(px0, 0, w, H);
    ctx.fillStyle = "#353147";
    ctx.fillRect(px0 + 2, 0, 3, H); // lit edge
    ctx.fillStyle = "#1d1a2d";
    for (let y = 6; y < H; y += 12) ctx.fillRect(px0, y, w, 1); // stone courses
    // Capital and base.
    ctx.fillStyle = "#353147";
    ctx.fillRect(px0 - 3, 20, w + 6, 4);
    ctx.fillRect(px0 - 3, 104, w + 6, 4);
  }
}

export const DUNGEON_LAYERS: LayerArt = {
  sky: drawDungeonDark,
  far: drawDungeonArches,
  mid: drawDungeonTorches,
  near: drawDungeonPillars,
};
