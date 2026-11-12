/**
 * All tunable values for Little Knight live here.
 * Do not hard-code gameplay numbers elsewhere — import them from this file.
 */

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** Size of one tile in pixels. */
export const TILE = 16;

/** Internal (unscaled) resolution: 16×9 tiles. */
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 144;

export const LETTERBOX_COLOR = "#000000";

// ---------------------------------------------------------------------------
// Physics (see REQUIREMENTS_1.md §2.3)
// ---------------------------------------------------------------------------

export const PHYSICS = {
  /** Fixed physics step rate. Same behavior on 60/120/144 Hz displays. */
  FPS: 60,
  GRAVITY: 900, // px/s²
  RUN_SPEED: 90, // px/s
  ACCELERATION: 600, // px/s² (ground)
  /** Deceleration when no direction is held (ground). */
  DECELERATION: 900, // px/s²
  AIR_CONTROL: 0.8, // multiplier on acceleration/deceleration in the air
  JUMP_VELOCITY: -330, // px/s
  JUMP_CUT_FACTOR: 0.5, // vy multiplier when jump is released early
  MAX_FALL_SPEED: 400, // px/s
  COYOTE_TIME_MS: 100,
  JUMP_BUFFER_MS: 120,
} as const;

// ---------------------------------------------------------------------------
// Derived physics limits — the level generator must use these, never
// hand-written numbers, so physics tweaks can't make levels unbeatable.
// ---------------------------------------------------------------------------

/** Max jump height in px: v² / (2g). */
export const maxJumpHeight = (): number =>
  (PHYSICS.JUMP_VELOCITY * PHYSICS.JUMP_VELOCITY) / (2 * PHYSICS.GRAVITY);

/** Horizontal distance of a full jump landing at the same height, in px. */
export const maxJumpDistance = (): number =>
  ((2 * -PHYSICS.JUMP_VELOCITY) / PHYSICS.GRAVITY) * PHYSICS.RUN_SPEED;

/** Max step-up height in tiles (≈ 3 with the default constants). */
export const maxStepTiles = (): number =>
  Math.floor((maxJumpHeight() / TILE) * 0.8);

/** Max gap width in tiles (≈ 3 with the default constants). */
export const maxGapTiles = (): number =>
  Math.floor((maxJumpDistance() / TILE) * 0.75);

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export const PLAYER = {
  /** Sprite frame size (px). */
  WIDTH: 16,
  HEIGHT: 16,
  /** Physics hitbox (px), bottom-centered in the sprite. */
  HITBOX_WIDTH: 10,
  HITBOX_HEIGHT: 14,
  /** Below this |vx| the player counts as standing still. */
  IDLE_THRESHOLD: 5,
} as const;

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

export const CAMERA = {
  /** Deadzone size in px: the player can move this far before the camera scrolls. */
  DEADZONE_WIDTH: 32,
  DEADZONE_HEIGHT: GAME_HEIGHT,
} as const;

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export const WORLD = {
  /** Default generated level size in tiles. */
  LEVEL_WIDTH_TILES: 200,
  LEVEL_HEIGHT_TILES: 9,
  /** Falling this far below the level counts as falling into a pit (px). */
  PIT_MARGIN: 32,
  /** Flat, safe area at the start (spawn) and end (flag) of a level, in tiles. */
  SAFE_ZONE_TILES: 8,
  /** Flag position, counted in tiles from the right end wall. */
  FLAG_TILES_FROM_END: 4,
} as const;

// ---------------------------------------------------------------------------
// Level generator (REQUIREMENTS_1.md §3.3)
// Gap and step limits are NOT here: they are derived from PHYSICS above
// (maxGapTiles / maxStepTiles) so physics changes can't break levels.
// ---------------------------------------------------------------------------

export const LEVELGEN = {
  /** Ground height range in tiles (from the bottom of the level). */
  MIN_GROUND: 1,
  MAX_GROUND: 5,
  /** Ground height of the spawn and flag areas. */
  START_GROUND: 2,
  /** Free tiles required above any surface the player can land on. */
  MIN_HEADROOM: 3,
  /** Retry with seed + n up to this many times if a level is unbeatable. */
  MAX_ATTEMPTS: 20,
  /** Seeds picked at random are in [1, MAX_RANDOM_SEED]. */
  MAX_RANDOM_SEED: 999_999,
} as const;

