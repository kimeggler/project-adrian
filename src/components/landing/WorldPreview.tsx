"use client";

import { useEffect, useRef } from "react";
import { LAYER_WIDTH } from "@/game/art/backgrounds";
import { GAME_HEIGHT, TILE } from "@/game/config";
import type { World } from "@/game/worlds";

/** Preview size in game pixels (shown at 2×). */
const W = 96;
const H = 72;
/** Which rows of the background layers to show (where the scenery is). */
const LAYER_Y = 56;
const SCALE = 2;

/**
 * A small scene of one world, drawn with the game's own tile and background
 * code: background layers, a wall, a floating block and the ground.
 */
export default function WorldPreview({ world }: { world: World }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const layers = document.createElement("canvas");
    layers.width = LAYER_WIDTH;
    layers.height = GAME_HEIGHT;
    const lctx = layers.getContext("2d");
    if (!lctx) return;
    const { sky, far, mid, near } = world.layers;
    for (const draw of [sky, far, mid, near]) draw(lctx);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(layers, 0, LAYER_Y, W, H, 0, 0, W, H);

    const { tiles } = world;
    const groundY = H - TILE;
    // Tile functions draw at (ox, 0); move the origin for each tile.
    const tile = (draw: (c: CanvasRenderingContext2D, ox: number) => void, x: number, y: number) => {
      ctx.save();
      ctx.translate(x, y);
      draw(ctx, 0);
      ctx.restore();
    };
    for (let y = 0; y < groundY; y += TILE) tile(tiles.wall, 0, y);
    for (let x = 0; x < W; x += TILE) tile(x === 0 ? tiles.ground : tiles.groundTop, x, groundY);
    tile(tiles.block, 56, 20);
    tile(tiles.breakable, 72, 20);
  }, [world]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ width: W * SCALE, height: H * SCALE, imageRendering: "pixelated" }}
      aria-hidden
    />
  );
}
