import * as Phaser from "phaser";
import { BOSS, TILE } from "../config";
import type { BossArena as ArenaSpec } from "../levels/level";
import { TextureKey } from "../textures";
import { Boss } from "./Boss";

export type ArenaEvent = "closed" | "opened";

/**
 * Boss arena (CB-8): the right gate is shut from the start; the left gate
 * slams shut once the player is inside, which starts the fight. Beating the
 * boss opens the right gate to the flag. Losing a life resets the fight:
 * the left gate opens again and the boss starts over at full HP.
 */
export class BossArena {
  readonly boss: Boss;
  /** Solid gate tiles (player, boss and shockwaves collide with these). */
  readonly gates: Phaser.Physics.Arcade.StaticGroup;
  private leftGate: Phaser.Physics.Arcade.Image[] = [];
  private rightGate: Phaser.Physics.Arcade.Image[] = [];
  private closed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spec: ArenaSpec,
    private readonly notify: (event: ArenaEvent) => void,
  ) {
    this.gates = scene.physics.add.staticGroup();
    this.rightGate = this.buildGate(spec.rightGateCol);
    this.boss = new Boss(scene, spec);
  }

  /** The fight is on: gate closed, boss alive (the HUD shows its health). */
  get fighting(): boolean {
    return this.closed && this.boss.alive;
  }

  /** Called every fixed physics step. */
  step(dt: number, player: { x: number }): void {
    const trigger = (this.spec.leftGateCol + 1 + BOSS.CLOSE_AFTER_TILES) * TILE;
    if (!this.closed && this.boss.alive && player.x > trigger) {
      this.closed = true;
      this.leftGate = this.buildGate(this.spec.leftGateCol);
      this.boss.startFight();
      this.notify("closed");
    }
    this.boss.step(dt, player);
  }

  /** The player lost a life: open up and start the fight over. */
  reset(): void {
    if (!this.boss.alive) return;
    this.removeGate(this.leftGate);
    this.leftGate = [];
    this.closed = false;
    this.boss.reset();
  }

  /** The boss is beaten: lift the right gate. */
  open(): void {
    const tiles = this.rightGate;
    this.rightGate = [];
    for (const t of tiles) t.disableBody(false, false);
    this.scene.tweens.add({
      targets: tiles,
      y: `-=${this.spec.floorRow * TILE}`,
      duration: 900,
      ease: "Quad.easeIn",
      onComplete: () => tiles.forEach((t) => t.destroy()),
    });
    this.notify("opened");
  }

  /** A column of gate tiles from the top of the level down to the floor. */
  private buildGate(col: number): Phaser.Physics.Arcade.Image[] {
    const tiles: Phaser.Physics.Arcade.Image[] = [];
    for (let r = 0; r < this.spec.floorRow; r++) {
      const img = this.scene.physics.add.staticImage(col * TILE + TILE / 2, r * TILE + TILE / 2, TextureKey.GATE);
      img.setDepth(4);
      this.gates.add(img);
      tiles.push(img);
    }
    return tiles;
  }

  private removeGate(tiles: Phaser.Physics.Arcade.Image[]): void {
    for (const t of tiles) {
      this.gates.remove(t);
      t.destroy();
    }
  }
}
