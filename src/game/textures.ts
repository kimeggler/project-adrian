import type * as Phaser from "phaser";
import { CHECKPOINT, FLAG, PLACEHOLDER_COLORS, PLAYER, TILE } from "./config";
import { TileId, TILESET_SIZE } from "./tiles";

export const TextureKey = {
  TILES: "tiles",
  PLAYER: "player",
  FLAG: "flag",
  CHECKPOINT_OFF: "checkpoint-off",
  CHECKPOINT_ON: "checkpoint-on",
  SPIKES: "spikes",
  HEART_FULL: "heart-full",
  HEART_EMPTY: "heart-empty",
} as const;

/**
 * Placeholder textures (colored rectangles) drawn at runtime.
 * Replaced by real pixel art in phase 5.
 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  createTileset(scene);
  createPlayerTexture(scene);
  createFlagTexture(scene);
  createCheckpointTexture(scene, TextureKey.CHECKPOINT_OFF, PLACEHOLDER_COLORS.CHECKPOINT_OFF);
  createCheckpointTexture(scene, TextureKey.CHECKPOINT_ON, PLACEHOLDER_COLORS.CHECKPOINT_ON);
  createSpikeTexture(scene);
  createHeartTexture(scene, TextureKey.HEART_FULL, PLACEHOLDER_COLORS.HEART);
  createHeartTexture(scene, TextureKey.HEART_EMPTY, PLACEHOLDER_COLORS.HEART_EMPTY);
}

/** Draw a pixel pattern: one string per row, "#" = filled. */
function drawPattern(
  ctx: CanvasRenderingContext2D,
  pattern: string[],
  color: string,
  ox = 0,
  oy = 0,
): void {
  ctx.fillStyle = color;
  pattern.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === "#") ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
}

function createCheckpointTexture(scene: Phaser.Scene, key: string, cloth: string): void {
  const tex = scene.textures.createCanvas(key, CHECKPOINT.WIDTH, CHECKPOINT.HEIGHT);
  if (!tex) return;
  const ctx = tex.getContext();
  const poleX = 4;
  ctx.fillStyle = PLACEHOLDER_COLORS.FLAG_POLE;
  ctx.fillRect(poleX, 1, 2, CHECKPOINT.HEIGHT - 1);
  ctx.fillStyle = cloth;
  ctx.fillRect(poleX + 2, 2, 8, 6);
  tex.refresh();
}

function createSpikeTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(TextureKey.SPIKES, TILE, TILE);
  if (!tex) return;
  const ctx = tex.getContext();
  // Two spikes in the bottom half of the tile.
  const spike = [
    "   #   ",
    "   #   ",
    "  ###  ",
    "  ###  ",
    " ##### ",
    " ##### ",
    "#######",
    "#######",
  ];
  drawPattern(ctx, spike, PLACEHOLDER_COLORS.SPIKE, 0, 8);
  drawPattern(ctx, spike, PLACEHOLDER_COLORS.SPIKE, 8, 8);
  ctx.fillStyle = PLACEHOLDER_COLORS.SPIKE_SHADE;
  ctx.fillRect(0, 15, TILE, 1);
  tex.refresh();
}

function createHeartTexture(scene: Phaser.Scene, key: string, color: string): void {
  const tex = scene.textures.createCanvas(key, 7, 6);
  if (!tex) return;
  drawPattern(
    tex.getContext(),
    [" ## ## ", "#######", "#######", " ##### ", "  ###  ", "   #   "],
    color,
  );
  tex.refresh();
}

function createFlagTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(TextureKey.FLAG, FLAG.WIDTH, FLAG.HEIGHT);
  if (!tex) return;
  const ctx = tex.getContext();
  const poleX = (FLAG.WIDTH - 2) / 2;
  // Pole with a knob on top.
  ctx.fillStyle = PLACEHOLDER_COLORS.FLAG_POLE;
  ctx.fillRect(poleX, 2, 2, FLAG.HEIGHT - 2);
  ctx.fillRect(poleX - 1, 0, 4, 3);
  // Pennant pointing right.
  ctx.fillStyle = PLACEHOLDER_COLORS.FLAG_CLOTH;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(poleX + 2, 4 + i, 6 - i, 1);
    ctx.fillRect(poleX + 2, 15 - i, 6 - i, 1);
  }
  tex.refresh();
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
