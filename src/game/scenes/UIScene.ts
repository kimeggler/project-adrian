import * as Phaser from "phaser";
import { GAME_WIDTH, UI, type PowerUpKind } from "../config";
import { getVirtualPad } from "../systems/Input";
import { TextureKey } from "../textures";
import { TouchControls } from "../ui/TouchControls";
import { textStyle } from "../ui/font";
import type { HudState } from "../types";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

const debugStyle = () => textStyle({ backgroundColor: "#00000099", padding: { x: 2, y: 1 } });

/** Text with a dark outline so it stays readable on any background. */
const hudStyle = () => textStyle({ stroke: "#000000", strokeThickness: 2 });

/**
 * HUD overlay on top of GameScene with its own fixed camera.
 * Hearts, lives, coins, score and level number (GP-4).
 * Also hosts the touch controls (PL-7) and the F1 debug overlay.
 */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private livesText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private last?: HudState;

  private powerUpIcons = new Map<PowerUpKind, Phaser.GameObjects.Image>();
  private powerUpBars!: Phaser.GameObjects.Graphics;

  private debugText!: Phaser.GameObjects.Text;
  private debugVisible = false;

  constructor() {
    super(SceneKey.UI);
  }

  create(): void {
    this.hearts = [];
    this.last = undefined;
    this.powerUpIcons = new Map([
      ["boots", this.add.image(0, 0, TextureKey.ITEM_BOOTS).setOrigin(0).setVisible(false)],
      ["shield", this.add.image(0, 0, TextureKey.ITEM_SHIELD).setOrigin(0).setVisible(false)],
      ["axe", this.add.image(0, 0, TextureKey.ITEM_AXE).setOrigin(0).setVisible(false)],
    ]);
    this.powerUpBars = this.add.graphics();

    this.livesText = this.add.text(0, 2, "", hudStyle());
    this.add.image(76, 3, TextureKey.COIN).setOrigin(0);
    this.coinText = this.add.text(86, 2, "", hudStyle());
    this.scoreText = this.add.text(GAME_WIDTH / 2 + 30, 2, "", hudStyle()).setOrigin(0.5, 0);
    this.levelText = this.add.text(GAME_WIDTH - 3, 2, "", hudStyle()).setOrigin(1, 0);

    this.debugText = this.add
      .text(2, 30, "", debugStyle())
      .setVisible(this.debugVisible)
      .setDepth(1000);
    if (this.debugVisible) this.setPhysicsDebug(true);

    const game = this.scene.get(SceneKey.GAME) as GameScene;
    new TouchControls(
      this,
      getVirtualPad(this),
      () => game.requestPause(),
      // Make room for the pause button in the top-right corner.
      () => this.levelText.setX(GAME_WIDTH - 20),
    );

    const f1 = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F1, true);
    f1?.on(Phaser.Input.Keyboard.Events.DOWN, () => this.toggleDebug());
  }

  update(): void {
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    if (!game.player) return;
    const toast = game.consumeToast?.();
    if (toast) this.showToast(toast);
    this.updateHud(game.hud);
    this.updatePowerUps(game);
    if (this.debugVisible) this.updateDebug(game);
  }

  /**
   * Active power-ups under the hearts: icon plus a shrinking timer bar.
   * Both blink during the last seconds (CB-6 warning).
   */
  private updatePowerUps(game: GameScene): void {
    const powerUps = game.player.powerUps;
    const g = this.powerUpBars.clear();
    for (const icon of this.powerUpIcons.values()) icon.setVisible(false);
    powerUps.active().forEach((kind, i) => {
      if (!powerUps.visible(kind)) return;
      const x = 4 + i * 30;
      const y = 20; // below the top row (its text boxes reach y = 18)
      this.powerUpIcons.get(kind)?.setPosition(x, y).setVisible(true);
      g.fillStyle(0x222034).fillRect(x + 10, y + 2, 18, 4);
      g.fillStyle(powerUps.expiring(kind) ? 0xd95763 : 0xfbf236).fillRect(x + 11, y + 3, Math.ceil(16 * powerUps.fraction(kind)), 2);
    });
  }

  /** Short centered announcement, e.g. a sword upgrade (CB-5). */
  private showToast(message: string): void {
    const text = this.add
      .text(GAME_WIDTH / 2, 30, message, textStyle({ color: UI.ACCENT, stroke: "#000000", strokeThickness: 2, align: "center" }))
      .setOrigin(0.5, 0)
      .setLineSpacing(4);
    this.tweens.add({ targets: text, alpha: 0, delay: 2200, duration: 400, onComplete: () => text.destroy() });
  }

  private updateHud(hud: HudState): void {
    const prev = this.last;
    if (
      prev &&
      prev.hearts === hud.hearts &&
      prev.maxHearts === hud.maxHearts &&
      prev.lives === hud.lives &&
      prev.level === hud.level &&
      prev.coins === hud.coins &&
      prev.score === hud.score
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
    this.coinText.setText(`x${hud.coins}`);
    this.scoreText.setText(String(hud.score).padStart(6, "0"));
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
