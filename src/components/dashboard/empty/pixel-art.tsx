type Kind = "empty" | "filtered";

const COLS = 48;
const BAR_ROWS = 3;
const GAP = 2;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const YELLOW = "#F4D44D";

// Per bar: where the solid part starts (column) and how far the dissolve reaches to the left.
const BARS: Record<Kind, { solid: number; reach: number; dim?: boolean }[]> = {
  empty: [{ solid: 20, reach: 18 }, { solid: 32, reach: 16 }, { solid: 26, reach: 18 }, { solid: 38, reach: 14, dim: true }, { solid: 34, reach: 16 }],
  filtered: [{ solid: 36, reach: 20, dim: true }, { solid: 30, reach: 18, dim: true }, { solid: 40, reach: 14 }, { solid: 33, reach: 18, dim: true }, { solid: 38, reach: 14, dim: true }],
};

/**
 * The Uncoil "dissolve" bars for pages with nothing to show: yellow bars whose left edge breaks up
 * into dither, the same art as the error pages. Deterministic. `filtered` is calmer, for "your
 * filters hide everything"; `empty` is for "nothing here yet".
 */
export function PixelArt({ kind = "empty", className = "" }: { kind?: Kind; className?: string }) {
  const cell = 4;
  const bars = BARS[kind];
  const height = bars.length * (BAR_ROWS + GAP) - GAP;
  const rects: { x: number; y: number; o: number }[] = [];
  bars.forEach((bar, i) => {
    const top = i * (BAR_ROWS + GAP);
    for (let r = 0; r < BAR_ROWS; r++) {
      for (let c = bar.solid - bar.reach; c < COLS; c++) {
        const t = c >= bar.solid ? 1 : (c - (bar.solid - bar.reach)) / bar.reach; // 0 at the far left, 1 at the solid edge
        if ((BAYER[(top + r) % 4][c % 4] + 0.5) / 16 <= (t === 1 ? 2 : t * 0.85)) rects.push({ x: c, y: top + r, o: bar.dim ? 0.35 : 1 });
      }
    }
  });
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${COLS * cell} ${height * cell}`} className={`h-auto w-full max-w-[20rem] ${className}`} shapeRendering="crispEdges">
      {rects.map((p) => <rect key={`${p.x}-${p.y}`} x={p.x * cell} y={p.y * cell} width={cell} height={cell} fill={YELLOW} opacity={p.o} />)}
    </svg>
  );
}
