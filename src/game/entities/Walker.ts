import type * as Phaser from "phaser";
import { ENEMY } from "../config";
import type { EnemySpawn } from "../levels/level";
import { AnimKey, SLIME_SQUASHED_FRAME, TextureKey } from "../textures";
import { Enemy } from "./Enemy";

/**
 * Walker (CB-4): a slime that walks back and forth and turns around at walls
 * and at the ends of its patrol area.
 */
export class Walker extends Enemy {
  constructor(scene: Phaser.Scene, spawn: EnemySpawn) {
    super(scene, spawn, TextureKey.SLIME, { width: ENEMY.HITBOX_WIDTH, height: ENEMY.HITBOX_HEIGHT });
    this.play(AnimKey.SLIME_WALK);
  }

  protected act(): void {
    const b = this.body;
    const { minX, maxX, speed } = this.spawn;
    if (this.dir > 0 && (b.blocked.right || b.right >= maxX)) this.dir = -1;
    else if (this.dir < 0 && (b.blocked.left || b.left <= minX)) this.dir = 1;
    b.setVelocityX(this.dir * speed);
    this.setFlipX(this.dir < 0); // art faces right
  }

  protected showSquashed(): void {
    this.setFrame(SLIME_SQUASHED_FRAME);
  }
}
