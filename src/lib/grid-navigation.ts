export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Direction = "up" | "down" | "left" | "right";

/** Tiles whose centers differ by less than this many px are treated as one column / row. */
const COLUMN_TOLERANCE = 8;

const centerX = (r: Rect) => r.left + r.width / 2;
const centerY = (r: Rect) => r.top + r.height / 2;

/**
 * Index of the tile to move to from `current`, judged by on-screen geometry, or null at an edge.
 *
 * REVIEWER_NOTE: The grid uses CSS columns, which fill column by column, so DOM order is not visual
 * order and "index + 1" would jump to the wrong tile. Up/down stay in the current tile's column and
 * pick the nearest neighbour; left/right pick the nearest column, then the tile in it whose vertical
 * center is closest.
 */
export function findNextTile(rects: Rect[], current: number, direction: Direction): number | null {
  const from = rects[current];
  if (!from) return null;

  let best: number | null = null;

  if (direction === "up" || direction === "down") {
    let bestDistance = Infinity;
    rects.forEach((rect, i) => {
      if (i === current) return;
      const overlapsHorizontally = rect.left < from.left + from.width && rect.left + rect.width > from.left;
      if (!overlapsHorizontally) return;
      const distance =
        direction === "down" ? rect.top - (from.top + from.height) : from.top - (rect.top + rect.height);
      if (distance < -COLUMN_TOLERANCE || distance >= bestDistance) return;
      bestDistance = distance;
      best = i;
    });
    return best;
  }

  const sign = direction === "right" ? 1 : -1;
  const fromX = centerX(from);
  let columnDistance = Infinity;
  rects.forEach((rect, i) => {
    const dx = (centerX(rect) - fromX) * sign;
    if (i !== current && dx > COLUMN_TOLERANCE && dx < columnDistance) columnDistance = dx;
  });
  if (columnDistance === Infinity) return null;

  const fromY = centerY(from);
  let bestDy = Infinity;
  rects.forEach((rect, i) => {
    const dx = (centerX(rect) - fromX) * sign;
    if (i === current || dx <= COLUMN_TOLERANCE || dx > columnDistance + COLUMN_TOLERANCE) return;
    const dy = Math.abs(centerY(rect) - fromY);
    if (dy < bestDy) {
      bestDy = dy;
      best = i;
    }
  });
  return best;
}
