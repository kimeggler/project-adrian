/** Data passed into GameScene when a level starts. */
export interface LevelStartData {
  /** 1-based level number (sets the difficulty). */
  level: number;
  /** Seed of this level. With `level`, it reproduces the level exactly. */
  seed: number;
  /** Lives at the start of the level. Defaults to HEALTH.START_LIVES. */
  lives?: number;
  /** Total score carried over from earlier levels. */
  score?: number;
  /** Play the handmade physics test level instead (?testlevel). */
  testLevel?: boolean;
}

/** Stats shown on the level-complete screen. */
export interface LevelResult {
  level: number;
  seed: number;
  /** Time from level start to touching the flag, in ms (physics time). */
  timeMs: number;
  /** Coins collected in this level, and how many there were. */
  coins: number;
  coinsTotal: number;
  timeBonus: number;
  /** Run total, including this level's coins and time bonus. */
  score: number;
}

/** What the HUD shows. */
export interface HudState {
  level: number;
  seed: number;
  hearts: number;
  maxHearts: number;
  lives: number;
  coins: number;
  score: number;
}
