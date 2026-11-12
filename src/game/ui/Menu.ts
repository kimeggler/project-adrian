import * as Phaser from "phaser";
import { UI } from "../config";
import { playSfx, SfxKey } from "../systems/Audio";
import { onKeyPress } from "../utils/keys";
import { textStyle } from "./font";

export interface MenuItem {
  label: string;
  action: () => void;
}

/** Button boxes are ~20 px tall with the pixel font; keep a small gap. */
const ROW_HEIGHT = 22;

/**
 * Vertical button list for in-game screens.
 * Keyboard: ↑/↓ or W/S to move, Enter or Space to choose. Mouse: hover + click.
 * Only the first choice counts, so a double press can't trigger two actions.
 */
export class Menu {
  private readonly buttons: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private chosen = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly items: MenuItem[],
  ) {
    items.forEach((item, i) => {
      const button = scene.add
        .text(
          x,
          y + i * ROW_HEIGHT,
          item.label,
          textStyle({ backgroundColor: UI.BUTTON_BG, padding: { x: 6, y: 3 } }),
        )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_OVER, () => this.select(i));
      button.on(Phaser.Input.Events.POINTER_UP, () => this.choose(i));
      this.buttons.push(button);
    });
    this.render();

    // Short delay so a key held when the menu opens doesn't trigger it.
    scene.time.delayedCall(UI.INPUT_DELAY_MS, () => {
      const kb = scene.input.keyboard;
      const move = (d: number) => () => this.select(this.selected + d);
      onKeyPress(kb, "UP", move(-1));
      onKeyPress(kb, "W", move(-1));
      onKeyPress(kb, "DOWN", move(1));
      onKeyPress(kb, "S", move(1));
      onKeyPress(kb, "ENTER", () => this.choose(this.selected));
      onKeyPress(kb, "SPACE", () => this.choose(this.selected));
    });
  }

  private select(index: number): void {
    const n = this.items.length;
    const next = ((index % n) + n) % n;
    if (next === this.selected) return;
    this.selected = next;
    playSfx(this.scene, SfxKey.MENU_SELECT);
    this.render();
  }

  private choose(index: number): void {
    if (this.chosen) return;
    this.chosen = true;
    playSfx(this.scene, SfxKey.MENU_SELECT);
    this.items[index].action();
  }

  private render(): void {
    this.buttons.forEach((b, i) => {
      const active = i === this.selected;
      b.setText(active ? `> ${this.items[i].label} <` : this.items[i].label);
      b.setColor(active ? UI.ACCENT : UI.TEXT.color);
    });
  }
}

/** Dark full-screen overlay plus a centered title. Returns the center x. */
export function addOverlay(scene: Phaser.Scene, title: string, color: string = UI.ACCENT): number {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, 0x000000, UI.OVERLAY_ALPHA).setOrigin(0);
  scene.add
    .text(width / 2, 22, title, textStyle({ fontSize: "16px", color }))
    .setOrigin(0.5);
  return width / 2;
}
