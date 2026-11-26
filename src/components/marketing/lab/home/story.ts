// Pure logic for the combined homepage concept, shared by the components and the tests: the
// setup prompt's lines and the pixel seams between sections.

import { hash, noise } from "../pixel-world/world.ts";

// ── Setup prompt ─────────────────────────────────────────────────────────────────────────────

/**
 * The setup prompt split for display. The prompt numbers its own steps ("1. Install…"), so those
 * numbers are lifted out to be styled and nothing else is numbered: one numbering, the prompt's.
 */
export function promptLines(text: string) {
  return text.split("\n").map((line) => {
    const m = /^(\d+)\.\s+(.*)$/.exec(line);
    return m ? { num: m[1], text: m[2] } : { num: "", text: line };
  });
}

// ── Section edges ────────────────────────────────────────────────────────────────────────────

export type EdgeShape = "hills" | "flat";

export const EDGE = { cols: 180, rows: 24, cell: 8 } as const;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dith = (x: number, y: number, d: number) => d > BAYER[(y & 3) * 4 + (x & 3)];

/** Row (0 = top) where the solid colour starts in column `c`. */
export function horizonRow(c: number, shape: EdgeShape, seed: number) {
  const { rows } = EDGE;
  if (shape === "flat") return rows - 3;
  // Columns move in pairs so the ridge steps in chunky blocks, like the hero's pixel hills.
  const x = c - (c % 2);
  const n = noise(x / 26, seed) * 0.7 + noise(x / 9, seed + 9) * 0.3;
  return Math.max(2, Math.min(rows - 2, Math.round(rows * 0.5 + (n - 0.5) * rows * 0.9)));
}

/**
 * Cells for one section edge, as three sets: the solid ground, the ordered-dither fringe above it
 * and loose pixels that have drifted off the fringe. Each set is a list of [col, row] cells.
 */
export function edgeCells(shape: EdgeShape, seed: number) {
  const { cols, rows } = EDGE;
  const fringe = shape === "flat" ? 18 : 4;
  const drift = shape === "flat" ? 0.035 : 0.012;
  const solid: [number, number][] = [];
  const dither: [number, number][] = [];
  const loose: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    const top = horizonRow(c, shape, seed);
    for (let r = 0; r < rows; r++) {
      if (r >= top) {
        solid.push([c, r]);
        continue;
      }
      const dist = top - r;
      if (dist <= fringe && dith(c, r, Math.pow(1 - dist / (fringe + 1), 1.4) * 0.92)) dither.push([c, r]);
      else if (hash(c * 31 + r, seed + 3) < drift * (1 - r / rows) + 0.006) loose.push([c, r]);
    }
  }
  return { solid, dither, loose };
}

/** One SVG path for a set of cells, merging horizontal runs so the path stays small. */
export function cellsPath(cells: readonly (readonly [number, number])[], cell: number = EDGE.cell) {
  const rows = new Map<number, number[]>();
  for (const [c, r] of cells) {
    const row = rows.get(r);
    if (row) row.push(c);
    else rows.set(r, [c]);
  }
  let d = "";
  for (const [r, cs] of rows) {
    cs.sort((a, b) => a - b);
    for (let i = 0; i < cs.length; ) {
      let j = i;
      while (j + 1 < cs.length && cs[j + 1] === cs[j] + 1) j++;
      d += `M${cs[i] * cell} ${r * cell}h${(j - i + 1) * cell}v${cell}h-${(j - i + 1) * cell}z`;
      i = j + 1;
    }
  }
  return d;
}
