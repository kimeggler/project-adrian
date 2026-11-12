import * as Phaser from "phaser";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "monospace",
  fontSize: "8px",
  color: "#ffffff",
  backgroundColor: "#00000099",
  padding: { x: 2, y: 1 },
};

/**
 * HUD overlay. Runs on top of GameScene with its own fixed camera.
 * Phase 1: only the F1 debug overlay. Hearts, coins and score come later.
 */
export class UIScene extends Phaser.Scene {
  private debugText!: Phaser.GameObjects.Text;
  private debugVisible = false;

  constructor() {
    super(SceneKey.UI);
  }

  create(): void {
    this.debugText = this.add
      .text(2, 2, "", TEXT_STYLE)
      .setVisible(false)
      .setDepth(1000);

    this.add.text(2, 134, "F1: debug", { ...TEXT_STYLE, backgroundColor: undefined });

    const f1 = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.F1,
      true,
    );
    f1?.on(Phaser.Input.Keyboard.Events.DOWN, () => this.toggleDebug());
  }

  update(): void {
    if (!this.debugVisible) return;
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    const p = game.player?.debugInfo;
    if (!p) return;

    this.debugText.setText(
      [
        `fps   ${this.game.loop.actualFps.toFixed(0)}`,
        `state ${p.state}`,
        `vx ${p.vx.toFixed(1).padStart(7)}`,
        `vy ${p.vy.toFixed(1).padStart(7)}`,
        `grnd  ${p.grounded ? "yes" : "no"}`,
        `coyo  ${p.coyoteMs.toFixed(0)}ms`,
        `buff  ${p.bufferMs.toFixed(0)}ms`,
      ].join("\n"),
    );
  }

  private toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    this.debugText.setVisible(this.debugVisible);

    // Also toggle the Arcade physics hitbox drawing in the game scene.
    const world = (this.scene.get(SceneKey.GAME) as GameScene).physics.world;
    if (this.debugVisible && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = this.debugVisible;
    world.debugGraphic?.clear().setVisible(this.debugVisible);
  }
}
