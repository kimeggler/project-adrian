import * as Phaser from "phaser";
import { START_DATA_KEY } from "../events";
import { loadSfx } from "../systems/Audio";
import { getSave } from "../systems/Save";
import { createTextures } from "../textures";
import { getWorld } from "../worlds";
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
    createTextures(this, getWorld(getSave().world));
    const start = this.registry.get(START_DATA_KEY) as LevelStartData;
    this.scene.start(SceneKey.GAME, start);
  }
}
