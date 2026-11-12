import * as Phaser from "phaser";
import { UI } from "../config";
import type { LevelResult } from "../types";
import { addOverlay, Menu } from "../ui/Menu";
import { formatTime } from "../utils/format";
import type { GameScene } from "./GameScene";
import { SceneKey } from "./keys";

/** Overlay shown when the player touches the flag (WO-4). */
export class LevelCompleteScene extends Phaser.Scene {
  private result!: LevelResult;

  constructor() {
    super(SceneKey.LEVEL_COMPLETE);
  }

  init(data: LevelResult): void {
    this.result = data;
  }

  create(): void {
    const { level, seed, timeMs, coins, coinsTotal, timeBonus, score } = this.result;
    const cx = addOverlay(this, "LEVEL COMPLETE!");

    const rows: [string, string][] = [
      ["Level", String(level)],
      ["Seed", String(seed)],
      ["Time", formatTime(timeMs)],
      ["Coins", `${coins}/${coinsTotal}`],
      ["Time bonus", `+${timeBonus}`],
      ["Score", String(score)],
    ];
    rows.forEach(([label, value], i) => {
      const y = 36 + i * 10;
      this.add.text(cx - 60, y, label, UI.TEXT);
      this.add.text(cx + 60, y, value, UI.TEXT).setOrigin(1, 0);
    });

    const game = this.scene.get(SceneKey.GAME) as GameScene;
    new Menu(this, cx, 106, [
      { label: "Next level", action: () => game.nextLevel(score) },
    ]);
  }
}
