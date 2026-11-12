import type * as Phaser from "phaser";
import { SHOOTER } from "../config";
import type { EnemySpawn } from "../levels/level";
import { TextureKey, TOTEM_FRAME } from "../textures";
import { Enemy } from "./Enemy";

export type FireHandler = (x: number, y: number, dir: -1 | 1, speed: number, damage: number) => void;

/**
 * Shooter (CB-4): a stone totem that stays where it is. When the player is in
 * range it turns to face them, glows for SHOOTER.CHARGE_MS as a warning, and
 * fires a rock at fixed intervals.
 */
export class Shooter extends Enemy {
  /** Time until it may start charging the next shot (ms). */
  private cooldownMs: number;
  /** > 0 while charging a shot (ms left). */
  private chargeMs = 0;

  constructor(
    scene: Phaser.Scene,
    spawn: EnemySpawn,
    private readonly fire: FireHandler,
  ) {
    super(scene, spawn, TextureKey.TOTEM, { width: SHOOTER.HITBOX_WIDTH, height: SHOOTER.HITBOX_HEIGHT });
    // Don't fire the moment the player walks into range.
    this.cooldownMs = spawn.fireIntervalMs / 2;
  }

  protected act(dt: number, player: { x: number; y: number }): void {
    const ms = dt * 1000;
    this.body.setVelocityX(0);

    const inRange =
      Math.abs(player.x - this.x) <= SHOOTER.RANGE_X && Math.abs(player.y - this.y) <= SHOOTER.RANGE_Y;

    if (this.chargeMs > 0) {
      this.chargeMs -= ms;
      if (this.chargeMs <= 0) {
        this.setFrame(TOTEM_FRAME.IDLE);
        const mouthX = this.x + this.dir * (this.body.width / 2 + 2);
        this.fire(mouthX, this.y - SHOOTER.MOUTH_Y, this.dir, this.spawn.projectileSpeed, this.spawn.damage);
        this.cooldownMs = this.spawn.fireIntervalMs;
      }
      return;
    }

    this.cooldownMs = Math.max(0, this.cooldownMs - ms);
    if (!inRange) return;
    this.dir = player.x < this.x ? -1 : 1;
    this.setFlipX(this.dir < 0); // art faces right
    if (this.cooldownMs > 0) return;
    this.chargeMs = SHOOTER.CHARGE_MS;
    this.setFrame(TOTEM_FRAME.CHARGE);
  }
}
