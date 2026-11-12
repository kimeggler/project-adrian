import type * as Phaser from "phaser";
import { JUMPER, PHYSICS } from "../config";
import type { EnemySpawn } from "../levels/level";
import { HOPPER_FRAME, TextureKey } from "../textures";
import { Enemy } from "./Enemy";

/** Expected horizontal distance of one hop (px), to turn before leaving the patrol area. */
const hopDistance = (speed: number) => ((2 * -JUMPER.JUMP_VELOCITY) / PHYSICS.GRAVITY) * speed;

/**
 * Jumper (CB-4): a hopper that sits for a moment, then hops along its patrol
 * area, turning around before a hop would take it past the ends.
 */
export class Jumper extends Enemy {
  private waitMs: number;

  constructor(scene: Phaser.Scene, spawn: EnemySpawn) {
    super(scene, spawn, TextureKey.HOPPER, { width: JUMPER.HITBOX_WIDTH, height: JUMPER.HITBOX_HEIGHT });
    // Different hoppers start at different moments (based on position, so
    // the same seed still plays the same).
    this.waitMs = (spawn.x * 7) % JUMPER.JUMP_INTERVAL_MS;
  }

  protected act(dt: number): void {
    const b = this.body;
    const grounded = b.blocked.down;
    this.setFrame(grounded ? HOPPER_FRAME.CROUCH : HOPPER_FRAME.AIR);
    if (!grounded) {
      // Bumped into a wall mid-hop: turn around for the next one.
      if ((b.blocked.left && this.dir < 0) || (b.blocked.right && this.dir > 0)) this.dir = -this.dir as -1 | 1;
      return;
    }

    b.setVelocityX(0);
    this.waitMs -= dt * 1000;
    if (this.waitMs > 0) return;

    const { minX, maxX, speed } = this.spawn;
    const reach = hopDistance(speed) + 2;
    if (this.dir > 0 && b.right + reach > maxX) this.dir = -1;
    else if (this.dir < 0 && b.left - reach < minX) this.dir = 1;

    b.setVelocity(this.dir * speed, JUMPER.JUMP_VELOCITY);
    this.setFlipX(this.dir < 0);
    this.waitMs = JUMPER.JUMP_INTERVAL_MS;
  }
}
