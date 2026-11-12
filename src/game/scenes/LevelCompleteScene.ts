import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, UI } from "../config";
import type { LevelResult } from "../types";
import { formatTime } from "../utils/format";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

/**
 * Overlay shown when the player touches the flag (WO-4).
 * Shows the level stats and a "Next level" button (click, Enter or Space).
 */
export class LevelCompleteScene extends Phaser.Scene {
  private result!: LevelResult;
  private done = false;

  constructor() {
    super(SceneKey.LEVEL_COMPLETE);
  }

  init(data: LevelResult): void {
    this.result = data;
    this.done = false;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const { level, timeMs, coins, score } = this.result;

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, UI.OVERLAY_ALPHA)
      .setOrigin(0);

    this.add
      .text(cx, 22, "LEVEL COMPLETE!", { ...UI.TEXT, fontSize: "16px", color: UI.ACCENT })
      .setOrigin(0.5);

    const rows: [string, string][] = [
      ["Level", String(level)],
      ["Time", formatTime(timeMs)],
      ["Coins", String(coins)],
      ["Score", String(score)],
    ];
    rows.forEach(([label, value], i) => {
      const y = 46 + i * 12;
      this.add.text(cx - 44, y, label, UI.TEXT);
      this.add.text(cx + 44, y, value, UI.TEXT).setOrigin(1, 0);
    });

    const button = this.add
      .text(cx, 112, "> Next level <", {
        ...UI.TEXT,
        backgroundColor: UI.BUTTON_BG,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_OVER, () => button.setColor(UI.ACCENT));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setColor(UI.TEXT.color as string));
    button.on(Phaser.Input.Events.POINTER_UP, () => this.nextLevel());

    // Short delay so a key held while touching the flag doesn't skip the screen.
    this.time.delayedCall(UI.INPUT_DELAY_MS, () => {
      const kb = this.input.keyboard;
      kb?.once("keydown-ENTER", () => this.nextLevel());
      kb?.once("keydown-SPACE", () => this.nextLevel());
    });
  }

  private nextLevel(): void {
    if (this.done) return;
    this.done = true;
    const game = this.scene.get(SceneKey.GAME) as GameScene;
    game.startLevel(this.result.level + 1);
  }
}
