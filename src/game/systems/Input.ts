import * as Phaser from "phaser";
import { GAMEPAD } from "../config";

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

/** Default key bindings (PL-2, PL-9). */
export const KEY_BINDINGS = {
  left: [KeyCodes.LEFT, KeyCodes.A],
  right: [KeyCodes.RIGHT, KeyCodes.D],
  jump: [KeyCodes.SPACE, KeyCodes.W, KeyCodes.UP],
  attack: [KeyCodes.J, KeyCodes.X],
} as const;

/** Registry key of the shared VirtualPad. */
export const VIRTUAL_PAD_KEY = "virtualPad";

/**
 * On-screen touch buttons (PL-7). The HUD scene writes to it, the player
 * input reads it. One instance per game, kept in the game registry.
 */
export class VirtualPad {
  left = false;
  right = false;
  private jumpDown = false;
  private jumpLatched = false;
  private attackLatched = false;

  /** Sword button tapped (PL-9). */
  pressAttack(): void {
    this.attackLatched = true;
  }

  consumeAttackPress(): boolean {
    const pressed = this.attackLatched;
    this.attackLatched = false;
    return pressed;
  }

  get jumpHeld(): boolean {
    return this.jumpDown;
  }

  setJump(down: boolean): void {
    if (down && !this.jumpDown) this.jumpLatched = true;
    this.jumpDown = down;
  }

  consumeJumpPress(): boolean {
    const pressed = this.jumpLatched;
    this.jumpLatched = false;
    return pressed;
  }

  reset(): void {
    this.left = this.right = this.jumpDown = this.jumpLatched = this.attackLatched = false;
  }
}

export function getVirtualPad(scene: Phaser.Scene): VirtualPad {
  let pad = scene.registry.get(VIRTUAL_PAD_KEY) as VirtualPad | undefined;
  if (!pad) {
    pad = new VirtualPad();
    scene.registry.set(VIRTUAL_PAD_KEY, pad);
  }
  return pad;
}

/**
 * Collects player intent from keyboard, touch buttons and gamepad (PL-8:
 * D-pad or left stick to move, A to jump; PL-9: B to attack).
 *
 * Held state is read live. A jump *press* is latched until the physics step
 * consumes it, so a press between two fixed steps is never lost.
 */
export class PlayerInput {
  private readonly left: Phaser.Input.Keyboard.Key[];
  private readonly right: Phaser.Input.Keyboard.Key[];
  private readonly jump: Phaser.Input.Keyboard.Key[];
  private readonly virtual: VirtualPad;
  private readonly gamepads: Phaser.Input.Gamepad.GamepadPlugin | null;
  private jumpLatched = false;
  private attackLatched = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error("Keyboard plugin is not available");

    const add = (codes: readonly number[]) =>
      codes.map((code) => kb.addKey(code, true));

    this.left = add(KEY_BINDINGS.left);
    this.right = add(KEY_BINDINGS.right);
    this.jump = add(KEY_BINDINGS.jump);

    for (const key of this.jump) {
      key.on(Phaser.Input.Keyboard.Events.DOWN, () => {
        this.jumpLatched = true;
      });
    }
    for (const key of add(KEY_BINDINGS.attack)) {
      key.on(Phaser.Input.Keyboard.Events.DOWN, () => {
        this.attackLatched = true;
      });
    }

    this.virtual = getVirtualPad(scene);
    this.virtual.reset();

    this.gamepads = scene.input.gamepad;
    this.gamepads?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index === GAMEPAD.JUMP) this.jumpLatched = true;
        if (button.index === GAMEPAD.ATTACK) this.attackLatched = true;
      },
    );
  }

  /** -1 = left, 0 = none (or both), 1 = right. */
  get direction(): -1 | 0 | 1 {
    let l = this.left.some((k) => k.isDown) || this.virtual.left;
    let r = this.right.some((k) => k.isDown) || this.virtual.right;
    for (const pad of this.pads()) {
      const x = pad.leftStick.x;
      l ||= pad.left || x < -GAMEPAD.STICK_DEADZONE;
      r ||= pad.right || x > GAMEPAD.STICK_DEADZONE;
    }
    if (l === r) return 0;
    return l ? -1 : 1;
  }

  get jumpHeld(): boolean {
    return (
      this.jump.some((k) => k.isDown) ||
      this.virtual.jumpHeld ||
      this.pads().some((pad) => pad.isButtonDown(GAMEPAD.JUMP))
    );
  }

  /** Returns true once per jump press (from any device). */
  consumeJumpPress(): boolean {
    const virtual = this.virtual.consumeJumpPress();
    const pressed = this.jumpLatched || virtual;
    this.jumpLatched = false;
    return pressed;
  }

  /** Returns true once per attack press (from any device). */
  consumeAttackPress(): boolean {
    const virtual = this.virtual.consumeAttackPress();
    const pressed = this.attackLatched || virtual;
    this.attackLatched = false;
    return pressed;
  }

  private pads(): Phaser.Input.Gamepad.Gamepad[] {
    return this.gamepads?.getAll() ?? [];
  }
}
