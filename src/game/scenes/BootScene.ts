import * as Phaser from "phaser";
import { START_DATA_KEY } from "../events";
import { createPlaceholderTextures } from "../textures";
import type { LevelStartData } from "../types";
import { SceneKey } from "./keys";

/** Loads (or, until phase 5, generates) all assets, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.BOOT);
  }

  create(): void {
    createPlaceholderTextures(this);
    const start = this.registry.get(START_DATA_KEY) as LevelStartData;
    this.scene.start(SceneKey.GAME, start);
  }
}
