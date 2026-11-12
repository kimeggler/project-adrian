import * as Phaser from "phaser";
import { BOSS, PHYSICS } from "../config";
import type { BossArena } from "../levels/level";
import { AnimKey, SLIME_KING_AIR_FRAME, TextureKey } from "../textures";

export const BossEvent = {
  /** Landed from a big leap: (x, floorY, shockwaveSpeed). */
  SLAM: "slam",
} as const;

/**
 * The Slime King (CB-8). Waits until the fight starts, then alternates small
 * hops towards the player with a big leap at them every BOSS.LEAP_EVERY
 * moves. A leap ends in a slam that sends shockwaves along the floor (the
 * scene spawns them). Below half HP it rests less and its shockwaves are
 * faster. Stomps and sword hits each cost it hit points, with a short
 * invulnerability after every hit.
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  readonly maxHp: number;
  hp: number;
  private fighting = false;
  private restMs: number = BOSS.REST_MS;
  private moves = 0;
  private leaping = false;
  private wasGrounded = true;
  private invulnerableMs = 0;
  private dead = false;
  /** Last sword swing / axe that hit (one hit each). */
  private lastHitId = Number.NaN;

  constructor(
    scene: Phaser.Scene,
    private readonly arena: BossArena,
  ) {
    super(scene, arena.bossX, arena.bossY, TextureKey.SLIME_KING, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHp = this.hp = arena.hp;
    this.setOrigin(0.5, 1).setDepth(5);
    this.body.setSize(BOSS.HITBOX_WIDTH, BOSS.HITBOX_HEIGHT);
    this.body.setOffset((BOSS.WIDTH - BOSS.HITBOX_WIDTH) / 2, BOSS.HEIGHT - BOSS.HITBOX_HEIGHT);
    this.body.setMaxVelocity(10000, PHYSICS.MAX_FALL_SPEED);
    this.setFlipX(true); // art faces right; the player comes from the left
    this.play(AnimKey.SLIME_KING_IDLE);
  }

  get alive(): boolean {
    return !this.dead;
  }

  get damage(): number {
    return this.arena.damage;
  }

  private get enraged(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  /** The gate closed: start attacking. */
  startFight(): void {
    this.fighting = true;
    this.restMs = BOSS.REST_MS;
  }

  /** The player lost a life: back to the start, full HP, waiting. */
  reset(): void {
    if (this.dead) return;
    this.fighting = false;
    this.hp = this.maxHp;
    this.moves = 0;
    this.leaping = false;
    this.invulnerableMs = 0;
    this.body.reset(this.arena.bossX, this.arena.bossY);
    this.setAlpha(1).setFlipX(true).clearTint();
    this.play(AnimKey.SLIME_KING_IDLE);
  }

  /** Called every fixed physics step (`dt` in seconds). */
  step(dt: number, player: { x: number }): void {
    if (this.dead) return;
    const ms = dt * 1000;
    const b = this.body;
    const grounded = b.blocked.down;

    if (this.invulnerableMs > 0) {
      this.invulnerableMs -= ms;
      this.setAlpha(Math.floor(this.invulnerableMs / 80) % 2 === 0 ? 1 : 0.4);
      if (this.invulnerableMs <= 0) this.setAlpha(1);
    }

    if (!grounded) {
      this.anims.stop();
      this.setFrame(SLIME_KING_AIR_FRAME);
      this.wasGrounded = false;
      return;
    }
    if (!this.wasGrounded) {
      // Just landed.
      this.wasGrounded = true;
      b.setVelocityX(0);
      this.play(AnimKey.SLIME_KING_IDLE);
      if (this.leaping) {
        this.leaping = false;
        const speed = this.enraged ? BOSS.SHOCKWAVE_SPEED_ENRAGED : BOSS.SHOCKWAVE_SPEED;
        this.emit(BossEvent.SLAM, this.x, this.y, speed);
      }
    }
    // Slide to a stop after a knockback.
    b.setVelocityX(b.velocity.x * 0.8);
    if (!this.fighting) return;

    this.restMs -= ms;
    if (this.restMs > 0) return;

    const dir = player.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    this.moves++;
    if (this.moves % BOSS.LEAP_EVERY === 0) {
      // Big leap that lands about where the player is now.
      const airTime = (2 * -BOSS.LEAP_VY) / PHYSICS.GRAVITY;
      const vx = Phaser.Math.Clamp((player.x - this.x) / airTime, -BOSS.LEAP_MAX_VX, BOSS.LEAP_MAX_VX);
      b.setVelocity(vx, BOSS.LEAP_VY);
      this.leaping = true;
    } else {
      b.setVelocity(dir * BOSS.HOP_VX, BOSS.HOP_VY);
    }
    this.restMs = this.enraged ? BOSS.REST_MS_ENRAGED : BOSS.REST_MS;
  }

  /**
   * Take `damage` from hit `hitId` (a sword swing, an axe, or a stomp) coming
   * from `fromX`. Returns null while invulnerable or if this hit already
   * counted.
   */
  hit(hitId: number, damage: number, fromX: number): "hit" | "defeated" | null {
    if (this.dead || !this.fighting || this.invulnerableMs > 0 || hitId === this.lastHitId) return null;
    this.lastHitId = hitId;
    this.hp = Math.max(0, this.hp - damage);
    if (this.hp === 0) {
      this.defeat();
      return "defeated";
    }
    this.invulnerableMs = BOSS.INVULNERABLE_MS;
    if (this.body.blocked.down) this.body.setVelocityX((this.x < fromX ? -1 : 1) * BOSS.KNOCKBACK_VX);
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (!this.active) return;
      this.clearTint();
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    });
    return "hit";
  }

  private defeat(): void {
    this.dead = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.anims.stop();
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.4,
      scaleY: 0.2,
      alpha: 0,
      duration: 700,
      ease: "Quad.easeIn",
      onComplete: () => this.destroy(),
    });
  }
}
