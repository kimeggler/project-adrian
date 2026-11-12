import * as Phaser from "phaser";
import { CAMERA, FLAG, TILE, WORLD } from "../config";
import { Player } from "../entities/Player";
import { buildTestLevel, type Level } from "../levels/testLevel";
import { PlayerInput } from "../systems/Input";
import { TextureKey } from "../textures";
import { SOLID_TILES } from "../tiles";
import type { LevelResult, LevelStartData } from "../types";
import { SceneKey } from "./keys";

export class GameScene extends Phaser.Scene {
  player!: Player;
  private level!: Level;
  private levelNumber = 1;
  /** Physics time since the level started, in ms. Same at any refresh rate. */
  private elapsedMs = 0;
  private completed = false;

  constructor() {
    super(SceneKey.GAME);
  }

  init(data: Partial<LevelStartData>): void {
    this.levelNumber = data.level ?? 1;
    this.elapsedMs = 0;
    this.completed = false;
  }

  create(): void {
    this.level = buildTestLevel();
    const { data, widthTiles, heightTiles, spawn, flag } = this.level;
    const widthPx = widthTiles * TILE;
    const heightPx = heightTiles * TILE;

    // --- Tilemap -------------------------------------------------------------
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(TextureKey.TILES, TextureKey.TILES);
    if (!tileset) throw new Error("Tileset could not be created");
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error("Tile layer could not be created");
    layer.setCollision(SOLID_TILES);

    // --- Level-end flag (WO-4) -------------------------------------------------
    const flagSprite = this.physics.add.staticImage(flag.x, flag.y, TextureKey.FLAG);
    flagSprite.setOrigin(0.5, 1).refreshBody();
    flagSprite.body.setSize(FLAG.HITBOX_WIDTH, FLAG.HEIGHT);

    // --- Player --------------------------------------------------------------
    const input = new PlayerInput(this);
    this.player = new Player(this, spawn.x, spawn.y, input);
    this.physics.add.collider(this.player, layer);
    this.physics.add.overlap(this.player, flagSprite, () => this.completeLevel());

    // Run the player controller once per fixed physics step.
    const world = this.physics.world;
    const onStep = (dt: number) => {
      this.elapsedMs += dt * 1000;
      this.player.step(dt);
    };
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep);

    // --- Camera --------------------------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, widthPx, heightPx);
    cam.startFollow(this.player, true);
    cam.setDeadzone(CAMERA.DEADZONE_WIDTH, CAMERA.DEADZONE_HEIGHT);

    this.scene.launch(SceneKey.UI);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // this.physics.world may already be torn down here, so use our reference.
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep);
      this.scene.stop(SceneKey.UI);
      this.scene.stop(SceneKey.LEVEL_COMPLETE);
    });
  }

  update(): void {
    if (this.completed) return;
    // Placeholder pit handling until lives/hearts arrive in phase 3.
    const levelBottom = this.level.heightTiles * TILE;
    if (this.player.y > levelBottom + WORLD.PIT_MARGIN) {
      this.player.respawn(this.level.spawn.x, this.level.spawn.y);
    }
  }

  /** Start the given level (used by "Next level" and, later, restart). */
  startLevel(level: number): void {
    const data: LevelStartData = { level };
    this.scene.restart(data);
  }

  private completeLevel(): void {
    if (this.completed) return;
    this.completed = true;

    this.physics.pause();
    this.player.body.setVelocity(0, 0);

    const result: LevelResult = {
      level: this.levelNumber,
      timeMs: this.elapsedMs,
      coins: 0,
      score: 0,
    };
    this.scene.launch(SceneKey.LEVEL_COMPLETE, result);
  }
}
