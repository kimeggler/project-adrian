import type { PowerUpKind } from "../config";
import type { LevelData } from "../tiles";

/** A point in px. For objects standing on the ground: bottom-center. */
export interface Point {
  x: number;
  y: number;
}

export type EnemyKind = "walker" | "jumper" | "shooter";

/**
 * An enemy, the stretch of ground it stays on, and its strength (CB-4, CB-7).
 * Stats come from the difficulty table when the level is generated.
 */
export interface EnemySpawn {
  kind: EnemyKind;
  /** Start position: bottom-center, standing on the ground (px). */
  x: number;
  y: number;
  /** Patrol bounds (px): walkers and jumpers turn around at them. */
  minX: number;
  maxX: number;
  /** Walking speed (px/s). */
  speed: number;
  hp: number;
  /** Hearts lost on contact (and per projectile for shooters). */
  damage: number;
  /** Shooters only. */
  fireIntervalMs: number;
  projectileSpeed: number;
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
  /** Power-up items, by center point (CB-6). */
  powerUps: (Point & { kind: PowerUpKind })[];
}
