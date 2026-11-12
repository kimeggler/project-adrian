import * as Phaser from "phaser";
import { GAMEPAD, UI } from "../config";
import { textStyle } from "../ui/font";
import { addOverlay, Menu } from "../ui/Menu";
import { onKeyPress, pauseToggleEvents } from "../utils/keys";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

/**
 * Pause menu (GP-5): resume, restart level, settings, quit to menu.
 * Esc, P or gamepad Start/B also resume.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.PAUSE);
  }

  create(): void {
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    const cx = addOverlay(this, "PAUSED");

    this.add
      .text(cx, 44, `Level ${game.hud.level} · Seed ${game.hud.seed}`, textStyle())
      .setOrigin(0.5);

    new Menu(this, cx, 62, [
      { label: "Resume", action: () => game.resumeGame() },
      { label: "Restart level", action: () => game.restartLevel() },
      {
        label: "Settings",
        keepOpen: true,
        action: () => {
          this.scene.sleep(); // hidden and paused until Settings closes
          this.scene.launch(SceneKey.SETTINGS, { returnTo: SceneKey.PAUSE });
        },
      },
      { label: "Quit to menu", action: () => game.quitToMenu() },
    ]);

    this.time.delayedCall(UI.INPUT_DELAY_MS, () => {
      const kb = this.input.keyboard;
      onKeyPress(kb, "ESC", () => game.resumeGame(), pauseToggleEvents);
      onKeyPress(kb, "P", () => game.resumeGame(), pauseToggleEvents);
      this.input.gamepad?.on(
        Phaser.Input.Gamepad.Events.BUTTON_DOWN,
        (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
          if (button.index === GAMEPAD.START || button.index === GAMEPAD.BACK) game.resumeGame();
        },
      );
    });
  }
}
