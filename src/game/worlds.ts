/**
 * World skins (selectable on the landing page). Only the look changes:
 * tiles, parallax layers and the background color. Level layouts, enemies
 * and physics are the same in every world, so a seed plays identically.
 *
 * Pure data and canvas drawing, no Phaser, so the landing page can draw
 * previews with the same code.
 */
import { DUNGEON_LAYERS, MEADOW_LAYERS, type LayerArt } from "./art/backgrounds";
import { DUNGEON_TILES, MEADOW_TILES, type TileArt } from "./art/tiles";

export type WorldId = "meadow" | "dungeon";

export interface World {
  id: WorldId;
  name: string;
  /** One line for the world select card. */
  blurb: string;
  tiles: TileArt;
  layers: LayerArt;
  /** Canvas background behind everything (matches the top of the sky). */
  background: string;
}

export const DEFAULT_WORLD: WorldId = "meadow";

export const WORLDS: readonly World[] = [
  {
    id: "meadow",
    name: "Meadow",
    blurb: "Sunny hills and blue skies.",
    tiles: MEADOW_TILES,
    layers: MEADOW_LAYERS,
    background: "#5fcde4",
  },
  {
    id: "dungeon",
    name: "Dungeon",
    blurb: "Torchlit halls deep below.",
    tiles: DUNGEON_TILES,
    layers: DUNGEON_LAYERS,
    background: "#0b0a12",
  },
];

export function isWorldId(id: unknown): id is WorldId {
  return WORLDS.some((w) => w.id === id);
}

export function getWorld(id: string): World {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
