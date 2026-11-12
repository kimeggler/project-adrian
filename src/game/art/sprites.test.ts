import { describe, expect, it } from "vitest";
import {
  CHECKPOINT_OFF,
  CHECKPOINT_ON,
  COIN_FRAMES,
  DUST,
  FLAG,
  HEART_EMPTY,
  HEART_FULL,
  ICON_JUMP,
  ICON_LEFT,
  ICON_PAUSE,
  ICON_RIGHT,
  ICON_SWORD,
  SLASH,
  heroFrames,
  KNIGHT_FRAMES,
  KNIGHT_SIZE,
  PALETTE,
  AXE_SPIN_FRAMES,
  HOPPER_FRAMES,
  ITEM_AXE,
  ITEM_BOOTS,
  ITEM_SHIELD,
  ROCK,
  SLIME_FRAMES,
  TOTEM_FRAMES,
  SPIKES,
  type Sprite,
} from "./sprites";
import { CHARACTERS } from "../characters";
import { CHECKPOINT, COIN, ENEMY, FLAG as FLAG_SIZE, PROJECTILE, TILE } from "../config";

const sprites: Record<string, { sprite: Sprite; w: number; h: number }> = {
  spikes: { sprite: SPIKES, w: TILE, h: TILE },
  flag: { sprite: FLAG, w: FLAG_SIZE.WIDTH, h: FLAG_SIZE.HEIGHT },
  checkpointOff: { sprite: CHECKPOINT_OFF, w: CHECKPOINT.WIDTH, h: CHECKPOINT.HEIGHT },
  checkpointOn: { sprite: CHECKPOINT_ON, w: CHECKPOINT.WIDTH, h: CHECKPOINT.HEIGHT },
  heartFull: { sprite: HEART_FULL, w: 7, h: 6 },
  heartEmpty: { sprite: HEART_EMPTY, w: 7, h: 6 },
  dust: { sprite: DUST, w: 3, h: 3 },
  iconLeft: { sprite: ICON_LEFT, w: 8, h: 8 },
  iconRight: { sprite: ICON_RIGHT, w: 8, h: 8 },
  iconJump: { sprite: ICON_JUMP, w: 8, h: 8 },
  iconPause: { sprite: ICON_PAUSE, w: 8, h: 8 },
  iconSword: { sprite: ICON_SWORD, w: 8, h: 8 },
  slash: { sprite: SLASH, w: 16, h: 9 },
  rock: { sprite: ROCK, w: PROJECTILE.SIZE, h: PROJECTILE.SIZE },
  itemBoots: { sprite: ITEM_BOOTS, w: 8, h: 8 },
  itemShield: { sprite: ITEM_SHIELD, w: 8, h: 8 },
  itemAxe: { sprite: ITEM_AXE, w: 8, h: 8 },
};
for (const c of CHARACTERS) {
  for (const [anim, frames] of Object.entries(heroFrames(c.look))) {
    frames.forEach((sprite, i) => {
      sprites[`${c.id}.${anim}.${i}`] = { sprite, w: KNIGHT_SIZE, h: KNIGHT_SIZE };
    });
  }
}
for (const [name, set] of Object.entries({ hopper: HOPPER_FRAMES, totem: TOTEM_FRAMES })) {
  for (const [anim, frames] of Object.entries(set)) {
    frames.forEach((sprite, i) => {
      sprites[`${name}.${anim}.${i}`] = { sprite, w: ENEMY.SIZE, h: ENEMY.SIZE };
    });
  }
}
for (const [anim, frames] of Object.entries(SLIME_FRAMES)) {
  frames.forEach((sprite, i) => {
    sprites[`slime.${anim}.${i}`] = { sprite, w: ENEMY.SIZE, h: ENEMY.SIZE };
  });
}
AXE_SPIN_FRAMES.forEach((sprite, i) => {
  sprites[`axeSpin.${i}`] = { sprite, w: 8, h: 8 };
});
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

  it("rotates the thrown axe through four different quarter turns", () => {
    expect(new Set(AXE_SPIN_FRAMES.map((f) => f.join("|"))).size).toBe(4);
    expect(AXE_SPIN_FRAMES[0]).toEqual(ITEM_AXE);
  });

  it("every hero has its own look but the same eye spot (CB-9)", () => {
    const idles = CHARACTERS.map((c) => heroFrames(c.look).idle[0].join("\n"));
    expect(new Set(idles).size).toBe(CHARACTERS.length);
    for (const c of CHARACTERS) {
      // Hurt frame: wide white eye, shifted left by the recoil lean.
      expect(heroFrames(c.look).hurt[0][5][10]).toBe("W");
    }
  });

  it("knight frames differ between animation steps", () => {
    expect(KNIGHT_FRAMES.run[0]).not.toEqual(KNIGHT_FRAMES.run[1]);
    expect(KNIGHT_FRAMES.idle[0]).not.toEqual(KNIGHT_FRAMES.idle[1]);
  });
});