/**
 * Difficulty per level number (1-based), CB-7. ALL difficulty scaling lives
 * here: terrain columns and enemy columns, merged into one row per level.
 * Levels beyond the table use the last row.
 *
 * Terrain weights are relative chances of picking each segment type;
 * `maxGap` / `maxSpikes` are further capped by the physics-derived limits.
 * Terrain stops changing after level 6 (levels 7+ reuse that row), so the
 * terrain of every existing seed stays the same; enemies keep getting harder.
 */
export interface TerrainDifficulty {
  flat: number;
  step: number;
  gap: number;
  spikes: number;
  obstacle: number;
  platform: number;
  /** Widest gap in tiles (before the physics cap). */
  maxGap: number;
  /** Most spikes in a row. */
  maxSpikes: number;
  /** Chance that a flat stretch gets a row of coins. */
  coinChance: number;
  /**
   * WO-10, each decided on its own random stream so the terrain above stays
   * the same: chance that a floating-platform crossing becomes a moving
   * platform, chance that an obstacle is made of breakable blocks, and how
   * many hidden bonus blocks the level gets.
   */
  movingChance: number;
  breakableChance: number;
  hiddenBlocks: number;
}

export interface EnemyDifficulty {
  /** Chance that a suitable flat stretch gets an enemy (density). */
  enemyChance: number;
  /** Relative chances of each enemy kind (CB-4). */
  walkerWeight: number;
  jumperWeight: number;
  shooterWeight: number;
  /** Walker and jumper walking speed (px/s). */
  walkerSpeed: number;
  /** Extra hit points on top of each kind's base HP. */
  hpBonus: number;
  /** Hearts lost on contact or when hit by a projectile (attack power). */
  damage: number;
  /** Shooter: time between shots (ms), and projectile speed (px/s). */
  fireIntervalMs: number;
  projectileSpeed: number;
  /** Power-up items placed in the level (CB-6). */
  powerUps: number;
}

export type DifficultyRow = TerrainDifficulty & EnemyDifficulty;

// prettier-ignore
const TERRAIN_BY_LEVEL: readonly TerrainDifficulty[] = [
  { flat: 4, step: 3, gap: 2, spikes: 1, obstacle: 2, platform: 0, maxGap: 2, maxSpikes: 1, coinChance: 0.5, movingChance: 0, breakableChance: 0.3, hiddenBlocks: 1 },
  { flat: 3, step: 3, gap: 3, spikes: 2, obstacle: 2, platform: 1, maxGap: 2, maxSpikes: 1, coinChance: 0.5, movingChance: 0.4, breakableChance: 0.4, hiddenBlocks: 1 },
  { flat: 3, step: 3, gap: 3, spikes: 2, obstacle: 2, platform: 2, maxGap: 3, maxSpikes: 2, coinChance: 0.5, movingChance: 0.45, breakableChance: 0.5, hiddenBlocks: 2 },
  { flat: 2, step: 3, gap: 4, spikes: 3, obstacle: 2, platform: 2, maxGap: 3, maxSpikes: 2, coinChance: 0.45, movingChance: 0.5, breakableChance: 0.5, hiddenBlocks: 2 },
  { flat: 2, step: 3, gap: 4, spikes: 3, obstacle: 2, platform: 3, maxGap: 3, maxSpikes: 2, coinChance: 0.4, movingChance: 0.5, breakableChance: 0.5, hiddenBlocks: 2 },
  { flat: 1, step: 3, gap: 5, spikes: 4, obstacle: 2, platform: 3, maxGap: 3, maxSpikes: 2, coinChance: 0.4, movingChance: 0.6, breakableChance: 0.6, hiddenBlocks: 2 },
];

