import * as Phaser from "phaser";
import { SceneKey } from "./keys";

/** Phase 0: an empty colored scene. Gameplay arrives in phase 1. */
export class GameScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.GAME);
  }

  create(): void {
    this.scene.launch(SceneKey.UI);
  }
}
