import * as Phaser from "phaser";
import { createPlaceholderTextures } from "../textures";
import { SceneKey } from "./keys";

/** Loads (or, until phase 5, generates) all assets, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.BOOT);
  }

  create(): void {
    createPlaceholderTextures(this);
    this.scene.start(SceneKey.GAME);
  }
}
