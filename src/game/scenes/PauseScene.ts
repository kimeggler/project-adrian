import * as Phaser from "phaser";
import { UI } from "../config";
import { addOverlay, Menu } from "../ui/Menu";
import { onKeyPress, pauseToggleEvents } from "../utils/keys";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

/**
 * Pause menu (GP-5): resume, restart level, quit to menu.
 * Esc or P also resumes. Settings join this menu in phase 6.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.PAUSE);
  }

  create(): void {
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    const cx = addOverlay(this, "PAUSED");

    this.add
      .text(cx, 40, `Level ${game.hud.level} · Seed ${game.hud.seed}`, UI.TEXT)
      .setOrigin(0.5);

    new Menu(this, cx, 66, [
      { label: "Resume", action: () => game.resumeGame() },
      { label: "Restart level", action: () => game.restartLevel() },
      { label: "Quit to menu", action: () => game.quitToMenu() },
    ]);

    this.time.delayedCall(UI.INPUT_DELAY_MS, () => {
      const kb = this.input.keyboard;
      onKeyPress(kb, "ESC", () => game.resumeGame(), pauseToggleEvents);
      onKeyPress(kb, "P", () => game.resumeGame(), pauseToggleEvents);
    });
  }
}
