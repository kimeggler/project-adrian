import * as Phaser from "phaser";
import {
  ENEMY,
  HEALTH,
  JUICE,
  PHYSICS,
  PLAYER,
  POWERUP,
  SWORD,
  SWORD_UPGRADES,
  type PowerUpKind,
  type SwordStats,
} from "../config";
import { PowerUps } from "../systems/PowerUps";
import { swordHitbox, type Rect } from "../systems/Combat";
import { getCharacter, type Character } from "../characters";
import { heroAnimKey, heroTextureKey, TextureKey } from "../textures";
import type { PlayerInput } from "../systems/Input";

export type PlayerState = "idle" | "run" | "jump" | "fall" | "hurt" | "attack";

/** Events the player emits so the scene can add dust, shake and sound. */
export const PlayerEvent = {
  JUMP: "jump",
  /** Payload: landing speed in px/s. */
  LAND: "land",
  /** Started braking to turn around. Payload: new direction (-1 / 1). */
  TURN: "turn",
  HURT: "hurt",
  /** A sword swing started. */
  ATTACK: "attack",
  /** Throwing axe released (CB-6). Payload: x, y, facing. */
  THROW_AXE: "throw-axe",
  /** A power-up ran out. Payload: kind. */
  POWERUP_END: "powerup-end",
  /** Running fast with speed boots: a puff of dust trails behind. */
  TRAIL: "trail",
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
  /** Sword swoosh, shown where the sword hitbox is while it's active. */
  private readonly slash: Phaser.GameObjects.Image;
  private facing: 1 | -1 = 1;
  /** Sword hitbox active while > 0 (ms). */
  private attackMs = 0;
  /** Time until the next swing is allowed (ms). */
  private attackCooldownMs = 0;
  /** Increases with every swing, so each swing hits an enemy only once. */
  private swingId = 0;
  /** Current sword (CB-5 upgrades). */
  private sword: SwordStats = SWORD_UPGRADES[0];
  /** Active power-ups and their timers (CB-6). */
  readonly powerUps = new PowerUps();
  private axeCooldownMs = 0;
  /** Shows the attack pose briefly after throwing an axe (ms). */
  private throwPoseMs = 0;
  private trailSteps = 0;
  /** Bubble drawn around the knight while the shield is active. */
  private readonly bubble: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: PlayerInput,
    /** Which hero this is (CB-9): sprite set and small stat differences. */
    readonly character: Character = getCharacter("knight"),
  ) {
    super(scene, x, y, heroTextureKey(character.id), 0);
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

    // Drawn above enemies and pickups.
    this.view = scene.add.sprite(x, y, heroTextureKey(character.id), 0).setOrigin(0.5, 1).setDepth(10);
    this.view.play(heroAnimKey(character.id, "idle"));
    this.slash = scene.add.image(x, y, TextureKey.SLASH).setOrigin(0, 0).setDepth(11).setVisible(false);
    this.bubble = scene.add.image(x, y, TextureKey.SHIELD_BUBBLE).setDepth(12).setVisible(false);
    // POST_UPDATE runs after Arcade has moved the body for this frame.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
      this.view.destroy();
      this.slash.destroy();
      this.bubble.destroy();
    });
  }

  private syncView(): void {
    this.view.setPosition(this.x, this.y);
    this.bubble
      .setPosition(this.x, this.y - PLAYER.HEIGHT / 2)
      .setVisible(this.powerUps.has("shield") && this.powerUps.visible("shield"));
    const box = this.swordBox;
    this.slash.setVisible(box !== null);
    if (box) {
      // Center the 9 px tall swoosh on the hitbox; flip it when facing left.
      this.slash
        .setFlipX(this.facing < 0)
        .setPosition(box.x, box.y + (box.height - this.slash.displayHeight) / 2)
        .setAlpha(Math.min(1, this.attackMs / (SWORD.ACTIVE_MS / 2)));
    }
  }

  /** The active sword hitbox, or null between swings (CB-2). */
  get swordBox(): Rect | null {
    return this.attackMs > 0 ? swordHitbox(this.body, this.facing, this.sword.range) : null;
  }

  /** Damage of the current sword. */
  get swordDamage(): number {
    return this.sword.damage;
  }

  /** Equip a sword upgrade (CB-5). The slash sprite stretches to the reach. */
  setSword(stats: SwordStats): void {
    this.sword = stats;
    this.slash.setScale(stats.range / this.slash.frame.width, 1);
  }

  /** Identifies the current swing (see `swordBox`). */
  get swing(): number {
    return this.swingId;
  }

  get playerState(): PlayerState {
    return this._state;
  }

  /** Can't be hurt: after a hit, after respawning, or while shielded. */
  get invincible(): boolean {
    return this.invincibleMs > 0 || this.shielded;
  }

  get shielded(): boolean {
    return this.powerUps.has("shield");
  }

  /** Pick up a power-up (or restart its timer). */
  addPowerUp(kind: PowerUpKind): void {
    this.powerUps.add(kind);
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
    this.attackMs = Math.max(0, this.attackMs - dtMs);
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - dtMs);
    this.axeCooldownMs = Math.max(0, this.axeCooldownMs - dtMs);
    this.throwPoseMs = Math.max(0, this.throwPoseMs - dtMs);
    for (const kind of this.powerUps.step(dtMs)) this.emit(PlayerEvent.POWERUP_END, kind);
    this.updateBlink();

    if (this.stunMs > 0) {
      // Knocked back: no control, but keep falling and drop any jump input.
      this.stunMs = Math.max(0, this.stunMs - dtMs);
      this.controls.consumeJumpPress();
      this.controls.consumeAttackPress();
      this.bufferMs = 0;
      this.endStep(grounded);
      return;
    }

    // --- Attack: sword (PL-9, CB-2), or the throwing axe while active (CB-6) ---
    if (this.controls.consumeAttackPress()) {
      if (this.powerUps.has("axe")) {
        if (this.axeCooldownMs <= 0) {
          this.axeCooldownMs = POWERUP.AXE_COOLDOWN_MS;
          this.throwPoseMs = SWORD.ACTIVE_MS;
          this.emit(PlayerEvent.THROW_AXE, this.x, this.y - PLAYER.HEIGHT / 2, this.facing);
        }
      } else if (this.attackCooldownMs <= 0) {
        this.attackMs = SWORD.ACTIVE_MS;
        this.attackCooldownMs = this.sword.cooldownMs * this.character.stats.swordCooldown;
        this.swingId++;
        this.emit(PlayerEvent.ATTACK);
      }
    }

    if (this.controls.consumeJumpPress()) {
      this.bufferMs = PHYSICS.JUMP_BUFFER_MS;
    } else {
      this.bufferMs = Math.max(0, this.bufferMs - dtMs);
    }

    // --- Horizontal movement ------------------------------------------------
    const dir = this.controls.direction;
    const control = grounded ? 1 : PHYSICS.AIR_CONTROL;
    const runSpeed =
      PHYSICS.RUN_SPEED *
      this.character.stats.runSpeed *
      (this.powerUps.has("boots") ? POWERUP.BOOTS_SPEED : 1);
    const target = dir * runSpeed;
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

    if (this.powerUps.has("boots") && grounded && Math.abs(body.velocity.x) > PHYSICS.RUN_SPEED) {
      if (++this.trailSteps % 6 === 0) this.emit(PlayerEvent.TRAIL);
    }

    // Don't turn around in the middle of a swing.
    if (dir !== 0 && this.attackMs <= 0) this.facing = dir;
    this.view.setFlipX(this.facing < 0);
    this.endStep(grounded);
  }

  /**
   * Bounce off an enemy after stomping it. Holding jump bounces higher, and
   * letting go early cuts the bounce like a normal jump.
   */
  bounce(): void {
    const held = this.controls.jumpHeld;
    this.body.setVelocityY(held ? ENEMY.STOMP_BOUNCE_HELD : ENEMY.STOMP_BOUNCE);
    this.jumpCuttable = held;
    this.coyoteMs = 0;
    this.bufferMs = 0;
    this.squash(JUICE.STRETCH);
    this.updateState(false);
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
    this.attackMs = 0;
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
    // Losing a life (respawning with invincibility) also loses power-ups.
    if (invincible) this.powerUps.clear();
    this.jumpCuttable = false;
    this.wasGrounded = true; // no landing puff on respawn
    this.lastVy = 0;
    this.turning = false;
    this.controls.consumeJumpPress();
    this.controls.consumeAttackPress();
    this.attackMs = 0;
    this.attackCooldownMs = 0;
    this.axeCooldownMs = 0;
    this.throwPoseMs = 0;
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
    } else if (this.attackMs > 0 || this.throwPoseMs > 0) {
      next = "attack";
    } else if (!grounded) {
      next = vy < 0 ? "jump" : "fall";
    } else if (Math.abs(this.body.velocity.x) > PLAYER.IDLE_THRESHOLD) {
      next = "run";
    } else {
      next = "idle";
    }
    if (next !== this._state) {
      this._state = next;
      this.view.play(heroAnimKey(this.character.id, next), true);
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
