import type { LevelData } from "../tiles";

/** A point in px. For objects standing on the ground: bottom-center. */
export interface Point {
  x: number;
  y: number;
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
}
