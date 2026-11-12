/** Data passed into GameScene when a level starts. */
export interface LevelStartData {
  /** 1-based level number. */
  level: number;
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
