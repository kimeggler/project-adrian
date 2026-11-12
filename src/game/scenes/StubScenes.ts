import * as Phaser from "phaser";
import { SceneKey } from "./keys";

/*
 * Overlay scenes registered from phase 0 so the scene structure is in place.
 * Their content is built in later phases:
 *   - PauseScene, GameOverScene: phase 3
 */

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.PAUSE);
  }
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.GAME_OVER);
  }
}
