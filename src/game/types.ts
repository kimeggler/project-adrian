/** Data passed into GameScene when a level starts. */
export interface LevelStartData {
  /** 1-based level number. */
  level: number;
  /** Lives at the start of the level. Defaults to HEALTH.START_LIVES. */
  lives?: number;
}

/** Stats shown on the level-complete screen. */
export interface LevelResult {
  level: number;
  /** Time from level start to touching the flag, in ms (physics time). */
  timeMs: number;
  /** Coins collected. Coins and score arrive with phase 4. */
  coins: number;
  score: number;
}

/** What the HUD shows. */
export interface HudState {
  level: number;
  hearts: number;
  maxHearts: number;
  lives: number;
}
