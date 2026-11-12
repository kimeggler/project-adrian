import type * as Phaser from "phaser";
import { drawClouds, drawHills, drawMountains, drawSky, LAYER_WIDTH } from "./art/backgrounds";
import { paintSprite, spriteSize } from "./art/paint";
import {
  CHECKPOINT_OFF,
  CHECKPOINT_ON,
  COIN_FRAMES,
  DUST,
  FLAG,
  HEART_EMPTY,
  HEART_FULL,
  ICON_JUMP,
  ICON_LEFT,
  ICON_PAUSE,
  ICON_RIGHT,
  ICON_SWORD,
  KNIGHT_FRAMES,
  KNIGHT_SIZE,
  SLASH,
  SLIME_FRAMES,
  SPIKES,
  type Sprite,
} from "./art/sprites";
import { drawBlock, drawGround, drawGroundTop, drawWall } from "./art/tiles";
import { COIN, ENEMY, GAME_HEIGHT, TILE, TOUCH } from "./config";
import { TileId, TILESET_SIZE } from "./tiles";

export const TextureKey = {
  TILES: "tiles",
  PLAYER: "knight",
  SLIME: "slime",
  FLAG: "flag",
  CHECKPOINT_OFF: "checkpoint-off",
  CHECKPOINT_ON: "checkpoint-on",
  SPIKES: "spikes",
  HEART_FULL: "heart-full",
  HEART_EMPTY: "heart-empty",
  COIN: "coin",
  DUST: "dust",
  BG_SKY: "bg-sky",
  BG_CLOUDS: "bg-clouds",
  BG_MOUNTAINS: "bg-mountains",
  BG_HILLS: "bg-hills",
  BTN_LEFT: "btn-left",
  BTN_RIGHT: "btn-right",
  BTN_JUMP: "btn-jump",
  BTN_PAUSE: "btn-pause",
  BTN_ATTACK: "btn-attack",
  SLASH: "slash",
} as const;

export const AnimKey = {
  KNIGHT_IDLE: "knight-idle",
  KNIGHT_RUN: "knight-run",
  KNIGHT_JUMP: "knight-jump",
  KNIGHT_FALL: "knight-fall",
  KNIGHT_HURT: "knight-hurt",
  KNIGHT_ATTACK: "knight-attack",
  COIN_SPIN: "coin-spin",
  SLIME_WALK: "slime-walk",
} as const;

/** Frame index of the squashed slime in the slime sheet. */
export const SLIME_SQUASHED_FRAME = SLIME_FRAMES.walk.length;

/** Frame rates per animation (frames per second). */
const ANIM_FPS = { idle: 3, run: 12, coin: 8 } as const;

/** Draws every texture from the pixel-art data and registers animations. */
export function createTextures(scene: Phaser.Scene): void {
  createTileset(scene);
  createSheet(scene, TextureKey.PLAYER, Object.values(KNIGHT_FRAMES).flat(), KNIGHT_SIZE);
  createSheet(scene, TextureKey.COIN, COIN_FRAMES, COIN.SIZE);
  createSheet(scene, TextureKey.SLIME, [...SLIME_FRAMES.walk, ...SLIME_FRAMES.squashed], ENEMY.SIZE);
  for (const [key, sprite] of [
    [TextureKey.FLAG, FLAG],
    [TextureKey.CHECKPOINT_OFF, CHECKPOINT_OFF],
    [TextureKey.CHECKPOINT_ON, CHECKPOINT_ON],
    [TextureKey.SPIKES, SPIKES],
    [TextureKey.HEART_FULL, HEART_FULL],
    [TextureKey.HEART_EMPTY, HEART_EMPTY],
    [TextureKey.DUST, DUST],
    [TextureKey.SLASH, SLASH],
  ] as const) {
    createImage(scene, key, sprite);
  }
  createLayer(scene, TextureKey.BG_SKY, drawSky);
  createLayer(scene, TextureKey.BG_CLOUDS, drawClouds);
  createLayer(scene, TextureKey.BG_MOUNTAINS, drawMountains);
  createLayer(scene, TextureKey.BG_HILLS, drawHills);
  createButton(scene, TextureKey.BTN_LEFT, ICON_LEFT, TOUCH.BUTTON_SIZE);
  createButton(scene, TextureKey.BTN_RIGHT, ICON_RIGHT, TOUCH.BUTTON_SIZE);
  createButton(scene, TextureKey.BTN_JUMP, ICON_JUMP, TOUCH.BUTTON_SIZE);
  createButton(scene, TextureKey.BTN_PAUSE, ICON_PAUSE, TOUCH.PAUSE_SIZE);
  createButton(scene, TextureKey.BTN_ATTACK, ICON_SWORD, TOUCH.BUTTON_SIZE);
  createAnimations(scene);
}

