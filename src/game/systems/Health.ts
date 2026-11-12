import { HEALTH } from "../config";

/** What happened after damage was applied. */
export type DamageOutcome = "hurt" | "lifeLost" | "gameOver";

/**
 * Hearts and lives (GP-1). Pure logic, no Phaser.
 *
 * `lives` counts the life in play too: with 1 life left, losing it is game over.
 */
export class Health {
  hearts: number = HEALTH.HEARTS_PER_LIFE;

  constructor(public lives: number = HEALTH.START_LIVES) {}

  get maxHearts(): number {
    return HEALTH.HEARTS_PER_LIFE;
  }

  /** Lose `amount` hearts; running out of hearts costs a life. */
  damage(amount: number): DamageOutcome {
    this.hearts = Math.max(0, this.hearts - amount);
    return this.hearts === 0 ? this.loseLife() : "hurt";
  }

  /** Lose a whole life (e.g. falling into a pit). Refills hearts if any lives remain. */
  loseLife(): DamageOutcome {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives === 0) {
      this.hearts = 0;
      return "gameOver";
    }
    this.hearts = HEALTH.HEARTS_PER_LIFE;
    return "lifeLost";
  }
}
