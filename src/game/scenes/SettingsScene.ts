import * as Phaser from "phaser";
import { GAMEPAD, UI } from "../config";
import { playSfx, SfxKey } from "../systems/Audio";
import { getSettings, updateSettings, type Settings } from "../systems/Save";
import { textStyle } from "../ui/font";
import { addOverlay } from "../ui/Menu";
import { onKeyPress, pauseToggleEvents } from "../utils/keys";
import { SceneKey } from "./keys";

interface Row {
  label: string;
  value?: () => string;
  /** ◀ / ▶ (volumes) */
  change?: (dir: -1 | 1) => void;
  /** Enter / tap (on-off settings and "Back") */
  activate?: () => void;
}

const VOLUME_STEP = 0.1;
const ROW_Y = 42;
const ROW_H = 16;

/**
 * Settings (LP-3), opened from the pause menu: SFX and music volume, sound
 * on/off, screen shake on/off. Saved immediately (PS-1).
 * Keyboard: ↑/↓ choose, ←/→ change, Enter toggle, Esc back.
 * Gamepad: D-pad, A toggle, B back. Touch/mouse: tap ◀ ▶ or the value.
 */
export class SettingsScene extends Phaser.Scene {
  private rows: Row[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private values: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private returnTo: string = SceneKey.PAUSE;

  constructor() {
    super(SceneKey.SETTINGS);
  }

  init(data: { returnTo?: string }): void {
    this.returnTo = data.returnTo ?? SceneKey.PAUSE;
    this.selected = 0;
  }

  create(): void {
    addOverlay(this, "SETTINGS");
    const volume = (key: "sfxVolume" | "musicVolume"): Row => ({
      label: key === "sfxVolume" ? "Effects" : "Music",
      value: () => `${Math.round(getSettings()[key] * 100)}%`,
      change: (dir) => {
        const v = Math.round((getSettings()[key] + dir * VOLUME_STEP) * 10) / 10;
        this.set({ [key]: Math.min(1, Math.max(0, v)) });
      },
    });
    const toggle = (label: string, key: "muted" | "screenShake", invert = false): Row => ({
      label,
      value: () => ((getSettings()[key] !== invert) ? "On" : "Off"),
      change: () => this.set({ [key]: !getSettings()[key] }),
      activate: () => this.set({ [key]: !getSettings()[key] }),
    });
    this.rows = [
      volume("sfxVolume"),
      volume("musicVolume"),
      toggle("Sound", "muted", true),
      toggle("Screen shake", "screenShake"),
      { label: "Back", activate: () => this.back() },
    ];

    this.labels = [];
    this.values = [];
    this.rows.forEach((row, i) => {
      const y = ROW_Y + i * ROW_H;
      const label = this.add.text(32, y, row.label, textStyle()).setInteractive({ useHandCursor: true });
      label.on(Phaser.Input.Events.POINTER_OVER, () => this.select(i));
      label.on(Phaser.Input.Events.POINTER_UP, () => row.activate?.());
      this.labels.push(label);

      const value = this.add.text(224, y, "", textStyle()).setOrigin(1, 0);
      this.values.push(value);
      if (row.change) {
        // Tap the left half of the value to decrease, the right half to increase.
        value.setInteractive({ useHandCursor: true });
        value.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
          this.select(i);
          row.change?.(p.x < value.getCenter().x ? -1 : 1);
        });
      }
    });
    this.render();

    this.time.delayedCall(UI.INPUT_DELAY_MS, () => this.bindInput());
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    const move = (d: number) => () => this.select(this.selected + d);
    const change = (d: -1 | 1) => () => this.rows[this.selected].change?.(d);
    const activate = () => {
      const row = this.rows[this.selected];
      if (row.activate) row.activate();
      else row.change?.(1);
    };
    onKeyPress(kb, "UP", move(-1));
    onKeyPress(kb, "W", move(-1));
    onKeyPress(kb, "DOWN", move(1));
    onKeyPress(kb, "S", move(1));
    onKeyPress(kb, "LEFT", change(-1));
    onKeyPress(kb, "A", change(-1));
    onKeyPress(kb, "RIGHT", change(1));
    onKeyPress(kb, "D", change(1));
    onKeyPress(kb, "ENTER", activate);
    onKeyPress(kb, "SPACE", activate);
    onKeyPress(kb, "BACKSPACE", () => this.back());
    // Shared with the pause menu, so this Esc doesn't also close the pause menu.
    onKeyPress(kb, "ESC", () => this.back(), pauseToggleEvents);
    this.input.gamepad?.on(
      Phaser.Input.Gamepad.Events.BUTTON_DOWN,
      (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        const actions: Record<number, () => void> = {
          [GAMEPAD.DPAD_UP]: move(-1),
          [GAMEPAD.DPAD_DOWN]: move(1),
          [GAMEPAD.DPAD_LEFT]: change(-1),
          [GAMEPAD.DPAD_RIGHT]: change(1),
          [GAMEPAD.JUMP]: activate,
          [GAMEPAD.BACK]: () => this.back(),
        };
        actions[button.index]?.();
      },
    );
  }

  private set(patch: Partial<Settings>): void {
    updateSettings(patch);
    playSfx(this, SfxKey.MENU_SELECT); // also previews the new volume
    this.render();
  }

  private select(index: number): void {
    const n = this.rows.length;
    this.selected = ((index % n) + n) % n;
    this.render();
  }

  private render(): void {
    this.rows.forEach((row, i) => {
      const active = i === this.selected;
      this.labels[i]
        .setText(`${active ? ">" : " "} ${row.label}`)
        .setColor(active ? UI.ACCENT : UI.TEXT.color);
      const v = row.value?.() ?? "";
      this.values[i].setText(row.change && v ? `< ${v.padStart(4)} >` : v).setColor(active ? UI.ACCENT : UI.TEXT.color);
    });
  }

  private back(): void {
    this.scene.stop();
    this.scene.wake(this.returnTo);
  }
}
