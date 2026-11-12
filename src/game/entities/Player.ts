import * as Phaser from "phaser";
import { HEALTH, PHYSICS, PLACEHOLDER_COLORS, PLAYER } from "../config";
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
  invincibleMs: number;
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
  /** Controls are locked while > 0 (knockback after a hit). */
  private stunMs = 0;
  /** Can't take damage while > 0. */
  private invincibleMs = 0;

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

  get invincible(): boolean {
    return this.invincibleMs > 0;
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

    this.invincibleMs = Math.max(0, this.invincibleMs - dtMs);
    this.updateBlink();

    if (this.stunMs > 0) {
      // Knocked back: no control, but keep falling and drop any jump input.
      this.stunMs = Math.max(0, this.stunMs - dtMs);
      this.controls.consumeJumpPress();
      this.bufferMs = 0;
      this.updateState(grounded);
      return;
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

  /**
   * Take a hit from a hazard at `sourceX`: knockback away from it, a short
   * stun, then invincibility frames. Returns false if currently invincible.
   */
  hurt(sourceX: number): boolean {
    if (this.invincible) return false;
    const away = this.x < sourceX ? -1 : 1;
    this.body.setVelocity(away * HEALTH.KNOCKBACK_VX, HEALTH.KNOCKBACK_VY);
    this.stunMs = HEALTH.HURT_STUN_MS;
    this.invincibleMs = HEALTH.INVINCIBLE_MS;
    this.jumpCuttable = false;
    this.updateState(false);
    return true;
  }

  /**
   * Put the player at a spawn point with no velocity or pending input.
   * `invincible` gives fresh invincibility frames (after losing a life).
   */
  respawn(x: number, y: number, invincible = false): void {
    this.body.reset(x, y);
    this.coyoteMs = 0;
    this.bufferMs = 0;
    this.stunMs = 0;
    this.invincibleMs = invincible ? HEALTH.INVINCIBLE_MS : 0;
    this.jumpCuttable = false;
    this.controls.consumeJumpPress();
    this.updateBlink();
    this.updateState(false);
  }

  get debugInfo(): PlayerDebugInfo {
    return {
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      grounded: this.grounded,
      coyoteMs: this.coyoteMs,
      bufferMs: this.bufferMs,
      invincibleMs: this.invincibleMs,
      state: this._state,
    };
  }

  private updateState(grounded: boolean): void {
    let next: PlayerState;
    const vy = this.body.velocity.y;
    if (this.stunMs > 0) {
      next = "hurt";
    } else if (!grounded) {
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

  /** Blink while invincible (GF-4). Driven by physics time, not frame rate. */
  private updateBlink(): void {
    const off =
      this.invincibleMs > 0 &&
      Math.floor(this.invincibleMs / HEALTH.BLINK_MS) % 2 === 1;
    this.setAlpha(off ? 0.25 : 1);
  }

  /** Placeholder visuals: one color per animation state (real art in phase 5). */
  private applyStateVisuals(): void {
    const color = PLACEHOLDER_COLORS.PLAYER[this._state];
    this.setTint(Phaser.Display.Color.HexStringToColor(color).color);
  }
}
