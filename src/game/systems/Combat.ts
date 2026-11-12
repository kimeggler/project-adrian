import { ENEMY, SWORD } from "../config";

/**
 * Did the player land on top of the enemy (a stomp) rather than run into it?
 * Pure function so the rule is unit-tested.
 *
 * The player must be falling, and their feet must have been at or just below
 * the enemy's top on the previous physics step (before this step's movement
 * pushed the bodies into each other).
 */
export function isStomp({
  playerPrevBottom,
  playerVy,
  enemyTop,
}: {
  playerPrevBottom: number;
  playerVy: number;
  enemyTop: number;
}): boolean {
  return playerVy > 0 && playerPrevBottom <= enemyTop + ENEMY.STOMP_TOLERANCE;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The sword's hitbox (CB-2): a box `range` px long right in front of the
 * player's body, at hand height. `facing` is 1 for right, -1 for left.
 */
export function swordHitbox(
  body: { left: number; right: number; top: number },
  facing: 1 | -1,
  range: number,
): Rect {
  return {
    x: facing > 0 ? body.right : body.left - range,
    y: body.top + SWORD.OFFSET_Y,
    width: range,
    height: SWORD.HEIGHT,
  };
}

/** Axis-aligned overlap (touching edges don't count). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
