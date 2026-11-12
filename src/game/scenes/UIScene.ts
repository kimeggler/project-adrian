import * as Phaser from "phaser";
import { GAME_WIDTH, UI } from "../config";
import { TextureKey } from "../textures";
import type { HudState } from "../types";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

const DEBUG_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...UI.TEXT,
  backgroundColor: "#00000099",
  padding: { x: 2, y: 1 },
};

/** Text with a dark outline so it stays readable on any background. */
const HUD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...UI.TEXT,
  stroke: "#000000",
  strokeThickness: 2,
};

/**
 * HUD overlay on top of GameScene with its own fixed camera.
 * Phase 3: hearts, lives and level number. Coins and score come in phase 4.
 * Also hosts the F1 debug overlay.
 */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private last?: HudState;

  private debugText!: Phaser.GameObjects.Text;
  private debugVisible = false;

  constructor() {
    super(SceneKey.UI);
  }

  create(): void {
    this.hearts = [];
    this.last = undefined;

    this.livesText = this.add.text(0, 2, "", HUD_STYLE);
    this.levelText = this.add.text(GAME_WIDTH - 3, 2, "", HUD_STYLE).setOrigin(1, 0);

    this.debugText = this.add
      .text(2, 14, "", DEBUG_STYLE)
      .setVisible(this.debugVisible)
      .setDepth(1000);
    if (this.debugVisible) this.setPhysicsDebug(true);

    const f1 = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F1, true);
    f1?.on(Phaser.Input.Keyboard.Events.DOWN, () => this.toggleDebug());
  }

  update(): void {
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    if (!game.player) return;
    this.updateHud(game.hud);
    if (this.debugVisible) this.updateDebug(game);
  }

  private updateHud(hud: HudState): void {
    const prev = this.last;
    if (
      prev &&
      prev.hearts === hud.hearts &&
      prev.maxHearts === hud.maxHearts &&
      prev.lives === hud.lives &&
      prev.level === hud.level
    ) {
      return;
    }
    this.last = { ...hud };

    // Hearts, left to right.
    while (this.hearts.length < hud.maxHearts) {
      const x = 4 + this.hearts.length * 9;
      this.hearts.push(this.add.image(x, 4, TextureKey.HEART_FULL).setOrigin(0));
    }
    this.hearts.forEach((h, i) =>
      h.setTexture(i < hud.hearts ? TextureKey.HEART_FULL : TextureKey.HEART_EMPTY),
    );

    this.livesText.setX(4 + hud.maxHearts * 9 + 4).setText(`x${hud.lives}`);
    this.levelText.setText(`LV ${hud.level}`);
  }

  private updateDebug(game: GameScene): void {
    const p = game.player.debugInfo;
    this.debugText.setText(
      [
        `fps   ${this.game.loop.actualFps.toFixed(0)}`,
        `state ${p.state}`,
        `vx ${p.vx.toFixed(1).padStart(7)}`,
        `vy ${p.vy.toFixed(1).padStart(7)}`,
        `grnd  ${p.grounded ? "yes" : "no"}`,
        `coyo  ${p.coyoteMs.toFixed(0)}ms`,
        `buff  ${p.bufferMs.toFixed(0)}ms`,
        `invul ${p.invincibleMs.toFixed(0)}ms`,
      ].join("\n"),
    );
  }

  private toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    this.debugText.setVisible(this.debugVisible);
    this.setPhysicsDebug(this.debugVisible);
  }

  /** Toggle the Arcade physics hitbox drawing in the game scene. */
  private setPhysicsDebug(on: boolean): void {
    const world = (this.scene.get(SceneKey.GAME) as GameScene).physics.world;
    if (on && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = on;
    world.debugGraphic?.clear().setVisible(on);
  }
}