// prettier-ignore
const ENEMIES_BY_LEVEL: readonly EnemyDifficulty[] = [
  { enemyChance: 0.15, walkerWeight: 1, jumperWeight: 0, shooterWeight: 0, walkerSpeed: 24, hpBonus: 0, damage: 1, fireIntervalMs: 2600, projectileSpeed: 70, powerUps: 1 },
  { enemyChance: 0.25, walkerWeight: 4, jumperWeight: 1, shooterWeight: 0, walkerSpeed: 26, hpBonus: 0, damage: 1, fireIntervalMs: 2600, projectileSpeed: 70, powerUps: 1 },
  { enemyChance: 0.35, walkerWeight: 4, jumperWeight: 1, shooterWeight: 1, walkerSpeed: 28, hpBonus: 0, damage: 1, fireIntervalMs: 2400, projectileSpeed: 75, powerUps: 1 },
  { enemyChance: 0.4, walkerWeight: 4, jumperWeight: 2, shooterWeight: 1, walkerSpeed: 30, hpBonus: 0, damage: 1, fireIntervalMs: 2200, projectileSpeed: 80, powerUps: 1 },
  { enemyChance: 0.45, walkerWeight: 4, jumperWeight: 2, shooterWeight: 2, walkerSpeed: 33, hpBonus: 1, damage: 1, fireIntervalMs: 2000, projectileSpeed: 85, powerUps: 2 },
  { enemyChance: 0.5, walkerWeight: 3, jumperWeight: 2, shooterWeight: 2, walkerSpeed: 36, hpBonus: 1, damage: 1, fireIntervalMs: 1800, projectileSpeed: 90, powerUps: 2 },
  { enemyChance: 0.52, walkerWeight: 3, jumperWeight: 3, shooterWeight: 2, walkerSpeed: 38, hpBonus: 1, damage: 2, fireIntervalMs: 1700, projectileSpeed: 95, powerUps: 2 },
  { enemyChance: 0.55, walkerWeight: 3, jumperWeight: 3, shooterWeight: 3, walkerSpeed: 40, hpBonus: 2, damage: 2, fireIntervalMs: 1600, projectileSpeed: 100, powerUps: 2 },
  { enemyChance: 0.57, walkerWeight: 3, jumperWeight: 3, shooterWeight: 3, walkerSpeed: 42, hpBonus: 2, damage: 2, fireIntervalMs: 1500, projectileSpeed: 105, powerUps: 2 },
  { enemyChance: 0.6, walkerWeight: 3, jumperWeight: 3, shooterWeight: 3, walkerSpeed: 45, hpBonus: 3, damage: 2, fireIntervalMs: 1400, projectileSpeed: 110, powerUps: 2 },
];

/** The difficulty table: one merged row per level. */
export const DIFFICULTY: readonly DifficultyRow[] = ENEMIES_BY_LEVEL.map((enemies, i) => ({
  ...TERRAIN_BY_LEVEL[Math.min(i, TERRAIN_BY_LEVEL.length - 1)],
  ...enemies,
}));

export function difficultyFor(level: number): DifficultyRow {
  const i = Math.min(Math.max(1, Math.floor(level)), DIFFICULTY.length) - 1;
  return DIFFICULTY[i];
}

// ---------------------------------------------------------------------------
// Coins and score (GP-3)
// ---------------------------------------------------------------------------

export const SCORE = {
  COIN_POINTS: 10,
  /** Breaking a breakable block, revealing a hidden block, beating a boss. */
  BLOCK_POINTS: 10,
  HIDDEN_BLOCK_POINTS: 100,
  BOSS_POINTS: 1000,
  /** Points for stomping an enemy. */
  ENEMY_POINTS: 50,
  /** Time bonus when finishing instantly; falls linearly to 0 at par time. */
  TIME_BONUS_MAX: 500,
  /** Par time = level width / run speed × this factor. */
  PAR_TIME_FACTOR: 2,
} as const;

export const COIN = {
  SIZE: 8,
  HITBOX: 6,
} as const;

// ---------------------------------------------------------------------------
// Health, damage and respawn (GP-1)
// ---------------------------------------------------------------------------

