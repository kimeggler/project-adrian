import { describe, expect, it } from "vitest";
import { ENEMY } from "../config";
import { isStomp } from "./Combat";

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
