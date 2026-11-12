import * as Phaser from "phaser";
import {
  CAMERA,
  CHECKPOINT,
  COIN,
  FLAG,
  GAME_HEIGHT,
  GAME_WIDTH,
  GAMEPAD,
  HEALTH,
  JUICE,
  POWERUP,
  type PowerUpKind,
  SCORE,
  SPIKES,
  swordForLevel,
  TILE,
  WORLD,
} from "../config";
import { BossEvent } from "../entities/Boss";
import { BossArena } from "../entities/BossArena";
import { MovingPlatform } from "../entities/MovingPlatform";
import { Player, PlayerEvent } from "../entities/Player";
import type { Enemy } from "../entities/Enemy";
import { Jumper } from "../entities/Jumper";
import { Projectile } from "../entities/Projectile";
import { Shooter } from "../entities/Shooter";
import { ThrownAxe } from "../entities/ThrownAxe";
import { Walker } from "../entities/Walker";
import type { EnemySpawn } from "../levels/level";
import { isStomp, overlaps, type Rect } from "../systems/Combat";
import { GameEvent } from "../events";
import { generateLevel } from "../levelgen/generator";
import { nextSeed } from "../levelgen/seed";
import type { Level, Point } from "../levels/level";
import { buildTestLevel } from "../levels/testLevel";
import { Health, type DamageOutcome } from "../systems/Health";
import { playSfx, SfxKey } from "../systems/Audio";
import { PlayerInput } from "../systems/Input";
import { getCharacter, type Character } from "../characters";
import { getSave, getSettings, recordProgress } from "../systems/Save";
import { coinPoints, timeBonus } from "../systems/Score";
import { AnimKey, TextureKey } from "../textures";
import { SOLID_TILES, TileId } from "../tiles";
import { textStyle } from "../ui/font";
import type { HudState, LevelResult, LevelStartData } from "../types";
import { onKeyPress, pauseToggleEvents } from "../utils/keys";
import { SceneKey } from "./keys";

type Phase = "playing" | "dying" | "complete" | "gameOver";

const POWERUP_TEXTURES: Record<PowerUpKind, string> = {
  boots: TextureKey.ITEM_BOOTS,
  shield: TextureKey.ITEM_SHIELD,
  axe: TextureKey.ITEM_AXE,
};

