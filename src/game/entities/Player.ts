import * as Phaser from "phaser";
import { HEALTH, JUICE, PHYSICS, PLAYER } from "../config";
import { AnimKey, TextureKey } from "../textures";
import type { PlayerInput } from "../systems/Input";

export type PlayerState = "idle" | "run" | "jump" | "fall" | "hurt";

/** Events the player emits so the scene can add dust, shake and sound. */
export const PlayerEvent = {
  JUMP: "jump",
  /** Payload: landing speed in px/s. */
  LAND: "land",
  /** Started braking to turn around. Payload: new direction (-1 / 1). */
  TURN: "turn",
  HURT: "hurt",
} as const;

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

const STATE_ANIMS: Record<PlayerState, string> = {
  idle: AnimKey.KNIGHT_IDLE,
  run: AnimKey.KNIGHT_RUN,
  jump: AnimKey.KNIGHT_JUMP,
  fall: AnimKey.KNIGHT_FALL,
  hurt: AnimKey.KNIGHT_HURT,
};

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
 *
 * The Player object itself is the (invisible) physics body. What you see is a
 * separate `view` sprite that follows it after every physics update. Arcade
 * scales hitboxes with the sprite's scale, so squash and stretch on the body
 * would change collisions; on the view it is purely cosmetic.
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
  /** For landing / turning detection. */
  private wasGrounded = false;
  private lastVy = 0;
  private turning = false;
  private squashTween?: Phaser.Tweens.Tween;
  /** The visible knight (animations, flip, squash, flash, blink). */
  readonly view: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: PlayerInput,
  ) {
    super(scene, x, y, TextureKey.PLAYER, 0);
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
    this.setVisible(false);

    this.view = scene.add.sprite(x, y, TextureKey.PLAYER, 0).setOrigin(0.5, 1);
    this.view.play(STATE_ANIMS.idle);
    // POST_UPDATE runs after Arcade has moved the body for this frame.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
      this.view.destroy();
    });
  }

  private syncView(): void {
    this.view.setPosition(this.x, this.y);
  }

  get playerState(): PlayerState {
    return this._state;
  }

  get invincible(): boolean {
    return this.invincibleMs > 0;
  }

  /**
   * Standing on solid tiles. Only `blocked` counts: Arcade also sets
   * `touching` for overlaps (coins, flags, checkpoints), which would let the
   * player jump off a coin in mid-air. Moving platforms (P2) will need their
   * own check here.
   */
  get grounded(): boolean {
    return this.body.blocked.down;
  }

  /** Advance the controller by one fixed physics step (`dt` in seconds). */
  step(dt: number): void {
    const body = this.body;
    const dtMs = dt * 1000;
    const grounded = this.grounded;

    if (grounded && !this.wasGrounded) {
      const impact = this.lastVy;
      if (impact >= JUICE.MIN_LAND_SPEED) this.squash(JUICE.SQUASH);
      this.emit(PlayerEvent.LAND, impact);
    }

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
      this.endStep(grounded);
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
    const braking = dir !== 0 && Math.sign(body.velocity.x) === -dir;
    let rate: number;
    if (dir === 0) {
      rate = PHYSICS.DECELERATION;
    } else if (braking) {
      // Turning around: brake at least as hard as when stopping.
      rate = Math.max(PHYSICS.ACCELERATION, PHYSICS.DECELERATION);
    } else {
      rate = PHYSICS.ACCELERATION;
    }
    const turnNow = braking && grounded && Math.abs(body.velocity.x) > JUICE.MIN_TURN_SPEED;
    if (turnNow && !this.turning) this.emit(PlayerEvent.TURN, dir);
    this.turning = turnNow;
    body.setVelocityX(approach(body.velocity.x, target, rate * control * dt));

    // --- Jump (with coyote time and buffering) -------------------------------
    if (this.bufferMs > 0 && this.coyoteMs > 0) {
      body.setVelocityY(PHYSICS.JUMP_VELOCITY);
      this.bufferMs = 0;
      this.coyoteMs = 0;
      this.jumpCuttable = true;
      this.squash(JUICE.STRETCH);
      this.emit(PlayerEvent.JUMP);
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

    if (dir !== 0) this.view.setFlipX(dir < 0);
    this.endStep(grounded);
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
    this.flash();
    this.updateState(false);
    this.emit(PlayerEvent.HURT);
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
    this.wasGrounded = true; // no landing puff on respawn
    this.lastVy = 0;
    this.turning = false;
    this.controls.consumeJumpPress();
    this.squashTween?.stop();
    this.view.setScale(1);
    this.syncView();
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

  private endStep(grounded: boolean): void {
    this.wasGrounded = grounded;
    this.lastVy = this.body.velocity.y;
    this.updateState(grounded);
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
      this.view.play(STATE_ANIMS[next], true);
    }
  }

  /** Squash or stretch the sprite, then ease back (GF-3). Feet stay put (origin at the bottom). */
  private squash(scale: { x: number; y: number }): void {
    this.squashTween?.stop();
    this.view.setScale(scale.x, scale.y);
    this.squashTween = this.scene.tweens.add({
      targets: this.view,
      scaleX: 1,
      scaleY: 1,
      duration: JUICE.SQUASH_MS,
      ease: "Quad.easeOut",
    });
  }

  /** Brief white flash when hit (GF-4). */
  private flash(): void {
    this.view.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(JUICE.HIT_FLASH_MS, () => {
      this.view.clearTint();
      this.view.setTintMode(Phaser.TintModes.MULTIPLY);
    });
  }

  /** Blink while invincible (GF-4). Driven by physics time, not frame rate. */
  private updateBlink(): void {
    const off =
      this.invincibleMs > 0 &&
      Math.floor(this.invincibleMs / HEALTH.BLINK_MS) % 2 === 1;
    this.view.setAlpha(off ? 0.25 : 1);
  }
}
