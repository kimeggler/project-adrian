import * as Phaser from "phaser";
import { START_DATA_KEY } from "../events";
import { loadSfx } from "../systems/Audio";
import { createTextures } from "../textures";
import type { LevelStartData } from "../types";
import { SceneKey } from "./keys";

/** Loads the sounds, builds textures and animations from the pixel-art data, then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.BOOT);
  }

  preload(): void {
    loadSfx(this);
  }

  create(): void {
    createTextures(this);
    const start = this.registry.get(START_DATA_KEY) as LevelStartData;
    this.scene.start(SceneKey.GAME, start);
  }
}
