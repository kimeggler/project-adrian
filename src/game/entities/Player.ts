import * as Phaser from "phaser";
import { PHYSICS, PLACEHOLDER_COLORS, PLAYER } from "../config";
import { TextureKey } from "../textures";
import type { PlayerInput } from "../systems/Input";

export type PlayerState = "idle" | "run" | "jump" | "fall" | "hurt";

/** Snapshot for the F1 debug overlay. */
export interface PlayerDebugInfo {
  vx: number;
  vy: number;
  grounded: boolean;
  coyoteMs: number;
  bufferMs: number;
  state: PlayerState;
}

/** Move `value` toward `target` by at most `maxDelta`. */
function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

/**
 * The little knight.
 *
 * All movement logic runs in `step()`, which the scene calls from the Arcade
 * physics WORLD_STEP event. That event fires once per fixed physics step, after
 * collisions are resolved, so the player behaves the same at any refresh rate.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  private coyoteMs = 0;
  private bufferMs = 0;
  /** True while rising from a jump the player can still cut short. */
  private jumpCuttable = false;
  private _state: PlayerState = "idle";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: PlayerInput,
  ) {
    super(scene, x, y, TextureKey.PLAYER);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.body.setSize(PLAYER.HITBOX_WIDTH, PLAYER.HITBOX_HEIGHT);
    this.body.setOffset(
      (PLAYER.WIDTH - PLAYER.HITBOX_WIDTH) / 2,
      PLAYER.HEIGHT - PLAYER.HITBOX_HEIGHT,
    );
    // Horizontal speed is controlled in step(); only cap the fall speed.
    this.body.setMaxVelocity(10000, PHYSICS.MAX_FALL_SPEED);
    this.applyStateVisuals();
  }

  get playerState(): PlayerState {
    return this._state;
  }

  get grounded(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  /** Advance the controller by one fixed physics step (`dt` in seconds). */
  step(dt: number): void {
    const body = this.body;
    const dtMs = dt * 1000;
    const grounded = this.grounded;

    // --- Timers -----------------------------------------------------------
    if (grounded) {
      this.coyoteMs = PHYSICS.COYOTE_TIME_MS;
    } else {
      this.coyoteMs = Math.max(0, this.coyoteMs - dtMs);
    }

    if (this.controls.consumeJumpPress()) {
      this.bufferMs = PHYSICS.JUMP_BUFFER_MS;
    } else {
      this.bufferMs = Math.max(0, this.bufferMs - dtMs);
    }

    // --- Horizontal movement ------------------------------------------------
    const dir = this.controls.direction;
    const control = grounded ? 1 : PHYSICS.AIR_CONTROL;
    const target = dir * PHYSICS.RUN_SPEED;
    let rate: number;
    if (dir === 0) {
      rate = PHYSICS.DECELERATION;
    } else if (Math.sign(body.velocity.x) === -dir) {
      // Turning around: brake at least as hard as when stopping.
      rate = Math.max(PHYSICS.ACCELERATION, PHYSICS.DECELERATION);
    } else {
      rate = PHYSICS.ACCELERATION;
    }
    body.setVelocityX(approach(body.velocity.x, target, rate * control * dt));

    // --- Jump (with coyote time and buffering) -------------------------------
    if (this.bufferMs > 0 && this.coyoteMs > 0) {
      body.setVelocityY(PHYSICS.JUMP_VELOCITY);
      this.bufferMs = 0;
      this.coyoteMs = 0;
      this.jumpCuttable = true;
    }

    // --- Variable jump height ------------------------------------------------
    if (this.jumpCuttable) {
      if (body.velocity.y >= 0) {
        this.jumpCuttable = false;
      } else if (!this.controls.jumpHeld) {
        body.setVelocityY(body.velocity.y * PHYSICS.JUMP_CUT_FACTOR);
        this.jumpCuttable = false;
      }
    }

    if (dir !== 0) this.setFlipX(dir < 0);
    this.updateState(grounded);
  }

  /** Put the player at a spawn point with no velocity or pending input. */
  respawn(x: number, y: number): void {
    this.body.reset(x, y);
    this.coyoteMs = 0;
    this.bufferMs = 0;
    this.jumpCuttable = false;
    this.controls.consumeJumpPress();
    this.updateState(false);
  }

  get debugInfo(): PlayerDebugInfo {
    return {
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      grounded: this.grounded,
      coyoteMs: this.coyoteMs,
      bufferMs: this.bufferMs,
      state: this._state,
    };
  }

  private updateState(grounded: boolean): void {
    // "hurt" is set by the damage system (phase 3).
    let next: PlayerState;
    const vy = this.body.velocity.y;
    if (!grounded) {
      next = vy < 0 ? "jump" : "fall";
    } else if (Math.abs(this.body.velocity.x) > PLAYER.IDLE_THRESHOLD) {
      next = "run";
    } else {
      next = "idle";
    }
    if (next !== this._state) {
      this._state = next;
      this.applyStateVisuals();
    }
  }

  /** Placeholder visuals: one color per animation state (real art in phase 5). */
  private applyStateVisuals(): void {
    const color = PLACEHOLDER_COLORS.PLAYER[this._state];
    this.setTint(Phaser.Display.Color.HexStringToColor(color).color);
  }
}
