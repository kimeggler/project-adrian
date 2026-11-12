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

/** Background color of the canvas (and letterbox). */
export const BACKGROUND_COLOR = "#5fcde4";
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
 * Difficulty per level number (1-based). Levels beyond the table use the
 * last row. All difficulty scaling lives here (CB-7 will add enemy columns).
 *
 * Weights are relative chances of picking each segment type.
 * `maxGap` / `maxSpikes` are further capped by the physics-derived limits.
 */
export interface DifficultyRow {
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
  /** Chance that a suitable flat stretch gets a walker enemy (CB-1). */
  enemyChance: number;
  /** Walker speed in px/s (CB-7). */
  walkerSpeed: number;
}

export const DIFFICULTY: readonly DifficultyRow[] = [
  { flat: 4, step: 3, gap: 2, spikes: 1, obstacle: 2, platform: 0, maxGap: 2, maxSpikes: 1, coinChance: 0.5, enemyChance: 0.15, walkerSpeed: 24 },
  { flat: 3, step: 3, gap: 3, spikes: 2, obstacle: 2, platform: 1, maxGap: 2, maxSpikes: 1, coinChance: 0.5, enemyChance: 0.25, walkerSpeed: 26 },
  { flat: 3, step: 3, gap: 3, spikes: 2, obstacle: 2, platform: 2, maxGap: 3, maxSpikes: 2, coinChance: 0.5, enemyChance: 0.35, walkerSpeed: 28 },
  { flat: 2, step: 3, gap: 4, spikes: 3, obstacle: 2, platform: 2, maxGap: 3, maxSpikes: 2, coinChance: 0.45, enemyChance: 0.4, walkerSpeed: 30 },
  { flat: 2, step: 3, gap: 4, spikes: 3, obstacle: 2, platform: 3, maxGap: 3, maxSpikes: 2, coinChance: 0.4, enemyChance: 0.45, walkerSpeed: 33 },
  { flat: 1, step: 3, gap: 5, spikes: 4, obstacle: 2, platform: 3, maxGap: 3, maxSpikes: 2, coinChance: 0.4, enemyChance: 0.5, walkerSpeed: 36 },
];

export function difficultyFor(level: number): DifficultyRow {
  const i = Math.min(Math.max(1, Math.floor(level)), DIFFICULTY.length) - 1;
  return DIFFICULTY[i];
}

// ---------------------------------------------------------------------------
// Coins and score (GP-3)
// ---------------------------------------------------------------------------

export const SCORE = {
  COIN_POINTS: 10,
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
  BACK: 1, // B / Circle
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
  /** Hearts lost when touching an enemy from the side or below. */
  CONTACT_DAMAGE: 1,
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

