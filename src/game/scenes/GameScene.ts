import * as Phaser from "phaser";
import {
  CAMERA,
  CHECKPOINT,
  COIN,
  FLAG,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEALTH,
  JUICE,
  SPIKES,
  TILE,
  WORLD,
} from "../config";
import { Player, PlayerEvent } from "../entities/Player";
import { GameEvent } from "../events";
import { generateLevel } from "../levelgen/generator";
import { nextSeed } from "../levelgen/seed";
import type { Level, Point } from "../levels/level";
import { buildTestLevel } from "../levels/testLevel";
import { Health, type DamageOutcome } from "../systems/Health";
import { playSfx, SfxKey } from "../systems/Audio";
import { PlayerInput } from "../systems/Input";
import { coinPoints, timeBonus } from "../systems/Score";
import { AnimKey, TextureKey } from "../textures";
import { SOLID_TILES } from "../tiles";
import type { HudState, LevelResult, LevelStartData } from "../types";
import { onKeyPress, pauseToggleEvents } from "../utils/keys";
import { SceneKey } from "./keys";

type Phase = "playing" | "dying" | "complete" | "gameOver";

export class GameScene extends Phaser.Scene {
  player!: Player;
  private level!: Level;
  private levelNumber = 1;
  private seed = 0;
  private testLevel = false;
  private health = new Health();
  /** Run score when this level began. */
  private scoreAtStart = 0;
  /** Coins collected in this level. */
  private coins = 0;
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
    this.seed = data.seed ?? 1;
    this.testLevel = data.testLevel ?? false;
    this.scoreAtStart = data.score ?? 0;
    this.coins = 0;
    this.livesAtStart = data.lives ?? HEALTH.START_LIVES;
    this.health = new Health(this.livesAtStart);
    this.elapsedMs = 0;
    this.phase = "playing";
  }

  create(): void {
    this.level = this.testLevel
      ? buildTestLevel()
      : generateLevel(this.seed, this.levelNumber).level;
    this.game.events.emit(GameEvent.LEVEL_STARTED, {
      seed: this.seed,
      level: this.levelNumber,
      testLevel: this.testLevel,
    });
    const { data, widthTiles, heightTiles, spawn, flag } = this.level;
    this.respawnPoint = spawn;

    this.createParallax(widthTiles * TILE);

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

    const coins = this.physics.add.staticGroup();
    for (const p of this.level.coins) {
      const coin = this.physics.add.staticSprite(p.x, p.y, TextureKey.COIN, 0);
      coin.play({ key: AnimKey.COIN_SPIN, startFrame: Math.floor(p.x / TILE) % 4 });
      coin.body.setSize(COIN.HITBOX, COIN.HITBOX);
      coins.add(coin);
    }

    // --- Player --------------------------------------------------------------
    const input = new PlayerInput(this);
    this.player = new Player(this, spawn.x, spawn.y, input);
    this.createJuice();
    this.physics.add.collider(this.player, layer);
    this.physics.add.overlap(this.player, flagSprite, () => this.completeLevel());
    this.physics.add.overlap(this.player, spikes, (_p, spike) =>
      this.onSpike(spike as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, checkpoints, (_p, cp) =>
      this.onCheckpoint(cp as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, coins, (_p, coin) =>
      this.onCoin(coin as Phaser.Physics.Arcade.Image),
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
      seed: this.seed,
      hearts: this.health.hearts,
      maxHearts: this.health.maxHearts,
      lives: this.health.lives,
      coins: this.coins,
      score: this.currentScore,
    };
  }

  /** Go to the next level, keeping lives and score ("Next level"). */
  nextLevel(totalScore: number): void {
    this.restartWith({
      level: this.levelNumber + 1,
      seed: nextSeed(this.seed),
      lives: this.health.lives,
      score: totalScore,
      testLevel: this.testLevel,
    });
  }

  /** Restart this level (same seed) as it began: lives and score (GP-6). */
  restartLevel(): void {
    this.restartWith({ ...this.sameLevel(), lives: this.livesAtStart });
  }

  /** Retry this level (same seed) with full lives (game over → "Retry level"). */
  retryLevel(): void {
    this.restartWith({ ...this.sameLevel(), lives: HEALTH.START_LIVES });
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

  /** Run score so far: earlier levels plus coins in this level. */
  private get currentScore(): number {
    return this.scoreAtStart + coinPoints(this.coins);
  }

  private sameLevel(): LevelStartData {
    return {
      level: this.levelNumber,
      seed: this.seed,
      score: this.scoreAtStart,
      testLevel: this.testLevel,
    };
  }

  private restartWith(data: LevelStartData): void {
    this.scene.restart(data);
  }

  private pauseGame(): void {
    if (this.phase !== "playing") return;
    this.scene.pause();
    this.scene.launch(SceneKey.PAUSE);
  }

  /**
   * Parallax background (WO-9): layers further away scroll slower. Each layer
   * is a TileSprite with a scroll factor, wide enough to cover the level at
   * its speed, so it moves with the camera without any per-frame update.
   */
  private createParallax(levelWidthPx: number): void {
    const layers: [key: string, factor: number][] = [
      [TextureKey.BG_SKY, 0],
      [TextureKey.BG_CLOUDS, 0.1],
      [TextureKey.BG_MOUNTAINS, 0.25],
      [TextureKey.BG_HILLS, 0.5],
    ];
    for (const [key, factor] of layers) {
      const width = Math.ceil(GAME_WIDTH + (levelWidthPx - GAME_WIDTH) * factor);
      this.add.tileSprite(0, 0, width, GAME_HEIGHT, key).setOrigin(0).setScrollFactor(factor, 0);
    }
  }

  /** Dust puffs (GF-1) and screen shake (GF-2), driven by player events. */
  private createJuice(): void {
    const dust = this.add.particles(0, 0, TextureKey.DUST, {
      emitting: false,
      lifespan: { min: 200, max: 350 },
      speed: { min: 10, max: 35 },
      angle: { min: 200, max: 340 }, // upwards, spreading sideways
      gravityY: 40,
      alpha: { start: 1, end: 0 },
    });
    const p = this.player;
    p.on(PlayerEvent.JUMP, () => playSfx(this, SfxKey.JUMP));
    p.on(PlayerEvent.LAND, (impact: number) => {
      if (impact < JUICE.MIN_LAND_SPEED) return;
      dust.explode(JUICE.DUST_LAND, p.x, p.y - 1);
      playSfx(this, SfxKey.LAND);
    });
    p.on(PlayerEvent.TURN, (dir: number) => {
      // Puff behind the feet, opposite the new direction.
      dust.explode(JUICE.DUST_TURN, p.x - dir * 4, p.y - 1);
    });
    p.on(PlayerEvent.HURT, () => this.shake());
  }

  private shake(): void {
    if (!JUICE.SCREEN_SHAKE) return;
    this.cameras.main.shake(JUICE.SHAKE_MS, JUICE.SHAKE_INTENSITY);
  }

  private onSpike(spike: Phaser.Physics.Arcade.Image): void {
    if (this.phase !== "playing") return;
    if (!this.player.hurt(spike.x)) return; // invincible
    const outcome = this.health.damage(HEALTH.SPIKE_DAMAGE);
    if (outcome === "hurt") playSfx(this, SfxKey.HURT);
    this.handleOutcome(outcome);
  }

  private onCheckpoint(cp: Phaser.Physics.Arcade.Image): void {
    if (cp.getData("active")) return;
    cp.setData("active", true).setTexture(TextureKey.CHECKPOINT_ON);
    this.respawnPoint = { x: cp.x, y: cp.y };
    playSfx(this, SfxKey.CHECKPOINT);
  }

  private onCoin(coin: Phaser.Physics.Arcade.Image): void {
    if (this.phase !== "playing") return;
    coin.disableBody(true, true);
    this.coins++;
    playSfx(this, SfxKey.COIN);
  }

  private handleOutcome(outcome: DamageOutcome): void {
    if (outcome === "hurt") return;

    this.phase = "dying";
    this.shake();
    playSfx(this, SfxKey.DEATH);
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
    playSfx(this, SfxKey.LEVEL_COMPLETE);

    const bonus = timeBonus(this.elapsedMs, this.level.widthTiles);
    const result: LevelResult = {
      level: this.levelNumber,
      seed: this.seed,
      timeMs: this.elapsedMs,
      coins: this.coins,
      coinsTotal: this.level.coins.length,
      timeBonus: bonus,
      score: this.currentScore + bonus,
    };
    this.scene.launch(SceneKey.LEVEL_COMPLETE, result);
  }
}
