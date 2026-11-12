import type { LevelData } from "../tiles";

/** A point in px. For objects standing on the ground: bottom-center. */
export interface Point {
  x: number;
  y: number;
}

/** An enemy and the stretch of ground it patrols (CB-1, CB-4). */
export interface EnemySpawn {
  kind: "walker";
  /** Start position: bottom-center, standing on the ground (px). */
  x: number;
  y: number;
  /** Patrol bounds (px): the enemy turns around when its body reaches them. */
  minX: number;
  maxX: number;
  /** Walking speed (px/s), from the difficulty table. */
  speed: number;
}

/** Everything GameScene needs to build a level. */
export interface Level {
  data: LevelData;
  widthTiles: number;
  heightTiles: number;
  spawn: Point;
  /** Level-end flag (WO-4). */
  flag: Point;
  /** Spikes, one per tile (WO-7). */
  spikes: Point[];
  /** Checkpoint flags; the player respawns at the last one touched (WO-8). */
  checkpoints: Point[];
  /** Coins, by center point (GP-3). */
  coins: Point[];
  /** Enemies (phase 7). */
  enemies: EnemySpawn[];
}
