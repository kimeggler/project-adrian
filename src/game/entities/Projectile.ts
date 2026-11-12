import * as Phaser from "phaser";
import { PROJECTILE } from "../config";
import { TextureKey } from "../textures";

/**
 * A shooter's rock: flies straight (no gravity), breaks on walls, after
 * PROJECTILE.MAX_DISTANCE, on the player, or when hit by the sword.
 */
export class Projectile extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly startX: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly dir: -1 | 1,
    private readonly speed: number,
    readonly damage: number,
  ) {
    super(scene, x, y, TextureKey.ROCK);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.startX = x;
    this.body.setAllowGravity(false);
    this.body.setSize(PROJECTILE.HITBOX, PROJECTILE.HITBOX);
  }

  /**
   * Start flying. Call after adding the rock to its physics group: adding a
   * body to a group applies the group's defaults, which resets velocity.
   */
  launch(): this {
    this.body.setVelocityX(this.dir * this.speed);
    return this;
  }

  /** Called every physics step; returns false once the rock is gone. */
  step(): boolean {
    if (!this.active) return false;
    if (Math.abs(this.x - this.startX) > PROJECTILE.MAX_DISTANCE) {
      this.destroy();
      return false;
    }
    return true;
  }
}
