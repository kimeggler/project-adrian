import { describe, expect, it } from "vitest";
import { Health } from "./Health";

describe("health with per-hero hearts (CB-9)", () => {
  it("starts full and refills to the hero's hearts after losing a life", () => {
    const h = new Health(2, 4);
    expect(h.hearts).toBe(4);
    expect(h.damage(3)).toBe("hurt");
    expect(h.damage(1)).toBe("lifeLost");
    expect(h.hearts).toBe(4);
    expect(h.damage(4)).toBe("gameOver");
  });

  it("a 2-heart hero loses a life after two hits", () => {
    const h = new Health(3, 2);
    expect(h.damage(1)).toBe("hurt");
    expect(h.damage(1)).toBe("lifeLost");
    expect(h.lives).toBe(2);
  });
});
