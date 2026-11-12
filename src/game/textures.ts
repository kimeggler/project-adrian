import type * as Phaser from "phaser";
import { LAYER_WIDTH } from "./art/backgrounds";
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
  heroFrames,
  KNIGHT_SIZE,
  SLASH,
  AXE_SPIN_FRAMES,
  HOPPER_FRAMES,
  ITEM_AXE,
  ITEM_BOOTS,
  ITEM_SHIELD,
  ROCK,
  SLIME_FRAMES,
  SLIME_KING_FRAMES,
  BONUS_BLOCK_USED,
  TOTEM_FRAMES,
  SPIKES,
  type Sprite,
} from "./art/sprites";
import type { World } from "./worlds";
import { CHARACTERS, type CharacterId } from "./characters";
import { BOSS, COIN, ENEMY, GAME_HEIGHT, PLATFORM, POWERUP, TILE, TOUCH } from "./config";
import { TileId, TILESET_SIZE } from "./tiles";

export const TextureKey = {
  TILES: "tiles",
  SLIME: "slime",
  HOPPER: "hopper",
  TOTEM: "totem",
  ROCK: "rock",
  ITEM_BOOTS: "item-boots",
  ITEM_SHIELD: "item-shield",
  ITEM_AXE: "item-axe",
  AXE_SPIN: "axe-spin",
  SHIELD_BUBBLE: "shield-bubble",
  SLIME_KING: "slime-king",
  BONUS_BLOCK: "bonus-block",
  PLATFORM: "moving-platform",
  GATE: "gate",
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
  COIN_SPIN: "coin-spin",
  SLIME_WALK: "slime-walk",
  AXE_SPIN: "axe-spin",
  SLIME_KING_IDLE: "slime-king-idle",
} as const;

/** Frame index of the airborne Slime King in its sheet. */
export const SLIME_KING_AIR_FRAME = SLIME_KING_FRAMES.idle.length;

/** Frame index of the squashed slime in the slime sheet. */
export const SLIME_SQUASHED_FRAME = SLIME_FRAMES.walk.length;
/** Spritesheet of one hero (CB-9). */
export const heroTextureKey = (id: CharacterId) => `hero-${id}`;

export type HeroAnimState = "idle" | "run" | "jump" | "fall" | "hurt" | "attack";
/** Animation of one hero in one state, e.g. "hero-ranger-run". */
export const heroAnimKey = (id: CharacterId, state: HeroAnimState) => `hero-${id}-${state}`;

/** Frame indices in the hopper and totem sheets. */
export const HOPPER_FRAME = { CROUCH: 0, AIR: 1 } as const;
export const TOTEM_FRAME = { IDLE: 0, CHARGE: 1 } as const;

/** Frame rates per animation (frames per second). */
const ANIM_FPS = { idle: 3, run: 12, coin: 8 } as const;

/**
 * Draws every texture from the pixel-art data and registers animations.
 * Tiles and backgrounds come from the selected world skin.
 */
