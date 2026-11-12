import { describe, expect, it } from "vitest";
import { getWorld, WORLDS } from "./worlds";

describe("world skins", () => {
  it("have unique ids and a full set of tiles and layers", () => {
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(WORLDS.length);
    for (const w of WORLDS) {
      expect(Object.values(w.tiles)).toHaveLength(5);
      expect(Object.values(w.layers)).toHaveLength(4);
      for (const draw of [...Object.values(w.tiles), ...Object.values(w.layers)]) {
        expect(typeof draw).toBe("function");
      }
      expect(w.background).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("falls back to the first world for unknown ids", () => {
    expect(getWorld("dungeon").id).toBe("dungeon");
    expect(getWorld("nope").id).toBe(WORLDS[0].id);
  });
});
