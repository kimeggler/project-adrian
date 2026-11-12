import { describe, expect, it } from "vitest";
import {
  CHECKPOINT_OFF,
  CHECKPOINT_ON,
  COIN_FRAMES,
  DUST,
  FLAG,
  HEART_EMPTY,
  HEART_FULL,
  KNIGHT_FRAMES,
  KNIGHT_SIZE,
  PALETTE,
  SPIKES,
  type Sprite,
} from "./sprites";
import { CHECKPOINT, COIN, FLAG as FLAG_SIZE, TILE } from "../config";

const sprites: Record<string, { sprite: Sprite; w: number; h: number }> = {
  spikes: { sprite: SPIKES, w: TILE, h: TILE },
  flag: { sprite: FLAG, w: FLAG_SIZE.WIDTH, h: FLAG_SIZE.HEIGHT },
  checkpointOff: { sprite: CHECKPOINT_OFF, w: CHECKPOINT.WIDTH, h: CHECKPOINT.HEIGHT },
  checkpointOn: { sprite: CHECKPOINT_ON, w: CHECKPOINT.WIDTH, h: CHECKPOINT.HEIGHT },
  heartFull: { sprite: HEART_FULL, w: 7, h: 6 },
  heartEmpty: { sprite: HEART_EMPTY, w: 7, h: 6 },
  dust: { sprite: DUST, w: 3, h: 3 },
};
for (const [anim, frames] of Object.entries(KNIGHT_FRAMES)) {
  frames.forEach((sprite, i) => {
    sprites[`knight.${anim}.${i}`] = { sprite, w: KNIGHT_SIZE, h: KNIGHT_SIZE };
  });
}
COIN_FRAMES.forEach((sprite, i) => {
  sprites[`coin.${i}`] = { sprite, w: COIN.SIZE, h: COIN.SIZE };
});

describe("pixel art", () => {
  for (const [name, { sprite, w, h }] of Object.entries(sprites)) {
    it(`${name} is ${w}×${h} and uses only palette colors`, () => {
      expect(sprite).toHaveLength(h);
      sprite.forEach((row, y) => {
        expect(row.length, `row ${y}`).toBe(w);
        for (const ch of row) {
          expect(ch === "." || ch in PALETTE, `row ${y}: "${ch}"`).toBe(true);
        }
      });
    });
  }

  it("knight frames differ between animation steps", () => {
    expect(KNIGHT_FRAMES.run[0]).not.toEqual(KNIGHT_FRAMES.run[1]);
    expect(KNIGHT_FRAMES.idle[0]).not.toEqual(KNIGHT_FRAMES.idle[1]);
  });
});
