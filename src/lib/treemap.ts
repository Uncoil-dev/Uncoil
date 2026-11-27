/** Squarified treemap layout: pure, so the same sizes always give the same tiles. */

export type TreemapRect = { x: number; y: number; w: number; h: number };
export type TreemapTile<T> = TreemapRect & { item: T };

/** Worst aspect ratio of a row of areas laid along a side of length `side`. */
function worst(row: number[], side: number) {
  const sum = row.reduce((a, b) => a + b, 0);
  if (sum <= 0 || side <= 0) return Infinity;
  return Math.max(...row.map((area) => Math.max((side * side * area) / (sum * sum), (sum * sum) / (side * side * area))));
}

/**
 * Lays `items` out in a width x height box, each tile's area proportional to `value(item)`.
 * Items with a zero or invalid value are skipped. Larger items come first (top left), ties keep input order.
 */
export function squarify<T>(items: T[], value: (item: T) => number, width: number, height: number): Array<TreemapTile<T>> {
  const sized = items
    .map((item, index) => ({ item, index, size: Number.isFinite(value(item)) ? value(item) : 0 }))
    .filter((entry) => entry.size > 0)
    .sort((a, b) => b.size - a.size || a.index - b.index);
  const total = sized.reduce((sum, entry) => sum + entry.size, 0);
  if (!sized.length || width <= 0 || height <= 0) return [];

  const scale = (width * height) / total;
  const tiles: Array<TreemapTile<T>> = [];
  let box: TreemapRect = { x: 0, y: 0, w: width, h: height };
  let row: typeof sized = [];

  const flush = () => {
    const area = row.reduce((sum, entry) => sum + entry.size * scale, 0);
    // The row runs along the shorter side of what is left.
    const horizontal = box.w >= box.h;
    const thickness = area / (horizontal ? box.h : box.w);
    let offset = 0;
    for (const entry of row) {
      const length = (entry.size * scale) / thickness;
      tiles.push(horizontal
        ? { item: entry.item, x: box.x, y: box.y + offset, w: thickness, h: length }
        : { item: entry.item, x: box.x + offset, y: box.y, w: length, h: thickness });
      offset += length;
    }
    box = horizontal
      ? { x: box.x + thickness, y: box.y, w: box.w - thickness, h: box.h }
      : { x: box.x, y: box.y + thickness, w: box.w, h: box.h - thickness };
    row = [];
  };

  for (const entry of sized) {
    const side = Math.min(box.w, box.h);
    const areas = row.map((r) => r.size * scale);
    if (row.length && worst([...areas, entry.size * scale], side) > worst(areas, side)) flush();
    row.push(entry);
  }
  flush();
  return tiles;
}
