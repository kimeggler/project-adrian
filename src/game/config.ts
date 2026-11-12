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
  /** Placeholder sprite size (px). */
  WIDTH: 12,
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
// Placeholder palette (until phase 5 art)
// ---------------------------------------------------------------------------

export const PLACEHOLDER_COLORS = {
  GROUND_TOP: "#6abe30",
  GROUND: "#8f563b",
  BLOCK: "#9badb7",
  WALL: "#3f3f74",
  FLAG_POLE: "#cbdbfc",
  FLAG_CLOTH: "#d95763",
  PLAYER: {
    idle: "#d9a066",
    run: "#df7126",
    jump: "#fbf236",
    fall: "#99e550",
    hurt: "#ac3232",
  },
} as const;
