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
    return vertical ? { x: 11 + wave + drop, y: 10 + i * 28 } : { x: 10 + Math.round((i * (cols - 32)) / 5), y: 29 + wave + drop };
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


/** The loose end of the rope off step 06 on wide screens: out of the plate's far side, then down. */
const TAIL_ACROSS = [[1, 0], [2, 0], [3, 1], [3, 2], [3, 3], [4, 4], [4, 5], [4, 6], [3, 7], [3, 8], [2, 9]] as const;
/** On phones the rope runs down the page, so its loose end simply hangs on below the plate. */
const TAIL_DOWN = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [1, 6], [0, 7], [0, 8], [-1, 9], [1, 9]] as const;

/** Cells of the loose rope end hanging off step 06, as [x, y]. */
export function tailCells(l: WhereLayout): [number, number][] {
  const c = l.centers[5];
  const h = PLATE >> 1;
  if (l.vertical) return TAIL_DOWN.map(([dx, dy]) => [c.x + dx, c.y + h + dy]);
  return TAIL_ACROSS.map(([dx, dy]) => [c.x + h + dx, c.y + dy]);
}

/** Which plate (as an index into the steps) the scan frame sits on for a given scan progress. */
export function scanStop(scan: number): 3 | 4 | 5 {
  return scan < 0.35 ? 5 : scan < 0.92 ? 4 : 3;
}
