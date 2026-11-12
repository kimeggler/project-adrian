import { PALETTE, type Sprite } from "@/game/art/sprites";

/**
 * Renders text pixel art (the game's own sprite data) as a crisp SVG.
 * Several frames are laid out side by side; with `fps` set, CSS steps through
 * them as an animation. Server-rendered, no JavaScript needed.
 */
export default function PixelSprite({
  frames,
  scale,
  fps,
  label,
}: {
  frames: readonly Sprite[];
  /** Screen pixels per sprite pixel. */
  scale: number;
  /** Animation speed; omit for a still image of the first frame. */
  fps?: number;
  label: string;
}) {
  const w = frames[0][0].length;
  const h = frames[0].length;
  const shown = fps ? frames : frames.slice(0, 1);

  // One <rect> per horizontal run of same-colored pixels keeps the SVG small.
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  shown.forEach((sprite, f) => {
    sprite.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const fill = PALETTE[row[x]];
        let end = x + 1;
        while (end < row.length && row[end] === row[x]) end++;
        if (fill) rects.push({ x: f * w + x, y, w: end - x, fill });
        x = end;
      }
    });
  });

  return (
    <div
      role="img"
      aria-label={label}
      className="overflow-hidden"
      style={{ width: w * scale, height: h * scale }}
    >
      <svg
        viewBox={`0 0 ${w * shown.length} ${h}`}
        width={w * scale * shown.length}
        height={h * scale}
        shapeRendering="crispEdges"
        className={fps ? "sprite-strip" : undefined}
        style={
          fps
            ? ({
                "--frames": shown.length,
                animationDuration: `${shown.length / fps}s`,
              } as React.CSSProperties)
            : undefined
        }
        aria-hidden
      >
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </svg>
    </div>
  );
}
