import * as Phaser from "phaser";
import { PHYSICS, POWERUP } from "../config";
import { AnimKey, TextureKey } from "../textures";

let nextHitId = -1;

/**
 * The throwing axe (CB-6 temporary weapon): flies in an arc and spins. Breaks
 * on walls and floors, on the first enemy it hits, or when it falls out of
 * the level.
 */
export class ThrownAxe extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  /**
   * Hit id for Enemy.swordHit. Negative, so it never matches a sword swing,
   * and unique per axe, so each axe hits an enemy once.
   */
  readonly hitId = nextHitId--;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly facing: 1 | -1,
  ) {
    super(scene, x, y, TextureKey.AXE_SPIN, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(POWERUP.AXE_HITBOX, POWERUP.AXE_HITBOX);
    this.body.setMaxVelocity(10000, PHYSICS.MAX_FALL_SPEED);
    this.setFlipX(facing < 0).play(AnimKey.AXE_SPIN);
  }

  /** Start flying. Call after adding to the physics group (groups reset velocity). */
  launch(): this {
    this.body.setVelocity(this.facing * POWERUP.AXE_THROW_VX, POWERUP.AXE_THROW_VY);
    return this;
  }
}
