type Kind = "empty" | "filtered";

const COLS = 44;
const ROWS = 14;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Ridge height (in rows) at a column. "empty" is rolling hills, "filtered" is a flatter wave.
function ridge(kind: Kind, col: number): number {
  if (kind === "filtered") return 5 + 2 * Math.sin(col / 3) + Math.sin(col / 1.3);
  return 7 + 3.2 * Math.sin(col / 6.5 + 0.6) + 1.6 * Math.sin(col / 2.7);
}

/**
 * Dither landscape for pages with nothing to show yet. Hills are drawn with an ordered dither that
 * gets denser toward the bottom, in square pixels, with one yellow sun. Deterministic, no randomness.
 */
export function PixelArt({ kind = "empty", className = "" }: { kind?: Kind; className?: string }) {
  const cell = 4;
  const rects: { x: number; y: number; accent: boolean }[] = [];
  for (let col = 0; col < COLS; col++) {
    const top = ridge(kind, col);
    for (let row = 0; row < ROWS; row++) {
      const depth = top - (ROWS - 1 - row); // rows below the ridge line
      if (depth < 0) continue;
      const density = Math.min(1, 0.35 + depth / 6);
      if ((BAYER[row % 4][col % 4] + 0.5) / 16 <= density) rects.push({ x: col, y: row, accent: false });
    }
  }
  // Sun: a 3x3 yellow block above the ridge.
  for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) rects.push({ x: 32 + dx, y: 1 + dy, accent: true });
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${COLS * cell} ${ROWS * cell}`} className={`h-auto w-48 ${className}`} shapeRendering="crispEdges">
      {rects.map((r) => <rect key={`${r.x}-${r.y}`} x={r.x * cell} y={r.y * cell} width={cell} height={cell} fill={r.accent ? "#F4D44D" : "currentColor"} />)}
    </svg>
  );
}