const POWERUP_NAMES: Record<PowerUpKind, string> = {
  boots: "SPEED BOOTS!",
  shield: "SHIELD!",
  axe: "THROWING AXE!",
};

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
  /** Enemies defeated in this level (stomp or sword). */
  private stomps = 0;
  private enemies: Enemy[] = [];
  /** Points from blocks and the boss in this level (WO-10, CB-8). */
  private bonusPoints = 0;
  private layer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private platforms: MovingPlatform[] = [];
  private arena?: BossArena;
  /** Stomp hit ids for the boss (one hit per stomp). */
  private stompHits = 0;
  private debris?: Phaser.GameObjects.Particles.ParticleEmitter;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private axes!: Phaser.Physics.Arcade.Group;
  /** Message for the HUD to show once (e.g. a sword upgrade). */
  private toast?: string;
  /** Hero picked on the landing page (CB-9). */
  private character: Character = getCharacter("knight");
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private swordDebug?: Phaser.GameObjects.Graphics;
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
    this.stomps = 0;
    this.enemies = [];
    this.bonusPoints = 0;
    this.platforms = [];
    this.arena = undefined;
    this.toast = undefined;
    this.swordDebug = undefined; // destroyed with the previous level's objects
    this.livesAtStart = data.lives ?? HEALTH.START_LIVES;
    this.character = getCharacter(getSave().character);
    this.health = new Health(this.livesAtStart, this.character.stats.heartsPerLife);
    this.elapsedMs = 0;
    this.phase = "playing";
  }

  create(): void {
    this.level = this.testLevel
      ? buildTestLevel()
      : generateLevel(this.seed, this.levelNumber).level;
    const unlocked = this.testLevel ? [] : recordProgress({ level: this.levelNumber });
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
    this.layer = layer;

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
    this.player = new Player(this, spawn.x, spawn.y, input, this.character);
    this.equipSword();
    if (unlocked.length > 0) {
      for (const id of unlocked) this.addToast(`NEW HERO: ${getCharacter(id).name.toUpperCase()}!`);
      // A sword upgrade on this level already played the fanfare.
      if (swordForLevel(this.levelNumber).fromLevel !== this.levelNumber) playSfx(this, SfxKey.SWORD_UPGRADE);
    }
    this.createJuice();
    this.physics.add.collider(this.player, layer);
    this.physics.add.overlap(this.player, flagSprite, () => this.completeLevel());
    this.physics.add.overlap(this.player, spikes, (_p, spike) =>
      this.onSpike(spike as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, checkpoints, (_p, cp) =>
      this.onCheckpoint(cp as Phaser.Physics.Arcade.Image),
    );
    // --- Enemies (phase 7) ------------------------------------------------------
    this.enemies = this.level.enemies.map((spawn) => this.createEnemy(spawn));
    this.physics.add.collider(this.enemies, layer);
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onEnemyContact(e as Enemy));

    // --- Power-ups (CB-6) ------------------------------------------------------
    const items = this.physics.add.staticGroup();
    for (const p of this.level.powerUps) {
      const item = this.physics.add.staticImage(p.x, p.y, POWERUP_TEXTURES[p.kind]).setData("kind", p.kind);
      items.add(item);
      // Gentle bobbing (cosmetic; the hitbox stays put).
      this.tweens.add({ targets: item, y: p.y - POWERUP.ITEM_BOB, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    this.physics.add.overlap(this.player, items, (_p, item) => this.onPowerUp(item as Phaser.Physics.Arcade.Image));

    this.axes = this.physics.add.group();
    this.physics.add.collider(this.axes, layer, (a, tile) => {
      if ((tile as Phaser.Tilemaps.Tile).index === TileId.BREAKABLE) this.breakTile(tile as Phaser.Tilemaps.Tile);
      (a as ThrownAxe).destroy();
    });

    this.projectiles = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.projectiles, layer, (p) => (p as Projectile).destroy());
    this.physics.add.overlap(this.player, this.projectiles, (_p, p) => this.onProjectileHit(p as Projectile));

    this.physics.add.overlap(this.player, coins, (_p, coin) =>
      this.onCoin(coin as Phaser.Physics.Arcade.Image),
    );

    this.createWorldVariety();

    // Run the player controller once per fixed physics step.
    const world = this.physics.world;
    const onStep = (dt: number) => {
      this.elapsedMs += dt * 1000;
      for (const p of this.platforms) p.step(dt);
      this.player.step(dt);
      this.checkHeadBump();
      this.arena?.step(dt, this.player);
      for (const e of this.enemies) e.step(dt, this.player);
      for (const p of this.projectiles.getChildren() as Projectile[]) p.step();
      this.checkAxeHits();
      this.checkSwordHits();
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
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index === GAMEPAD.START) this.pauseGame();
      },
    );
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
      this.scene.stop(SceneKey.SETTINGS);
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
    return this.scoreAtStart + coinPoints(this.coins) + this.stomps * SCORE.ENEMY_POINTS + this.bonusPoints;
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

  /** Pause from the touch pause button. */
  requestPause(): void {
    this.pauseGame();
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
    const dust = (this.dust = this.add.particles(0, 0, TextureKey.DUST, {
      emitting: false,
      lifespan: { min: 200, max: 350 },
      speed: { min: 10, max: 35 },
      angle: { min: 200, max: 340 }, // upwards, spreading sideways
      gravityY: 40,
      alpha: { start: 1, end: 0 },
    }));
    const p = this.player;
    p.on(PlayerEvent.JUMP, () => playSfx(this, SfxKey.JUMP));
    p.on(PlayerEvent.ATTACK, () => playSfx(this, SfxKey.SWORD_SWING));
    p.on(PlayerEvent.THROW_AXE, (x: number, y: number, facing: 1 | -1) => {
      const axe = new ThrownAxe(this, x, y, facing);
      this.axes.add(axe);
      axe.launch();
      playSfx(this, SfxKey.AXE_THROW);
    });
    p.on(PlayerEvent.POWERUP_END, () => playSfx(this, SfxKey.POWER_DOWN));
    p.on(PlayerEvent.TRAIL, () => dust.explode(1, p.x + (p.view.flipX ? 4 : -4), p.y - 1));
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
    if (!getSettings().screenShake) return;
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

  private createEnemy(spawn: EnemySpawn): Enemy {
    switch (spawn.kind) {
      case "jumper":
        return new Jumper(this, spawn);
      case "shooter":
        return new Shooter(this, spawn, (x, y, dir, speed, damage) => {
          const rock = new Projectile(this, x, y, dir, speed, damage);
          this.projectiles.add(rock);
          rock.launch();
          playSfx(this, SfxKey.SHOOT);
        });
      default:
        return new Walker(this, spawn);
    }
  }

  private onProjectileHit(rock: Projectile): void {
    if (this.phase !== "playing" || !rock.active) return;
    if (this.player.shielded) {
      // The shield breaks rocks.
      rock.destroy();
      playSfx(this, SfxKey.ENEMY_HIT);
      return;
    }
    if (!this.player.hurt(rock.x)) return; // invincible: the rock passes through
    rock.destroy();
    const outcome = this.health.damage(rock.damage);
    if (outcome === "hurt") playSfx(this, SfxKey.HURT);
    this.handleOutcome(outcome);
  }

  /**
   * Sword for this level (CB-5). On the level where an upgrade starts, the
   * HUD announces it and the save remembers the highest sword level.
   */
  private equipSword(): void {
    const sword = swordForLevel(this.levelNumber);
    this.player.setSword(sword);
    if (this.levelNumber > 1 && sword.fromLevel === this.levelNumber) {
      this.addToast(`SWORD UP!\n${sword.label}`);
      playSfx(this, SfxKey.SWORD_UPGRADE);
    }
    if (!this.testLevel) recordProgress({ weaponLevel: sword.swordLevel });
  }

  private onPowerUp(item: Phaser.Physics.Arcade.Image): void {
    if (this.phase !== "playing" || !item.active) return;
    const kind = item.getData("kind") as PowerUpKind;
    item.destroy();
    this.player.addPowerUp(kind);
    playSfx(this, SfxKey.POWER_UP);
    this.toast = POWERUP_NAMES[kind];
  }

  /** Thrown axes against enemies and rocks (CB-6). Each axe breaks on its first hit. */
  private checkAxeHits(): void {
    const rect = (b: Phaser.Physics.Arcade.Body) => ({ x: b.left, y: b.top, width: b.width, height: b.height });
    for (const axe of [...(this.axes.getChildren() as ThrownAxe[])]) {
      if (axe.y > this.level.heightTiles * TILE + WORLD.PIT_MARGIN) {
        axe.destroy();
        continue;
      }
      const box = rect(axe.body);
      const rock = (this.projectiles.getChildren() as Projectile[]).find((r) => overlaps(box, rect(r.body)));
      if (rock) {
        rock.destroy();
        axe.destroy();
        playSfx(this, SfxKey.ENEMY_HIT);
        continue;
      }
      const boss = this.arena?.boss;
      if (boss?.alive && overlaps(box, rect(boss.body))) {
        const result = boss.hit(axe.hitId, POWERUP.AXE_DAMAGE, axe.x);
        if (result) {
          axe.destroy();
          this.onBossHit(result);
          continue;
        }
      }
      for (const e of [...this.enemies]) {
        if (!overlaps(box, rect(e.body))) continue;
        const result = e.swordHit(axe.hitId, POWERUP.AXE_DAMAGE, axe.x);
        if (!result) continue;
        axe.destroy();
        playSfx(this, SfxKey.ENEMY_HIT);
        if (result === "defeated") {
          this.enemies = this.enemies.filter((x) => x !== e);
          this.stomps++;
          this.dust?.explode(JUICE.DUST_LAND, e.x, e.y - 4);
        }
        break;
      }
    }
  }

  /** Boss health for the HUD while the fight is on (CB-8). */
  get bossBar(): { name: string; hp: number; maxHp: number } | undefined {
    const a = this.arena;
    if (!a?.fighting) return undefined;
    return { name: "SLIME KING", hp: a.boss.hp, maxHp: a.boss.maxHp };
  }

  /**
   * WO-10 and CB-8: moving platforms, hidden bonus blocks and the boss arena.
   * Called after the player, enemies and projectile groups exist.
   */
  private createWorldVariety(): void {
    const level = this.level;

    // Moving platforms.
    this.platforms = level.movingPlatforms.map((spec) => new MovingPlatform(this, spec));
    this.physics.add.collider(this.player, this.platforms);

    // Hidden bonus blocks: no collision until hit from below, then solid.
    const hidden = this.physics.add.staticGroup();
    for (const { c, r } of level.hiddenBlocks) {
      const img = this.physics.add.staticImage(c * TILE + TILE / 2, r * TILE + TILE / 2, TextureKey.BONUS_BLOCK);
      img.setVisible(false);
      hidden.add(img);
    }
    const pb = this.player.body;
    this.physics.add.collider(
      this.player,
      hidden,
      (_p, b) => this.revealBlock(b as Phaser.Physics.Arcade.Image),
      (_p, b) => {
        const block = b as Phaser.Physics.Arcade.Image;
        if (block.getData("revealed")) return true;
        // Only a jump into its underside reveals it; otherwise pass through.
        return pb.velocity.y < 0 && pb.prev.y >= block.body!.bottom - 1;
      },
    );

    // Debris from broken blocks: little copies of the cracked tile.
    this.debris = this.add.particles(0, 0, TextureKey.TILES, {
      frame: TileId.BREAKABLE,
      emitting: false,
      lifespan: 600,
      speed: { min: 60, max: 120 },
      angle: { min: 220, max: 320 },
      gravityY: 500,
      scale: { start: 0.35, end: 0.2 },
      rotate: { min: 0, max: 360 },
    });

    // Boss arena.
    if (!level.boss) return;
    const arena = (this.arena = new BossArena(this, level.boss, (event) => {
      if (event === "closed") {
        playSfx(this, SfxKey.GATE);
        this.shake();
        this.addToast("THE SLIME KING!");
      } else {
        playSfx(this, SfxKey.GATE);
      }
    }));
    const boss = arena.boss;
    this.physics.add.collider(boss, this.layer);
    this.physics.add.collider(boss, arena.gates);
    this.physics.add.collider(this.player, arena.gates);
    this.physics.add.collider(this.projectiles, arena.gates, (p) => (p as Projectile).destroy());
    this.physics.add.collider(this.axes, arena.gates, (a) => (a as ThrownAxe).destroy());
    this.physics.add.overlap(this.player, boss, () => this.onBossContact());
    boss.on(BossEvent.SLAM, (x: number, floorY: number, speed: number) => {
      playSfx(this, SfxKey.BOSS_SLAM);
      this.shake();
      this.dust?.explode(JUICE.DUST_LAND * 2, x, floorY - 1);
      for (const dir of [-1, 1] as const) {
        const rock = new Projectile(this, x + dir * 14, floorY - 4, dir, speed, boss.damage);
        this.projectiles.add(rock);
        rock.launch();
      }
    });
  }

  /** Jumping into a hidden block's underside: it appears and pays out. */
  private revealBlock(block: Phaser.Physics.Arcade.Image): void {
    if (block.getData("revealed")) return;
    block.setData("revealed", true).setVisible(true);
    this.tweens.add({ targets: block, y: block.y - 4, duration: 80, yoyo: true });
    this.bonusPoints += SCORE.HIDDEN_BLOCK_POINTS;
    playSfx(this, SfxKey.BONUS);
    this.popText(`+${SCORE.HIDDEN_BLOCK_POINTS}`, block.x, block.y - TILE);
    const coin = this.add.sprite(block.x, block.y - TILE / 2, TextureKey.COIN).play(AnimKey.COIN_SPIN);
    this.tweens.add({ targets: coin, y: coin.y - 24, alpha: 0, duration: 500, onComplete: () => coin.destroy() });
  }

  /** Breaking a cracked block with the sword, an axe or a head bump. */
  private breakTile(tile: Phaser.Tilemaps.Tile): void {
    if (tile.index !== TileId.BREAKABLE) return;
    this.layer.removeTileAt(tile.x, tile.y);
    this.debris?.explode(6, tile.pixelX + TILE / 2, tile.pixelY + TILE / 2);
    this.bonusPoints += SCORE.BLOCK_POINTS;
    playSfx(this, SfxKey.BLOCK_BREAK);
  }

  /** Head bumped into a cracked block from below: it breaks. */
  private checkHeadBump(): void {
    const b = this.player.body;
    if (!b.blocked.up) return;
    for (const x of [b.left + 1, b.right - 1]) {
      const tile = this.layer.getTileAtWorldXY(x, b.top - 1);
      if (tile?.index === TileId.BREAKABLE) this.breakTile(tile);
    }
  }

  /** Small score text that floats up and fades. */
  private popText(text: string, x: number, y: number): void {
    const t = this.add
      .text(x, y, text, textStyle({ color: "#fbf236", stroke: "#000000", strokeThickness: 2 }))
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({ targets: t, y: y - 12, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  /** Touching the boss: a stomp hurts it, otherwise it hurts the player. */
  private onBossContact(): void {
    const boss = this.arena?.boss;
    if (this.phase !== "playing" || !boss?.alive) return;
    const pb = this.player.body;
    const stomped = isStomp({ playerPrevBottom: pb.prev.y + pb.height, playerVy: pb.velocity.y, enemyTop: boss.body.top });
    if (stomped) {
      this.player.bounce();
      const result = boss.hit(1e9 + ++this.stompHits, 1, this.player.x);
      if (result) this.onBossHit(result);
      else playSfx(this, SfxKey.STOMP);
      return;
    }
    if (this.player.shielded) return; // the shield blocks it, but can't push a king
    if (!this.player.hurt(boss.x)) return;
    const outcome = this.health.damage(boss.damage);
    if (outcome === "hurt") playSfx(this, SfxKey.HURT);
    this.handleOutcome(outcome);
  }

  private onBossHit(result: "hit" | "defeated"): void {
    const boss = this.arena!.boss;
    if (result === "hit") {
      playSfx(this, SfxKey.BOSS_HIT);
      return;
    }
    playSfx(this, SfxKey.BOSS_DEFEAT);
    this.shake();
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 120, () => this.dust?.explode(JUICE.DUST_LAND * 2, boss.x + (i - 1.5) * 8, boss.y - 8));
    }
    this.projectiles.clear(true, true);
    this.bonusPoints += SCORE.BOSS_POINTS;
    this.popText(`+${SCORE.BOSS_POINTS}`, boss.x, boss.y - 32);
    this.addToast("VICTORY!");
    this.time.delayedCall(900, () => this.arena?.open());
  }

  /** Queue a HUD announcement; messages in the same frame are shown together. */
  private addToast(message: string): void {
    this.toast = this.toast ? `${this.toast}\n${message}` : message;
  }

  /** The HUD takes this message once and shows it. */
  consumeToast(): string | undefined {
    const t = this.toast;
    this.toast = undefined;
    return t;
  }

  /** Sword against enemies, once per physics step while the hitbox is active (CB-2). */
  private checkSwordHits(): void {
    const box = this.player.swordBox;
    this.drawSwordDebug(box);
    if (!box || this.phase !== "playing") return;
    // Knock rocks out of the air.
    for (const p of [...(this.projectiles.getChildren() as Projectile[])]) {
      const b = p.body;
      if (!overlaps(box, { x: b.left, y: b.top, width: b.width, height: b.height })) continue;
      p.destroy();
      playSfx(this, SfxKey.ENEMY_HIT);
    }
    // Break cracked blocks (WO-10).
    for (const tile of this.layer.getTilesWithinWorldXY(box.x, box.y, box.width, box.height)) {
      if (tile.index === TileId.BREAKABLE) this.breakTile(tile);
    }
    const boss = this.arena?.boss;
    if (boss?.alive) {
      const b = boss.body;
      if (overlaps(box, { x: b.left, y: b.top, width: b.width, height: b.height })) {
        const result = boss.hit(this.player.swing, this.player.swordDamage, this.player.x);
        if (result) this.onBossHit(result);
      }
    }
    for (const w of [...this.enemies]) {
      const b = w.body;
      if (!overlaps(box, { x: b.left, y: b.top, width: b.width, height: b.height })) continue;
      const result = w.swordHit(this.player.swing, this.player.swordDamage, this.player.x);
      if (!result) continue;
      playSfx(this, SfxKey.ENEMY_HIT);
      if (result === "defeated") {
        this.enemies = this.enemies.filter((x) => x !== w);
        this.stomps++;
        this.dust?.explode(JUICE.DUST_LAND, w.x, w.y - 4);
      }
    }
  }

  /** With F1 physics debug on, also outline the sword hitbox. */
  private drawSwordDebug(box: Rect | null): void {
    const world = this.physics.world;
    if (!world.drawDebug || !world.debugGraphic) {
      this.swordDebug?.clear();
      return;
    }
    this.swordDebug ??= this.add.graphics().setDepth(1000);
    this.swordDebug.clear();
    if (box) this.swordDebug.lineStyle(1, 0xff0000).strokeRect(box.x, box.y, box.width, box.height);
  }

  /** Touching an enemy: stomp it from above, otherwise take damage (CB-1, CB-3). */
  private onEnemyContact(walker: Enemy): void {
    if (this.phase !== "playing" || !walker.alive) return;
    const pb = this.player.body;
    const stomped = isStomp({
      playerPrevBottom: pb.prev.y + pb.height,
      playerVy: pb.velocity.y,
      enemyTop: walker.body.top,
    });
    if (stomped) {
      walker.stomp();
      this.enemies = this.enemies.filter((w) => w !== walker);
      this.player.bounce();
      this.stomps++;
      this.dust?.explode(JUICE.DUST_LAND, walker.x, walker.y - 1);
      playSfx(this, SfxKey.STOMP);
      return;
    }
    if (this.player.shielded) {
      walker.knockback(this.player.x, POWERUP.SHIELD_KNOCKBACK_VX);
      return;
    }
    if (!this.player.hurt(walker.x)) return; // invincible (i-frames)
    walker.knockback(this.player.x);
    const outcome = this.health.damage(walker.damage);
    if (outcome === "hurt") playSfx(this, SfxKey.HURT);
    this.handleOutcome(outcome);
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
        if (!this.testLevel) recordProgress({ score: this.currentScore });
        this.scene.launch(SceneKey.GAME_OVER);
        return;
      }
      const { x, y } = this.respawnPoint;
      this.player.respawn(x, y, true);
      if (this.arena) {
        this.arena.reset();
        // Shockwaves still flying would hit the player right away.
        this.projectiles.clear(true, true);
      }
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
    if (!this.testLevel) recordProgress({ score: result.score });
    this.scene.launch(SceneKey.LEVEL_COMPLETE, result);
  }
}
