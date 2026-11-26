// Layout for the "where it broke" figure, in page cells: where each step's plate and number
// board sit and the cells of the rope between them. Pure, so the labels and the tests share it.

/** A step's number board: 11x9 cells, the two 3x5 digits inside a one-cell rim and margin. */
export const BOARD = { w: 11, h: 9 } as const;

export const PLATE = 11;

type Pt = { x: number; y: number };
export type WhereLayout = { vertical: boolean; cols: number; rows: number; centers: Pt[] };

/** Rows the figure needs: a fixed band on wide screens, a column of steps on phones. */
export const WHERE_ROWS = { horizontal: 60, vertical: 168 } as const;

/** Plate centres in cells. Step 06 hangs two cells low: its rope has snapped. */
export function whereLayout(cols: number, vertical: boolean): WhereLayout {
  const rows = vertical ? WHERE_ROWS.vertical : WHERE_ROWS.horizontal;
  const centers = Array.from({ length: 6 }, (_, i) => {
    const wave = Math.round(Math.sin(i * 1.1) * (vertical ? 2 : 3));
    const drop = i === 5 ? 2 : 0;
    return vertical ? { x: 8 + wave + drop, y: 10 + i * 28 } : { x: 10 + Math.round((i * (cols - 32)) / 5), y: 29 + wave + drop };
  });
  return { vertical, cols, rows, centers };
}

/** Where a step's number board goes, beside its plate on the side away from the rope. */
export function boardBox(l: WhereLayout, i: number) {
  const c = l.centers[i];
  const h = PLATE >> 1;
  if (l.vertical) return { x: c.x + h + 3, y: c.y - (BOARD.h >> 1), w: BOARD.w, h: BOARD.h };
  const above = i % 2 === 0;
  return { x: c.x - (BOARD.w >> 1), y: above ? c.y - h - 2 - BOARD.h : c.y + h + 3, w: BOARD.w, h: BOARD.h };
}

/** The rope as an ordered list of cells from step 01 to step 06, with the index where it snaps. */
export function ropeCells(l: WhereLayout) {
  const cells: [number, number][] = [];
  const along = (p: Pt) => (l.vertical ? p.y : p.x);
  const across = (p: Pt) => (l.vertical ? p.x : p.y);
  const put = (a: number, b: number) => {
    const cell: [number, number] = l.vertical ? [b, a] : [a, b];
    const last = cells.at(-1);
    if (last && last[0] === cell[0] && last[1] === cell[1]) return;
    cells.push(cell);
  };
  let snap = 0;
  for (let i = 0; i < 5; i++) {
    const p = l.centers[i];
    const q = l.centers[i + 1];
    const a0 = along(p);
    const a1 = along(q);
    const b1 = i === 4 ? across(q) - 2 : across(q);
    let prev = across(p);
    for (let a = a0; a < a1; a++) {
      const f = (a - a0) / (a1 - a0);
      const b = Math.round(across(p) + (b1 - across(p)) * f + Math.sin(f * Math.PI) * (l.vertical ? 2 : 3));
      // Steps of more than one cell are filled in, so the rope never breaks into dots.
      while (Math.abs(b - prev) > 1) {
        prev += Math.sign(b - prev);
        put(a, prev);
      }
      put(a, b);
      prev = b;
      if (i === 4 && !snap && f >= 0.55) snap = cells.length;
    }
  }
  return { cells, snap };
}

