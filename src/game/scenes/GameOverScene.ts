import * as Phaser from "phaser";
import { textStyle } from "../ui/font";
import { addOverlay, Menu } from "../ui/Menu";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

/** Shown when the last life is lost (GP-2). */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.GAME_OVER);
  }

  create(): void {
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    const cx = addOverlay(this, "GAME OVER", "#d95763");

    const { level, seed, score } = game.hud;
    this.add
      .text(cx, 44, `You reached level ${level}`, textStyle())
      .setOrigin(0.5);
    this.add
      .text(cx, 58, `Score ${score} · Seed ${seed}`, textStyle())
      .setOrigin(0.5);

    new Menu(this, cx, 84, [
      { label: "Retry level", action: () => game.retryLevel() },
      { label: "Back to menu", action: () => game.quitToMenu() },
    ]);
  }
}
