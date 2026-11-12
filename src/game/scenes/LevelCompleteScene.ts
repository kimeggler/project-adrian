import * as Phaser from "phaser";
import type { LevelResult } from "../types";
import { textStyle } from "../ui/font";
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
    const cx = addOverlay(this, "LEVEL CLEAR!");

    const rows: [string, string][] = [
      ["Level", String(level)],
      ["Seed", String(seed)],
      ["Time", formatTime(timeMs)],
      ["Coins", `${coins}/${coinsTotal}`],
      ["Time bonus", `+${timeBonus}`],
      ["Score", String(score)],
    ];
    rows.forEach(([label, value], i) => {
      const y = 38 + i * 11;
      this.add.text(cx - 60, y, label, textStyle());
      this.add.text(cx + 60, y, value, textStyle()).setOrigin(1, 0);
    });

    const game = this.scene.get(SceneKey.GAME) as GameScene;
    new Menu(this, cx, 120, [
      { label: "Next level", action: () => game.nextLevel(score) },
    ]);
  }
}