export function createTextures(scene: Phaser.Scene, world: World): void {
  createTileset(scene, world);
  for (const c of CHARACTERS) createHero(scene, c.id, heroFrames(c.look));
  createSheet(scene, TextureKey.COIN, COIN_FRAMES, COIN.SIZE);
  createSheet(scene, TextureKey.SLIME, [...SLIME_FRAMES.walk, ...SLIME_FRAMES.squashed], ENEMY.SIZE);
  createSheet(scene, TextureKey.HOPPER, [...HOPPER_FRAMES.crouch, ...HOPPER_FRAMES.air], ENEMY.SIZE);
  createSheet(scene, TextureKey.TOTEM, [...TOTEM_FRAMES.idle, ...TOTEM_FRAMES.charge], ENEMY.SIZE);
  createSheet(scene, TextureKey.AXE_SPIN, AXE_SPIN_FRAMES, POWERUP.ITEM_SIZE);
  createShieldBubble(scene);
  createSheet(scene, TextureKey.SLIME_KING, [...SLIME_KING_FRAMES.idle, ...SLIME_KING_FRAMES.air], BOSS.WIDTH, BOSS.HEIGHT);
  createPlatform(scene);
  createGate(scene);
  for (const [key, sprite] of [
    [TextureKey.FLAG, FLAG],
    [TextureKey.CHECKPOINT_OFF, CHECKPOINT_OFF],
    [TextureKey.CHECKPOINT_ON, CHECKPOINT_ON],
    [TextureKey.SPIKES, SPIKES],
    [TextureKey.HEART_FULL, HEART_FULL],
    [TextureKey.HEART_EMPTY, HEART_EMPTY],
    [TextureKey.DUST, DUST],
    [TextureKey.SLASH, SLASH],
    [TextureKey.ROCK, ROCK],
    [TextureKey.ITEM_BOOTS, ITEM_BOOTS],
    [TextureKey.ITEM_SHIELD, ITEM_SHIELD],
    [TextureKey.ITEM_AXE, ITEM_AXE],
    [TextureKey.BONUS_BLOCK, BONUS_BLOCK_USED],
  ] as const) {
    createImage(scene, key, sprite);
  }
  createLayer(scene, TextureKey.BG_SKY, world.layers.sky);
  createLayer(scene, TextureKey.BG_CLOUDS, world.layers.far);
  createLayer(scene, TextureKey.BG_MOUNTAINS, world.layers.mid);
  createLayer(scene, TextureKey.BG_HILLS, world.layers.near);
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
function createSheet(
  scene: Phaser.Scene,
  key: string,
  frames: readonly Sprite[],
  size: number,
  height: number = size,
): void {
  const tex = scene.textures.createCanvas(key, size * frames.length, height);
  if (!tex) return;
  const ctx = tex.getContext();
  frames.forEach((frame, i) => {
    paintSprite(ctx, frame, i * size, 0);
    tex.add(i, 0, i * size, 0, size, height);
  });
  tex.refresh();
}

/** Moving platform (WO-10): wooden planks on an iron frame, same in every world. */
function createPlatform(scene: Phaser.Scene): void {
  const w = PLATFORM.WIDTH;
  const h = PLATFORM.HEIGHT;
  const tex = scene.textures.createCanvas(TextureKey.PLATFORM, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  const fill = (color: string, x: number, y: number, fw: number, fh: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fw, fh);
  };
  fill("#222034", 0, 0, w, h);
  fill("#8f563b", 1, 1, w - 2, h - 3);
  fill("#d9a066", 1, 1, w - 2, 1);
  for (let x = 8; x < w - 1; x += 8) fill("#663931", x, 1, 1, h - 3);
  fill("#847e87", 0, h - 2, w, 2);
  for (const x of [2, w - 4]) fill("#cbdbfc", x, 3, 2, 2);
  tex.refresh();
}

/** Boss arena gate (CB-8): an iron portcullis tile, same in every world. */
function createGate(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(TextureKey.GATE, TILE, TILE);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = "#222034";
  for (const x of [1, 6, 11]) ctx.fillRect(x, 0, 4, TILE);
  ctx.fillRect(0, 6, TILE, 4);
  ctx.fillStyle = "#847e87";
  for (const x of [2, 7, 12]) ctx.fillRect(x, 0, 2, TILE);
  ctx.fillRect(0, 7, TILE, 2);
  ctx.fillStyle = "#cbdbfc";
  for (const x of [2, 7, 12]) ctx.fillRect(x, 7, 2, 2);
  tex.refresh();
}

/** Shield bubble around the knight: a light ring with a faint fill (22×22). */
function createShieldBubble(scene: Phaser.Scene): void {
  const size = 22;
  const tex = scene.textures.createCanvas(TextureKey.SHIELD_BUBBLE, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > c + 0.5) continue;
      if (d >= c - 0.5) ctx.fillStyle = "#cbdbfc";
      else if (d >= c - 1.5) ctx.fillStyle = "rgba(95, 205, 228, 0.7)";
      else ctx.fillStyle = "rgba(95, 205, 228, 0.18)";
      ctx.fillRect(x, y, 1, 1);
    }
  }
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

function createTileset(scene: Phaser.Scene, { tiles }: World): void {
  const tex = scene.textures.createCanvas(TextureKey.TILES, TILE * TILESET_SIZE, TILE);
  if (!tex) return;
  const ctx = tex.getContext();
  tiles.groundTop(ctx, TileId.GROUND_TOP * TILE);
  tiles.ground(ctx, TileId.GROUND * TILE);
  tiles.block(ctx, TileId.BLOCK * TILE);
  tiles.wall(ctx, TileId.WALL * TILE);
  tiles.breakable(ctx, TileId.BREAKABLE * TILE);
  // Frames, so single tiles can be shown as images (e.g. flying debris).
  for (let i = 0; i < TILESET_SIZE; i++) tex.add(i, 0, i * TILE, 0, TILE, TILE);
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

/** One hero's spritesheet and its animations (frame order = HeroFrames order). */
function createHero(scene: Phaser.Scene, id: CharacterId, frames: ReturnType<typeof heroFrames>): void {
  const key = heroTextureKey(id);
  createSheet(scene, key, Object.values(frames).flat(), KNIGHT_SIZE);
  let index = 0;
  const range = (n: number) => {
    const list = Array.from({ length: n }, (_, i) => ({ key, frame: index + i }));
    index += n;
    return list;
  };
  const anim = (state: HeroAnimState, extra: Partial<Phaser.Types.Animations.Animation> = {}) =>
    scene.anims.create({ key: heroAnimKey(id, state), frames: range(frames[state].length), ...extra });
  anim("idle", { frameRate: ANIM_FPS.idle, repeat: -1 });
  anim("run", { frameRate: ANIM_FPS.run, repeat: -1 });
  anim("jump");
  anim("fall");
  anim("hurt");
  anim("attack");
}

function createAnimations(scene: Phaser.Scene): void {
  scene.anims.create({
    key: AnimKey.SLIME_WALK,
    frames: SLIME_FRAMES.walk.map((_, i) => ({ key: TextureKey.SLIME, frame: i })),
    frameRate: ENEMY.WALK_FPS,
    repeat: -1,
  });
  scene.anims.create({
    key: AnimKey.SLIME_KING_IDLE,
    frames: SLIME_KING_FRAMES.idle.map((_, i) => ({ key: TextureKey.SLIME_KING, frame: i })),
    frameRate: 3,
    repeat: -1,
  });
  scene.anims.create({
    key: AnimKey.AXE_SPIN,
    frames: AXE_SPIN_FRAMES.map((_, i) => ({ key: TextureKey.AXE_SPIN, frame: i })),
    frameRate: POWERUP.AXE_SPIN_FPS,
    repeat: -1,
  });
  scene.anims.create({
    key: AnimKey.COIN_SPIN,
    frames: COIN_FRAMES.map((_, i) => ({ key: TextureKey.COIN, frame: i })),
    frameRate: ANIM_FPS.coin,
    repeat: -1,
  });
}
