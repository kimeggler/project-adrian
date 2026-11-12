import * as Phaser from "phaser";

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

/** Default key bindings (PL-2). Touch and gamepad come in phase 6. */
export const KEY_BINDINGS = {
  left: [KeyCodes.LEFT, KeyCodes.A],
  right: [KeyCodes.RIGHT, KeyCodes.D],
  jump: [KeyCodes.SPACE, KeyCodes.W, KeyCodes.UP],
} as const;

/**
 * Collects player intent from all input devices.
 *
 * Held state is read live. A jump *press* is latched until the physics step
 * consumes it, so a press between two fixed steps is never lost.
 */
export class PlayerInput {
  private readonly left: Phaser.Input.Keyboard.Key[];
  private readonly right: Phaser.Input.Keyboard.Key[];
  private readonly jump: Phaser.Input.Keyboard.Key[];
  private jumpLatched = false;

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
  }

  /** -1 = left, 0 = none (or both), 1 = right. */
  get direction(): -1 | 0 | 1 {
    const l = this.left.some((k) => k.isDown);
    const r = this.right.some((k) => k.isDown);
    if (l === r) return 0;
    return l ? -1 : 1;
  }

  get jumpHeld(): boolean {
    return this.jump.some((k) => k.isDown);
  }

  /** Returns true once per jump press. */
  consumeJumpPress(): boolean {
    const pressed = this.jumpLatched;
    this.jumpLatched = false;
    return pressed;
  }
}
