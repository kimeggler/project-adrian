import * as Phaser from "phaser";
import { ENEMY, PHYSICS, SWORD } from "../config";
import type { EnemySpawn } from "../levels/level";
import { AnimKey, SLIME_SQUASHED_FRAME, TextureKey } from "../textures";

/**
 * Walker enemy (CB-4): walks back and forth and turns around at walls and at
 * the ends of its patrol area (which the generator puts at edges, steps,
 * spikes and obstacles). Can be stomped (CB-1) or hit with the sword (CB-2,
 * ENEMY.WALKER_HP hits), and is knocked back by hits and after hitting the
 * player (CB-3).
 *
 * Like the player, its logic runs in `step()` once per fixed physics step.
 */
export class Walker extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  private dir: -1 | 1 = -1;
  private stunMs = 0;
  private dead = false;
  private hp: number = ENEMY.WALKER_HP;
  /** The last sword swing that hit this enemy (one hit per swing). */
  private lastSwing = -1;

  constructor(
    scene: Phaser.Scene,
    private readonly spawn: EnemySpawn,
  ) {
    super(scene, spawn.x, spawn.y, TextureKey.SLIME, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.body.setSize(ENEMY.HITBOX_WIDTH, ENEMY.HITBOX_HEIGHT);
    this.body.setOffset((ENEMY.SIZE - ENEMY.HITBOX_WIDTH) / 2, ENEMY.SIZE - ENEMY.HITBOX_HEIGHT);
    this.body.setMaxVelocity(10000, PHYSICS.MAX_FALL_SPEED);
    this.play(AnimKey.SLIME_WALK);
  }

  get alive(): boolean {
    return !this.dead;
  }

  /** Advance by one fixed physics step (`dt` in seconds). */
  step(dt: number): void {
    if (this.dead) return;
    const b = this.body;
    const { minX, maxX, speed } = this.spawn;

    if (this.stunMs > 0) {
      // Being knocked back: slide, but never past the patrol area (pits!).
      this.stunMs -= dt * 1000;
      const outside = (b.velocity.x < 0 && b.left <= minX) || (b.velocity.x > 0 && b.right >= maxX);
      b.setVelocityX(outside ? 0 : b.velocity.x * 0.85);
      return;
    }

    if (this.dir > 0 && (b.blocked.right || b.right >= maxX)) this.dir = -1;
    else if (this.dir < 0 && (b.blocked.left || b.left <= minX)) this.dir = 1;

    b.setVelocityX(this.dir * speed);
    this.setFlipX(this.dir < 0); // art faces right
  }

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

  /** Defeated by the sword: flash, pop up and fade out. */
  private defeat(): void {
    this.dead = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this,
      y: this.y - 6,
      alpha: 0,
      duration: ENEMY.SQUASHED_MS,
      onComplete: () => this.destroy(),
    });
  }

  /** Squashed by the player landing on it. */
  stomp(): void {
    if (this.dead) return;
    this.dead = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
    this.setFrame(SLIME_SQUASHED_FRAME);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: ENEMY.SQUASHED_MS / 2,
      duration: ENEMY.SQUASHED_MS / 2,
      onComplete: () => this.destroy(),
    });
  }
}
