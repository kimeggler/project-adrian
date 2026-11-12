import * as Phaser from "phaser";
import { CAMERA, TILE, WORLD } from "../config";
import { Player } from "../entities/Player";
import { buildTestLevel, type Level } from "../levels/testLevel";
import { PlayerInput } from "../systems/Input";
import { TextureKey } from "../textures";
import { SOLID_TILES } from "../tiles";
import { SceneKey } from "./keys";

export class GameScene extends Phaser.Scene {
  player!: Player;
  private level!: Level;

  constructor() {
    super(SceneKey.GAME);
  }

  create(): void {
    this.level = buildTestLevel();
    const { data, widthTiles, heightTiles, spawn } = this.level;
    const widthPx = widthTiles * TILE;
    const heightPx = heightTiles * TILE;

    // --- Tilemap -------------------------------------------------------------
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(TextureKey.TILES, TextureKey.TILES);
    if (!tileset) throw new Error("Tileset could not be created");
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error("Tile layer could not be created");
    layer.setCollision(SOLID_TILES);

    // --- Player --------------------------------------------------------------
    const input = new PlayerInput(this);
    this.player = new Player(this, spawn.x, spawn.y, input);
    this.physics.add.collider(this.player, layer);

    // Run the player controller once per fixed physics step.
    this.physics.world.on(
      Phaser.Physics.Arcade.Events.WORLD_STEP,
      (dt: number) => this.player.step(dt),
    );

    // --- Camera --------------------------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, widthPx, heightPx);
    cam.startFollow(this.player, true);
    cam.setDeadzone(CAMERA.DEADZONE_WIDTH, CAMERA.DEADZONE_HEIGHT);

    this.scene.launch(SceneKey.UI);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.physics.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP);
      this.scene.stop(SceneKey.UI);
    });
  }

  update(): void {
    // Placeholder pit handling until lives/hearts arrive in phase 3.
    const levelBottom = this.level.heightTiles * TILE;
    if (this.player.y > levelBottom + WORLD.PIT_MARGIN) {
      this.player.respawn(this.level.spawn.x, this.level.spawn.y);
    }
  }
}