function createImage(scene: Phaser.Scene, key: string, sprite: Sprite): void {
  const { width, height } = spriteSize(sprite);
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  paintSprite(tex.getContext(), sprite);
  tex.refresh();
}

/** A horizontal strip of equal frames, addressable by frame index. */
function createSheet(scene: Phaser.Scene, key: string, frames: readonly Sprite[], size: number): void {
  const tex = scene.textures.createCanvas(key, size * frames.length, size);
  if (!tex) return;
  const ctx = tex.getContext();
  frames.forEach((frame, i) => {
    paintSprite(ctx, frame, i * size, 0);
    tex.add(i, 0, i * size, 0, size, size);
  });
  tex.refresh();
}

/** Touch button: dark rounded square with a light frame and a centered icon. */
function createButton(scene: Phaser.Scene, key: string, icon: Sprite, size: number): void {
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = "#cbdbfc";
  ctx.fillRect(1, 0, size - 2, size);
  ctx.fillRect(0, 1, size, size - 2);
  ctx.fillStyle = "#222034";
  ctx.fillRect(2, 1, size - 4, size - 2);
  ctx.fillRect(1, 2, size - 2, size - 4);
  const { width, height } = spriteSize(icon);
  paintSprite(ctx, icon, Math.floor((size - width) / 2), Math.floor((size - height) / 2));
  tex.refresh();
}

function createTileset(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(TextureKey.TILES, TILE * TILESET_SIZE, TILE);
  if (!tex) return;
  const ctx = tex.getContext();
  drawGroundTop(ctx, TileId.GROUND_TOP * TILE);
  drawGround(ctx, TileId.GROUND * TILE);
  drawBlock(ctx, TileId.BLOCK * TILE);
  drawWall(ctx, TileId.WALL * TILE);
  tex.refresh();
}

function createLayer(
  scene: Phaser.Scene,
  key: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  const tex = scene.textures.createCanvas(key, LAYER_WIDTH, GAME_HEIGHT);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

function createAnimations(scene: Phaser.Scene): void {
  // Frame indices follow the order of KNIGHT_FRAMES.
  let index = 0;
  const range = (n: number) => {
    const frames = Array.from({ length: n }, (_, i) => ({ key: TextureKey.PLAYER, frame: index + i }));
    index += n;
    return frames;
  };
  const k = KNIGHT_FRAMES;
  scene.anims.create({ key: AnimKey.KNIGHT_IDLE, frames: range(k.idle.length), frameRate: ANIM_FPS.idle, repeat: -1 });
  scene.anims.create({ key: AnimKey.KNIGHT_RUN, frames: range(k.run.length), frameRate: ANIM_FPS.run, repeat: -1 });
  scene.anims.create({ key: AnimKey.KNIGHT_JUMP, frames: range(k.jump.length) });
  scene.anims.create({ key: AnimKey.KNIGHT_FALL, frames: range(k.fall.length) });
  scene.anims.create({ key: AnimKey.KNIGHT_HURT, frames: range(k.hurt.length) });
  scene.anims.create({ key: AnimKey.KNIGHT_ATTACK, frames: range(k.attack.length) });
  scene.anims.create({
    key: AnimKey.SLIME_WALK,
    frames: SLIME_FRAMES.walk.map((_, i) => ({ key: TextureKey.SLIME, frame: i })),
    frameRate: ENEMY.WALK_FPS,
    repeat: -1,
  });
  scene.anims.create({
    key: AnimKey.COIN_SPIN,
    frames: COIN_FRAMES.map((_, i) => ({ key: TextureKey.COIN, frame: i })),
    frameRate: ANIM_FPS.coin,
    repeat: -1,
  });
}
