import type * as Phaser from "phaser";
import { PLACEHOLDER_COLORS, PLAYER, TILE } from "./config";
import { TileId, TILESET_SIZE } from "./tiles";

export const TextureKey = {
  TILES: "tiles",
  PLAYER: "player",
} as const;

/**
 * Placeholder textures (colored rectangles) drawn at runtime.
 * Replaced by real pixel art in phase 5.
 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  createTileset(scene);
  createPlayerTexture(scene);
}

function createTileset(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(
    TextureKey.TILES,
    TILE * TILESET_SIZE,
    TILE,
  );
  if (!tex) return;
  const ctx = tex.getContext();

  const tile = (id: number, draw: (x: number) => void) => draw(id * TILE);

  tile(TileId.GROUND_TOP, (x) => {
    ctx.fillStyle = PLACEHOLDER_COLORS.GROUND;
    ctx.fillRect(x, 0, TILE, TILE);
    ctx.fillStyle = PLACEHOLDER_COLORS.GROUND_TOP;
    ctx.fillRect(x, 0, TILE, 4);
  });
  tile(TileId.GROUND, (x) => {
    ctx.fillStyle = PLACEHOLDER_COLORS.GROUND;
    ctx.fillRect(x, 0, TILE, TILE);
  });
  tile(TileId.BLOCK, (x) => {
    ctx.fillStyle = PLACEHOLDER_COLORS.BLOCK;
    ctx.fillRect(x, 0, TILE, TILE);
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(x + 0.5, 0.5, TILE - 1, TILE - 1);
  });
  tile(TileId.WALL, (x) => {
    ctx.fillStyle = PLACEHOLDER_COLORS.WALL;
    ctx.fillRect(x, 0, TILE, TILE);
  });

  tex.refresh();
}

function createPlayerTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(
    TextureKey.PLAYER,
    PLAYER.WIDTH,
    PLAYER.HEIGHT,
  );
  if (!tex) return;
  const ctx = tex.getContext();
  // White body so state colors can be applied with tint.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PLAYER.WIDTH, PLAYER.HEIGHT);
  // Eye on the right side to show facing direction.
  ctx.fillStyle = "#222034";
  ctx.fillRect(PLAYER.WIDTH - 4, 4, 2, 3);
  tex.refresh();
}
