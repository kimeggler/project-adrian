/** Tile indices used in level data. -1 means empty. */
export const TileId = {
  EMPTY: -1,
  GROUND_TOP: 0,
  GROUND: 1,
  BLOCK: 2,
  WALL: 3,
} as const;

export type TileIdValue = (typeof TileId)[keyof typeof TileId];

/** Tiles the player collides with. */
export const SOLID_TILES: number[] = [
  TileId.GROUND_TOP,
  TileId.GROUND,
  TileId.BLOCK,
  TileId.WALL,
];

/** Number of tiles in the placeholder tileset texture. */
export const TILESET_SIZE = 4;

/** Level data: rows top to bottom, each a row of tile ids. */
export type LevelData = number[][];
