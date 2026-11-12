import { ENEMY } from "../config";

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