export const HEALTH = {
  HEARTS_PER_LIFE: 3,
  START_LIVES: 3,
  /** Hearts lost when touching spikes. Pits always cost a whole life. */
  SPIKE_DAMAGE: 1,
  /** Invincibility after taking damage or respawning (ms). */
  INVINCIBLE_MS: 1000,
  /** Blink period of the invincibility flash (ms). */
  BLINK_MS: 80,
  /** Controls are locked for this long after a hit (ms). */
  HURT_STUN_MS: 250,
  KNOCKBACK_VX: 80, // px/s, away from the hazard
  KNOCKBACK_VY: -200, // px/s
  /** Pause between losing a life and respawning (ms). */
  RESPAWN_DELAY_MS: 700,
} as const;

// ---------------------------------------------------------------------------
// Game feel / "juice" (GF-1 … GF-4)
// ---------------------------------------------------------------------------

export const JUICE = {
  /** Dust puffs when landing / when braking to turn around (GF-1). */
  DUST_LAND: 6,
  DUST_TURN: 3,
  /** Landing faster than this (px/s) makes dust and a squash. */
  MIN_LAND_SPEED: 150,
  /** Braking faster than this (px/s) to turn around makes dust. */
  MIN_TURN_SPEED: 40,
  /** Screen shake when hit (GF-2). Becomes a setting in phase 6. */
  SCREEN_SHAKE: true,
  SHAKE_MS: 150,
  SHAKE_INTENSITY: 0.02,
  /**
   * Squash and stretch (GF-3), as sprite scale. Chosen so the 16×16 knight
   * becomes whole-pixel sizes (14 or 18 px) and stays crisp.
   */
  STRETCH: { x: 14 / 16, y: 18 / 16 },
  SQUASH: { x: 18 / 16, y: 14 / 16 },
  SQUASH_MS: 120,
  /** White flash when hit (GF-4). */
  HIT_FLASH_MS: 80,
} as const;

// ---------------------------------------------------------------------------
// Audio (§2.4) — defaults; phase 6 makes them settings
// ---------------------------------------------------------------------------

export const AUDIO = {
  SFX_VOLUME: 0.8,
  MUSIC_VOLUME: 0.6,
  MUTED: false,
} as const;

// ---------------------------------------------------------------------------
// Touch controls (PL-7) and gamepad (PL-8)
// ---------------------------------------------------------------------------

export const TOUCH = {
  /** Move and jump buttons (px, game resolution). */
  BUTTON_SIZE: 22,
  PAUSE_SIZE: 14,
  MARGIN: 6,
  GAP: 4,
  /** Extra invisible area around each button so it's easy to hit (px). */
  HIT_PADDING: 6,
  ALPHA: 0.5,
  PRESSED_ALPHA: 0.9,
} as const;

export const GAMEPAD = {
  /** Standard gamepad mapping button indices. */
  JUMP: 0, // A / Cross
  /** B / Circle: attack during play (PL-9), back in menus. */
  ATTACK: 1,
  BACK: 1,
  START: 9,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  STICK_DEADZONE: 0.35,
} as const;

// ---------------------------------------------------------------------------
// Enemies (CB-1, CB-3, CB-4) — Phase 7: walker
// ---------------------------------------------------------------------------

export const ENEMY = {
  /** Sprite frame size (px). */
  SIZE: 16,
  /** Walker hitbox (px), bottom-centered. */
  HITBOX_WIDTH: 12,
  HITBOX_HEIGHT: 9,
  /**
   * A stomp counts if the player is falling and their feet were at most
   * this far below the enemy's top on the previous physics step (px).
   */
  STOMP_TOLERANCE: 4,
  /** Player bounce after a stomp (px/s); holding jump bounces higher. */
  STOMP_BOUNCE: -200,
  STOMP_BOUNCE_HELD: -300,
  /** Enemy knockback when it hits the player (CB-3). */
  KNOCKBACK_VX: 70,
  KNOCKBACK_MS: 300,
  /** How long the squashed enemy stays visible (ms). */
  SQUASHED_MS: 400,
  /** Placement: shortest flat stretch a walker patrols (tiles). */
  MIN_PATROL_TILES: 5,
  /** Longer stretches are split into patrol areas of at most this size. */
  MAX_PATROL_TILES: 10,
  /** Keep this many tiles free around the checkpoint. */
  CHECKPOINT_CLEARANCE: 3,
  /** Walk animation speed (frames per second). */
  WALK_FPS: 4,
  /** Base hit points per kind; the difficulty table adds `hpBonus` (CB-7). */
  WALKER_HP: 2,
  JUMPER_HP: 2,
  SHOOTER_HP: 3,
  /** White flash when hit (ms). */
  HIT_FLASH_MS: 80,
} as const;

