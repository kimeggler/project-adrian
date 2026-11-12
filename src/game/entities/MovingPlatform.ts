import * as Phaser from "phaser";
import { PLATFORM } from "../config";
import type { MovingPlatform as PlatformSpec } from "../levels/level";
import { TextureKey } from "../textures";

/**
 * A platform riding back and forth over a pit (WO-10). It rests at each end
 * so the player can step on and off. Arcade carries a player standing on an
 * immovable, moving body along with it (body friction) and reports the
 * player as `blocked.down`, so jumping and landing work as on the ground.
 */
export class MovingPlatform extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  private dir: 1 | -1 = 1;
  private restMs = PLATFORM.PAUSE_MS;

  constructor(
    scene: Phaser.Scene,
    private readonly spec: PlatformSpec,
  ) {
    super(scene, spec.fromX, spec.y, TextureKey.PLATFORM);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0, 0);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    // Only the top is solid: the player can jump up through it from below.
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
  }

  /** Called every fixed physics step (`dt` in seconds). */
  step(dt: number): void {
    const b = this.body;
    if (this.restMs > 0) {
      this.restMs -= dt * 1000;
      b.setVelocityX(0);
      return;
    }
    const { fromX, toX } = this.spec;
    if ((this.dir > 0 && this.x >= toX) || (this.dir < 0 && this.x <= fromX)) {
      // Arrived: snap to the end, rest, then turn around.
      b.reset(this.dir > 0 ? toX : fromX, this.spec.y);
      this.dir = this.dir > 0 ? -1 : 1;
      this.restMs = PLATFORM.PAUSE_MS;
      return;
    }
    b.setVelocityX(this.dir * PLATFORM.SPEED);
  }
}
