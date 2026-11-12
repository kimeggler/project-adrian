import * as Phaser from "phaser";
import { ENEMY, PHYSICS, SWORD } from "../config";
import type { EnemySpawn } from "../levels/level";

/**
 * Shared enemy behavior (CB-1, CB-3): hit points, stomping, sword hits with
 * flash and knockback, and defeat. Subclasses implement `act()` — what the
 * enemy does each fixed physics step when it isn't knocked back.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  protected dir: -1 | 1 = -1;
  protected stunMs = 0;
  private dead = false;
  private hp: number;
  /** The last sword swing that hit this enemy (one hit per swing). */
  private lastSwing = -1;

  constructor(
    scene: Phaser.Scene,
    protected readonly spawn: EnemySpawn,
    texture: string,
    hitbox: { width: number; height: number },
  ) {
    super(scene, spawn.x, spawn.y, texture, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = spawn.hp;

    this.setOrigin(0.5, 1);
    this.body.setSize(hitbox.width, hitbox.height);
    this.body.setOffset((ENEMY.SIZE - hitbox.width) / 2, ENEMY.SIZE - hitbox.height);
    this.body.setMaxVelocity(10000, PHYSICS.MAX_FALL_SPEED);
  }

  get alive(): boolean {
    return !this.dead;
  }

  /** Hearts the player loses on contact (CB-7 attack power). */
  get damage(): number {
    return this.spawn.damage;
  }

  /** Advance by one fixed physics step (`dt` in seconds). */
  step(dt: number, player: { x: number; y: number }): void {
    if (this.dead) return;
    if (this.stunMs > 0) {
      // Being knocked back: slide, but never past the patrol area (pits!).
      this.stunMs -= dt * 1000;
      const b = this.body;
      const { minX, maxX } = this.spawn;
      const outside = (b.velocity.x < 0 && b.left <= minX) || (b.velocity.x > 0 && b.right >= maxX);
      b.setVelocityX(outside ? 0 : b.velocity.x * 0.85);
      return;
    }
    this.act(dt, player);
  }

  protected abstract act(dt: number, player: { x: number; y: number }): void;

  /**
   * Hit by sword swing `swing` coming from `fromX`. Returns "hit", "defeated",
   * or null if this swing already hit (or the enemy is already defeated).
   */
  swordHit(swing: number, damage: number, fromX: number): "hit" | "defeated" | null {
    if (this.dead || swing === this.lastSwing) return null;
    this.lastSwing = swing;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.defeat();
      return "defeated";
    }
    this.knockback(fromX, SWORD.ENEMY_KNOCKBACK_VX);
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ENEMY.HIT_FLASH_MS, () => {
      if (!this.active) return;
      this.clearTint();
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    });
    return "hit";
  }

  /** Pushed away after touching the player or a sword hit (CB-3). */
  knockback(fromX: number, speed: number = ENEMY.KNOCKBACK_VX): void {
    if (this.dead) return;
    const away = this.x < fromX ? -1 : 1;
    this.dir = away;
    this.body.setVelocityX(away * speed);
    this.stunMs = ENEMY.KNOCKBACK_MS;
    this.setFlipX(away < 0);
  }

  /** Squashed by the player landing on it (always defeats it). */
  stomp(): void {
    if (this.dead) return;
    this.kill();
    this.showSquashed();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: ENEMY.SQUASHED_MS / 2,
      duration: ENEMY.SQUASHED_MS / 2,
      onComplete: () => this.destroy(),
    });
  }

  /** How the enemy looks when squashed. Default: flattened sprite. */
  protected showSquashed(): void {
    this.setScale(1.25, 0.4);
  }

  /** Defeated by the sword: flash, pop up and fade out. */
  private defeat(): void {
    this.kill();
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this,
      y: this.y - 6,
      alpha: 0,
      duration: ENEMY.SQUASHED_MS,
      onComplete: () => this.destroy(),
    });
  }

  private kill(): void {
    this.dead = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
  }
}
