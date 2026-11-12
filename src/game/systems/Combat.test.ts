import { describe, expect, it } from "vitest";
import { ENEMY, SWORD } from "../config";
import { isStomp, overlaps, swordHitbox } from "./Combat";

describe("stomp rule", () => {
  const enemyTop = 100;

  it("counts landing on top while falling", () => {
    expect(isStomp({ playerPrevBottom: 98, playerVy: 200, enemyTop })).toBe(true);
    expect(isStomp({ playerPrevBottom: enemyTop + ENEMY.STOMP_TOLERANCE, playerVy: 50, enemyTop })).toBe(true);
  });

  it("does not count running into the side", () => {
    expect(isStomp({ playerPrevBottom: enemyTop + 9, playerVy: 0, enemyTop })).toBe(false);
    expect(isStomp({ playerPrevBottom: enemyTop + ENEMY.STOMP_TOLERANCE + 1, playerVy: 200, enemyTop })).toBe(false);
  });

  it("does not count jumping up into the enemy", () => {
    expect(isStomp({ playerPrevBottom: 98, playerVy: -300, enemyTop })).toBe(false);
  });
});

describe("sword hitbox", () => {
  const body = { left: 100, right: 110, top: 50 };

  it("sits in front of the body on the facing side", () => {
    expect(swordHitbox(body, 1)).toEqual({ x: 110, y: 50 + SWORD.OFFSET_Y, width: SWORD.RANGE, height: SWORD.HEIGHT });
    expect(swordHitbox(body, -1).x).toBe(100 - SWORD.RANGE);
  });

  it("hits an enemy standing next to the player, not one behind", () => {
    // Walker hitbox: 12×9 on the same ground as the player (feet at y = 64).
    const inFront = { x: 115, y: 55, width: 12, height: 9 };
    const behind = { x: 80, y: 55, width: 12, height: 9 };
    expect(overlaps(swordHitbox(body, 1), inFront)).toBe(true);
    expect(overlaps(swordHitbox(body, 1), behind)).toBe(false);
    expect(overlaps(swordHitbox(body, -1), behind)).toBe(true);
  });

  it("does not reach past its range", () => {
    const far = { x: 110 + SWORD.RANGE, y: 55, width: 12, height: 9 };
    expect(overlaps(swordHitbox(body, 1), far)).toBe(false);
  });
});
