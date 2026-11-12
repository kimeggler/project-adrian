import { PHYSICS, SCORE, TILE } from "../config";

/** Points for collected coins. */
export function coinPoints(coins: number): number {
  return coins * SCORE.COIN_POINTS;
}

/**
 * Time bonus (GP-3): TIME_BONUS_MAX for an instant finish, falling linearly
 * to 0 at par time. Par time scales with the level width.
 */
export function timeBonus(timeMs: number, levelWidthTiles: number): number {
  const parMs =
    ((levelWidthTiles * TILE) / PHYSICS.RUN_SPEED) * SCORE.PAR_TIME_FACTOR * 1000;
  const fraction = Math.max(0, 1 - timeMs / parMs);
  return Math.round(SCORE.TIME_BONUS_MAX * fraction);
}
