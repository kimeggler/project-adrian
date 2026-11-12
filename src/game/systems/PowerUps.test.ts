import { describe, expect, it } from "vitest";
import { POWERUP } from "../config";
import { PowerUps } from "./PowerUps";

describe("power-up timers (CB-6)", () => {
  it("runs out after its duration and reports it once", () => {
    const p = new PowerUps();
    p.add("boots");
    expect(p.has("boots")).toBe(true);
    expect(p.step(POWERUP.DURATION_MS.boots - 1)).toEqual([]);
    expect(p.has("boots")).toBe(true);
    expect(p.step(1)).toEqual(["boots"]);
    expect(p.has("boots")).toBe(false);
    expect(p.step(1000)).toEqual([]);
  });

  it("restarts the timer when picked up again", () => {
    const p = new PowerUps();
    p.add("shield");
    p.step(5000);
    p.add("shield");
    expect(p.timeLeft("shield")).toBe(POWERUP.DURATION_MS.shield);
  });

  it("keeps several power-ups with separate timers", () => {
    const p = new PowerUps();
    p.add("boots");
    p.add("axe");
    p.step(POWERUP.DURATION_MS.boots);
    expect(p.active()).toEqual(["axe"]);
    expect(p.fraction("axe")).toBeCloseTo(1 - POWERUP.DURATION_MS.boots / POWERUP.DURATION_MS.axe);
  });

  it("blinks only in the warning phase", () => {
    const p = new PowerUps();
    p.add("shield");
    expect(p.expiring("shield")).toBe(false);
    expect(p.visible("shield")).toBe(true);
    p.step(POWERUP.DURATION_MS.shield - POWERUP.WARNING_MS + 1);
    expect(p.expiring("shield")).toBe(true);
    const states = new Set<boolean>();
    for (let i = 0; i < 20; i++) {
      states.add(p.visible("shield"));
      p.step(50);
    }
    expect(states).toEqual(new Set([true, false]));
  });

  it("clears everything (e.g. after losing a life)", () => {
    const p = new PowerUps();
    p.add("boots");
    p.add("shield");
    p.clear();
    expect(p.active()).toEqual([]);
  });
});
