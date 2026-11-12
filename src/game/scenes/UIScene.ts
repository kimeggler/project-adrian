import * as Phaser from "phaser";
import { SceneKey } from "./keys";

/** HUD overlay on top of GameScene. Content arrives in later phases. */
export class UIScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.UI);
  }
}
