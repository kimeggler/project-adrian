import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, TOUCH } from "../config";
import type { VirtualPad } from "../systems/Input";
import { TextureKey } from "../textures";

/** Is this a touch-first device (phone, tablet)? */
export function isTouchDevice(scene: Phaser.Scene): boolean {
  const coarse =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  return scene.sys.game.device.input.touch && Boolean(coarse);
}

/**
 * On-screen buttons for touch devices (PL-7): ◀ ▶ bottom left, sword and
 * jump bottom right (PL-9), pause top right (GP-5). Shown automatically on touch devices, and on
 * other devices after the first touch (e.g. laptops with touch screens).
 */
export class TouchControls {
  private readonly buttons: Phaser.GameObjects.Image[] = [];
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pad: VirtualPad,
    onPause: () => void,
    private readonly onShow: () => void,
  ) {
    const { BUTTON_SIZE: S, PAUSE_SIZE: P, MARGIN: M, GAP: G } = TOUCH;
    const y = GAME_HEIGHT - M - S;

    this.holdButton(TextureKey.BTN_LEFT, M, y, (down) => (pad.left = down));
    this.holdButton(TextureKey.BTN_RIGHT, M + S + G, y, (down) => (pad.right = down));
    this.holdButton(TextureKey.BTN_JUMP, GAME_WIDTH - M - S, y, (down) => pad.setJump(down));
    this.holdButton(TextureKey.BTN_ATTACK, GAME_WIDTH - M - S * 2 - G, y, (down) => {
      if (down) pad.pressAttack();
    });

    const pause = this.addButton(TextureKey.BTN_PAUSE, GAME_WIDTH - 2 - P, 1);
    pause.on(Phaser.Input.Events.POINTER_DOWN, () => onPause());

    if (isTouchDevice(scene)) this.show();
    else {
      scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
        if (pointer.wasTouch) this.show();
      });
    }
  }

  get visible(): boolean {
    return this.shown;
  }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    for (const b of this.buttons) b.setVisible(true);
    this.onShow();
  }

  private addButton(texture: string, x: number, y: number): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, texture).setOrigin(0).setAlpha(TOUCH.ALPHA).setVisible(false);
    const pad = TOUCH.HIT_PADDING;
    img.setInteractive(
      new Phaser.Geom.Rectangle(-pad, -pad, img.width + pad * 2, img.height + pad * 2),
      Phaser.Geom.Rectangle.Contains,
    );
    this.buttons.push(img);
    return img;
  }

  /** A button that is "down" while a finger is on it, including sliding onto it. */
  private holdButton(texture: string, x: number, y: number, set: (down: boolean) => void): void {
    const img = this.addButton(texture, x, y);
    const press = (down: boolean) => {
      set(down);
      img.setAlpha(down ? TOUCH.PRESSED_ALPHA : TOUCH.ALPHA);
    };
    img.on(Phaser.Input.Events.POINTER_DOWN, () => press(true));
    img.on(Phaser.Input.Events.POINTER_OVER, (p: Phaser.Input.Pointer) => {
      if (p.isDown) press(true);
    });
    img.on(Phaser.Input.Events.POINTER_UP, () => press(false));
    img.on(Phaser.Input.Events.POINTER_OUT, () => press(false));
  }
}