// ---------------------------------------------------------------------------
// Sword (PL-9, CB-2) — Phase 8
// ---------------------------------------------------------------------------

/** Sword basics (damage, reach and speed come from SWORD_UPGRADES). */
export const SWORD = {
  HEIGHT: 10,
  /** Hitbox top, measured down from the top of the player's body (px). */
  OFFSET_Y: 2,
  /** How long the hitbox is active per swing (ms, ≈ 7 frames). */
  ACTIVE_MS: 120,
  /** Enemy knockback from a sword hit (px/s). */
  ENEMY_KNOCKBACK_VX: 110,
} as const;

export const JUMPER = {
  HITBOX_WIDTH: 12,
  HITBOX_HEIGHT: 10,
  /** Hop strength (px/s, ≈ 35 px high) and pause between hops (ms). */
  JUMP_VELOCITY: -250,
  JUMP_INTERVAL_MS: 900,
} as const;

export const SHOOTER = {
  HITBOX_WIDTH: 12,
  HITBOX_HEIGHT: 12,
  /** Only shoots when the player is this close horizontally (px)… */
  RANGE_X: 150,
  /** …and at roughly the same height (px). */
  RANGE_Y: 40,
  /** Glows before each shot so the player can react (ms). */
  CHARGE_MS: 400,
  /** Projectile start: in front of the mouth, this far above the feet (px). */
  MOUTH_Y: 6,
} as const;

export const PROJECTILE = {
  SIZE: 6,
  HITBOX: 4,
  /** Disappears after flying this far (px). */
  MAX_DISTANCE: 220,
} as const;

/**
 * Sword upgrades by level number (CB-5). The sword gets the last row whose
 * `fromLevel` the current level has reached. `label` is shown when it starts.
 */
export interface SwordStats {
  fromLevel: number;
  damage: number;
  /** Hitbox length in front of the player (px). */
  range: number;
  cooldownMs: number;
  label: string;
}

export const SWORD_UPGRADES: readonly SwordStats[] = [
  { fromLevel: 1, damage: 1, range: 14, cooldownMs: 350, label: "Sword" },
  { fromLevel: 3, damage: 1, range: 18, cooldownMs: 350, label: "Longer reach" },
  { fromLevel: 5, damage: 2, range: 18, cooldownMs: 280, label: "Double damage, faster swings" },
  { fromLevel: 8, damage: 2, range: 22, cooldownMs: 250, label: "Longest reach" },
];

/** Sword stats and upgrade level (1-based) for a level number. */
export function swordForLevel(level: number): SwordStats & { swordLevel: number } {
  let index = 0;
  SWORD_UPGRADES.forEach((row, i) => {
    if (level >= row.fromLevel) index = i;
  });
  return { ...SWORD_UPGRADES[index], swordLevel: index + 1 };
}

// ---------------------------------------------------------------------------
// Power-ups and temporary weapons (CB-6) — Phase 10
// ---------------------------------------------------------------------------

export type PowerUpKind = "boots" | "shield" | "axe";

export const POWERUP = {
  /** Icon and effect blink during the last part of a power-up (ms). */
  WARNING_MS: 2000,
  BLINK_MS: 150,
  DURATION_MS: { boots: 10000, shield: 8000, axe: 12000 } satisfies Record<PowerUpKind, number>,
  /** Speed boots: run speed multiplier. */
  BOOTS_SPEED: 1.4,
  /** Throwing axe (temporary weapon, replaces the sword while active). */
  AXE_THROW_VX: 160,
  AXE_THROW_VY: -200,
  AXE_COOLDOWN_MS: 400,
  AXE_DAMAGE: 2,
  AXE_HITBOX: 8,
  AXE_SPIN_FPS: 16,
  /** Items: size, float height above the ground and bobbing (px). */
  ITEM_SIZE: 8,
  ITEM_HEIGHT: 10,
  ITEM_BOB: 2,
  /** Shield push on enemies that touch the knight (px/s). */
  SHIELD_KNOCKBACK_VX: 120,
} as const;

