import * as Phaser from "phaser";
import { CAMERA, CHECKPOINT, FLAG, HEALTH, SPIKES, TILE, WORLD } from "../config";
import { Player } from "../entities/Player";
import { GameEvent } from "../events";
import type { Level, Point } from "../levels/level";
import { buildTestLevel } from "../levels/testLevel";
import { Health, type DamageOutcome } from "../systems/Health";
import { PlayerInput } from "../systems/Input";
import { TextureKey } from "../textures";
import { SOLID_TILES } from "../tiles";
import type { HudState, LevelResult, LevelStartData } from "../types";
import { onKeyPress, pauseToggleEvents } from "../utils/keys";
import { SceneKey } from "./keys";

type Phase = "playing" | "dying" | "complete" | "gameOver";

export class GameScene extends Phaser.Scene {
  player!: Player;
  private level!: Level;
  private levelNumber = 1;
  private health = new Health();
  /** Lives when this level began; "Restart level" goes back to this. */
  private livesAtStart: number = HEALTH.START_LIVES;
  private respawnPoint!: Point;
  /** Physics time since the level started, in ms. Same at any refresh rate. */
  private elapsedMs = 0;
  private phase: Phase = "playing";

  constructor() {
    super(SceneKey.GAME);
  }

  init(data: Partial<LevelStartData>): void {
    this.levelNumber = data.level ?? 1;
    this.livesAtStart = data.lives ?? HEALTH.START_LIVES;
    this.health = new Health(this.livesAtStart);
    this.elapsedMs = 0;
    this.phase = "playing";
  }

