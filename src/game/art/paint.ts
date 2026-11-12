import { PALETTE, type Sprite } from "./sprites";

/** Draw a text sprite onto a 2D canvas at (ox, oy). */
export function paintSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  ox = 0,
  oy = 0,
  palette: Readonly<Record<string, string>> = PALETTE,
): void {
  sprite.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

/** Size of a text sprite. */
export function spriteSize(sprite: Sprite): { width: number; height: number } {
  return { width: sprite[0]?.length ?? 0, height: sprite.length };
}