export const SPIKES = {
  /** Hitbox (px), bottom-centered in the 16×16 tile. Smaller than the art, to be fair. */
  HITBOX_WIDTH: 12,
  HITBOX_HEIGHT: 6,
} as const;

export const CHECKPOINT = {
  WIDTH: 16,
  HEIGHT: 32,
  HITBOX_WIDTH: 10,
} as const;

export const FLAG = {
  /** Placeholder sprite size (px): pole plus pennant. */
  WIDTH: 16,
  HEIGHT: 48,
  /** Overlap hitbox around the pole (px). */
  HITBOX_WIDTH: 6,
} as const;

// ---------------------------------------------------------------------------
// UI (in-game screens)
// ---------------------------------------------------------------------------

export const UI = {
  TEXT: {
    fontFamily: "monospace",
    fontSize: "8px",
    color: "#ffffff",
  },
  ACCENT: "#fbf236",
  BUTTON_BG: "#3f3f74",
  /** Opacity of the dark overlay behind menus. */
  OVERLAY_ALPHA: 0.6,
  /** Ignore keys for this long after a menu opens (ms). */
  INPUT_DELAY_MS: 300,
} as const;


// ---------------------------------------------------------------------------
// World variety (WO-10): moving platforms, breakable and hidden blocks
// ---------------------------------------------------------------------------

export const PLATFORM = {
  /** Size of a moving platform (px). Its top is level with the ground. */
  WIDTH: 32,
  HEIGHT: 8,
  SPEED: 40,
  /** Rest at each end so the player can step on and off (ms). */
  PAUSE_MS: 700,
} as const;

export const BLOCKS = {
  /** Hidden blocks hang this many tiles above the ground (bump them from below). */
  HIDDEN_ROWS_ABOVE: 4,
  /** Flat, free ground needed on each side of a hidden block (tiles). */
  HIDDEN_CLEARANCE: 2,
} as const;

// ---------------------------------------------------------------------------
// Boss (CB-8)
// ---------------------------------------------------------------------------

export const BOSS = {
  /** A boss arena ends every Nth level. */
  EVERY: 5,
  /** Arena width in tiles, gates included. */
  ARENA_TILES: 14,
  /** Flat ground before the arena, with a checkpoint in the middle (tiles). */
  LOBBY_TILES: 3,
  /** The arena gate closes once the player is this far inside (tiles). */
  CLOSE_AFTER_TILES: 2,
  /** Arena ground height (tiles from the bottom). */
  GROUND: 2,
  /** Sprite frame and hitbox (px). */
  WIDTH: 32,
  HEIGHT: 24,
  HITBOX_WIDTH: 26,
  HITBOX_HEIGHT: 20,
  /** Hit points: BASE_HP at the first boss, + HP_PER_BOSS for each later one. */
  BASE_HP: 8,
  HP_PER_BOSS: 4,
  /** Can't be hurt again for this long after a hit (ms). */
  INVULNERABLE_MS: 600,
  /** Rest between moves (ms); shorter once below half HP. */
  REST_MS: 800,
  REST_MS_ENRAGED: 450,
  /** Small hop towards the player. */
  HOP_VX: 70,
  HOP_VY: -180,
  /** Every LEAP_EVERY-th move is a big leap at the player that ends in a slam. */
  LEAP_EVERY: 3,
  LEAP_VY: -320,
  LEAP_MAX_VX: 120,
  /** Shockwaves sent along the floor by a slam (px/s); faster when enraged. */
  SHOCKWAVE_SPEED: 90,
  SHOCKWAVE_SPEED_ENRAGED: 120,
  /** Knockback when the player stomps it or hits it with the sword (px/s). */
  KNOCKBACK_VX: 60,
} as const;

/** Is level `n` a boss level? */
export const isBossLevel = (n: number): boolean => n > 0 && n % BOSS.EVERY === 0;

/** Boss hit points on level `n`. */
export const bossHp = (n: number): number =>
  BOSS.BASE_HP + (Math.max(1, Math.floor(n / BOSS.EVERY)) - 1) * BOSS.HP_PER_BOSS;