  create(): void {
    this.level = buildTestLevel();
    const { data, widthTiles, heightTiles, spawn, flag } = this.level;
    this.respawnPoint = spawn;

    // --- Tilemap -------------------------------------------------------------
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(TextureKey.TILES, TextureKey.TILES);
    if (!tileset) throw new Error("Tileset could not be created");
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error("Tile layer could not be created");
    layer.setCollision(SOLID_TILES);

    // --- Objects ---------------------------------------------------------------
    const flagSprite = this.addStaticObject(flag, TextureKey.FLAG, FLAG.HITBOX_WIDTH, FLAG.HEIGHT);
    const spikes = this.physics.add.staticGroup();
    for (const p of this.level.spikes) {
      spikes.add(this.addStaticObject(p, TextureKey.SPIKES, SPIKES.HITBOX_WIDTH, SPIKES.HITBOX_HEIGHT));
    }
    const checkpoints = this.physics.add.staticGroup();
    for (const p of this.level.checkpoints) {
      checkpoints.add(
        this.addStaticObject(p, TextureKey.CHECKPOINT_OFF, CHECKPOINT.HITBOX_WIDTH, CHECKPOINT.HEIGHT),
      );
    }

    // --- Player --------------------------------------------------------------
    const input = new PlayerInput(this);
    this.player = new Player(this, spawn.x, spawn.y, input);
    this.physics.add.collider(this.player, layer);
    this.physics.add.overlap(this.player, flagSprite, () => this.completeLevel());
    this.physics.add.overlap(this.player, spikes, (_p, spike) =>
      this.onSpike(spike as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, checkpoints, (_p, cp) =>
      this.onCheckpoint(cp as Phaser.Physics.Arcade.Image),
    );

    // Run the player controller once per fixed physics step.
    const world = this.physics.world;
    const onStep = (dt: number) => {
      this.elapsedMs += dt * 1000;
      this.player.step(dt);
    };
    world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep);

    // --- Camera --------------------------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, widthTiles * TILE, heightTiles * TILE);
    cam.startFollow(this.player, true);
    cam.setDeadzone(CAMERA.DEADZONE_WIDTH, CAMERA.DEADZONE_HEIGHT);

    // --- Pause (GP-5) --------------------------------------------------------
    const kb = this.input.keyboard;
    onKeyPress(kb, "ESC", () => this.pauseGame(), pauseToggleEvents);
    onKeyPress(kb, "P", () => this.pauseGame(), pauseToggleEvents);
    // Keys released while paused never reach this scene; clear them on resume.
    this.events.on(Phaser.Scenes.Events.RESUME, () => kb?.resetKeys());

    this.scene.launch(SceneKey.UI);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // this.physics.world may already be torn down here, so use our reference.
      world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep);
      this.events.off(Phaser.Scenes.Events.RESUME);
      this.scene.stop(SceneKey.UI);
      this.scene.stop(SceneKey.LEVEL_COMPLETE);
      this.scene.stop(SceneKey.PAUSE);
      this.scene.stop(SceneKey.GAME_OVER);
    });
  }

  update(): void {
    if (this.phase !== "playing") return;
    // Falling into a pit costs a whole life (GP-1).
    const levelBottom = this.level.heightTiles * TILE;
    if (this.player.y > levelBottom + WORLD.PIT_MARGIN) {
      this.handleOutcome(this.health.loseLife());
    }
  }

  // --- Public API for the overlay scenes -------------------------------------

  get hud(): HudState {
    return {
      level: this.levelNumber,
      hearts: this.health.hearts,
      maxHearts: this.health.maxHearts,
      lives: this.health.lives,
    };
  }

  /** Go to the given level, keeping the current lives ("Next level"). */
  startLevel(level: number): void {
    this.restartWith({ level, lives: this.health.lives });
  }

  /** Restart this level with the lives it started with (GP-6). */
  restartLevel(): void {
    this.restartWith({ level: this.levelNumber, lives: this.livesAtStart });
  }

  /** Retry this level with full lives (game over → "Retry level"). */
  retryLevel(): void {
    this.restartWith({ level: this.levelNumber, lives: HEALTH.START_LIVES });
  }

  resumeGame(): void {
    this.scene.stop(SceneKey.PAUSE);
    this.scene.resume();
  }

  quitToMenu(): void {
    this.game.events.emit(GameEvent.QUIT_TO_MENU);
  }

  // --- Internals ---------------------------------------------------------------

  /** A static physics image standing on `p`, with a bottom-centered hitbox. */
  private addStaticObject(p: Point, texture: string, hitW: number, hitH: number) {
    const img = this.physics.add.staticImage(p.x, p.y, texture).setOrigin(0.5, 1);
    img.refreshBody();
    img.body.setSize(hitW, hitH, false);
    img.body.setOffset((img.width - hitW) / 2, img.height - hitH);
    return img;
  }

  private restartWith(data: LevelStartData): void {
    this.scene.restart(data);
  }

  private pauseGame(): void {
    if (this.phase !== "playing") return;
    this.scene.pause();
    this.scene.launch(SceneKey.PAUSE);
  }

  private onSpike(spike: Phaser.Physics.Arcade.Image): void {
    if (this.phase !== "playing") return;
    if (!this.player.hurt(spike.x)) return; // invincible
    this.handleOutcome(this.health.damage(HEALTH.SPIKE_DAMAGE));
  }

  private onCheckpoint(cp: Phaser.Physics.Arcade.Image): void {
    if (cp.getData("active")) return;
    cp.setData("active", true).setTexture(TextureKey.CHECKPOINT_ON);
    this.respawnPoint = { x: cp.x, y: cp.y };
  }

  private handleOutcome(outcome: DamageOutcome): void {
    if (outcome === "hurt") return;

    this.phase = "dying";
    this.physics.pause();
    this.time.delayedCall(HEALTH.RESPAWN_DELAY_MS, () => {
      if (outcome === "gameOver") {
        this.phase = "gameOver";
        this.scene.launch(SceneKey.GAME_OVER);
        return;
      }
      const { x, y } = this.respawnPoint;
      this.player.respawn(x, y, true);
      this.physics.resume();
      this.phase = "playing";
    });
  }

  private completeLevel(): void {
    if (this.phase !== "playing") return;
    this.phase = "complete";

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
