// Pure timing and shape logic for the combined homepage concept, shared by the canvas, the SVG
// section edges and the tests. The journey here is the short version: set up, first trace, and
// Uncoil marking the step that broke. The repair itself is shown later by the fix section and
// the closing scene, so the broken step is never acted out a third time.

import { clamp01, hash, keyframe, noise } from "../pixel-world/world.ts";

// ── Journey ──────────────────────────────────────────────────────────────────────────────────

export const WORLD_W = 1400;
export const GAP = { x0: 1100, x1: 1136 } as const;
/** World x of the missing plank Uncoil points at. */
export const HOLE_X = GAP.x0 + 12;
export const STOP_X = [300, 720, GAP.x0] as const;

const ROBOT_FRAMES = [
  [0, 40],
  [0.08, 270],
  [0.2, 300],
  [0.3, 660],
  [0.46, 720],
  [0.6, GAP.x0 - 10],
  [1, GAP.x0 - 10],
] as const;

export const robotAt = (p: number) => keyframe(ROBOT_FRAMES, clamp01(p));

/** Which of the three stops (0-2) the dialog shows at scroll progress `p`. */
export function stopAt(p: number) {
  if (p < 0.26) return 0;
  if (p < 0.56) return 1;
  return 2;
}

/** Scene beats along the journey, each 0..1. */
export function beats(p: number) {
  return {
    prompt: clamp01((p - 0.06) / 0.12),
    drop: clamp01((p - 0.3) / 0.04),
    tower: clamp01((p - 0.34) / 0.14),
    scan: clamp01((p - 0.62) / 0.2),
  };
}

export const SPAN_COUNT = 6;

export type JourneyStatus = "idle" | "recording" | "found";

/** What the in-game HUD shows for the example run at scroll progress `p`. */
export function hud(p: number) {
  const b = beats(p);
  const spans = b.drop < 1 ? 0 : Math.max(1, Math.ceil(b.tower * SPAN_COUNT));
  const status: JourneyStatus = b.scan >= 1 ? "found" : spans > 0 ? "recording" : "idle";
  return { spans, status };
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
