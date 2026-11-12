import { POWERUP, type PowerUpKind } from "../config";

export const POWERUP_KINDS: readonly PowerUpKind[] = ["boots", "shield", "axe"];

/**
 * Active power-ups and their timers (CB-6). Pure logic, advanced by the fixed
 * physics step, so timers pause with the game and are refresh-rate independent.
 */
export class PowerUps {
  private readonly remaining = new Map<PowerUpKind, number>();

  /** Start a power-up, or restart its timer if it's already active. */
  add(kind: PowerUpKind): void {
    this.remaining.set(kind, POWERUP.DURATION_MS[kind]);
  }

  /** Advance timers; returns the kinds that just ran out. */
  step(dtMs: number): PowerUpKind[] {
    const expired: PowerUpKind[] = [];
    for (const [kind, ms] of this.remaining) {
      const left = ms - dtMs;
      if (left <= 0) {
        this.remaining.delete(kind);
        expired.push(kind);
      } else {
        this.remaining.set(kind, left);
      }
    }
    return expired;
  }

  has(kind: PowerUpKind): boolean {
    return this.remaining.has(kind);
  }

  /** Time left in ms (0 if not active). */
  timeLeft(kind: PowerUpKind): number {
    return this.remaining.get(kind) ?? 0;
  }

  /** 1 = just picked up, 0 = expired. */
  fraction(kind: PowerUpKind): number {
    return this.timeLeft(kind) / POWERUP.DURATION_MS[kind];
  }

  /** In the warning phase before running out? */
  expiring(kind: PowerUpKind): boolean {
    const left = this.timeLeft(kind);
    return left > 0 && left <= POWERUP.WARNING_MS;
  }

  /** Blink state for the warning phase: true = draw, false = hide this moment. */
  visible(kind: PowerUpKind): boolean {
    if (!this.expiring(kind)) return this.has(kind);
    return Math.floor(this.timeLeft(kind) / POWERUP.BLINK_MS) % 2 === 0;
  }

  /** Active kinds in a stable order (for the HUD). */
  active(): PowerUpKind[] {
    return POWERUP_KINDS.filter((k) => this.has(k));
  }

  clear(): void {
    this.remaining.clear();
  }
}
