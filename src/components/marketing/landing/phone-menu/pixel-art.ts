// The phone menu's pixel scene, drawn the way the homepage draws its scenes: one low-resolution
// buffer in the three brand colours, one cell per buffer pixel, every cell a whole number of
// device pixels. The robot, the number boards and the banded sun use the homepage's shapes so the
// menu and the page look drawn by the same hand.

// ── The grid ─────────────────────────────────────────────────────────────────────────────────

/** The cell size on phones and small tablets, in CSS px. The homepage uses the same cell there. */
export const CELL = 4;

/** `target` CSS px rounded to a whole number of device pixels, given back in CSS px. */
export function snapCell(target: number, dpr: number) {
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  return Math.max(1, Math.round(target * ratio)) / ratio;
}

// ── The buffer ───────────────────────────────────────────────────────────────────────────────

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
};

export const INK = rgba("#090909");
export const CREAM = rgba("#eceae3");
export const YELLOW = rgba("#f4d44d");
export const PALE = rgba("#fff4b5");

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dith = (x: number, y: number, d: number) => d > BAYER[(y & 3) * 4 + (x & 3)];

export class Px {
  buf: Uint32Array;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.buf = new Uint32Array(w * h);
  }
  clear(c = INK) {
    this.buf.fill(c);
  }
  set(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  sprite(rows: readonly string[], x: number, y: number) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => ch in MAP && this.set(x + i, y + j, MAP[ch])));
  }
  blit(ctx: CanvasRenderingContext2D) {
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.buf);
    ctx.putImageData(img, 0, 0);
  }
}

const MAP: Record<string, number> = { C: CREAM, K: INK, Y: YELLOW };

// ── Sprites (the homepage's robot and its 3x5 numerals) ──────────────────────────────────────

const ROBOT_TOP = [
  "....Y.....",
  "....C.....",
  ".CCCCCCCC.",
  ".CKKKKKKC.",
  ".CKYKKYKC.",
  ".CKKKKKKC.",
  ".CCCCCCCC.",
  "...CCCC...",
  ".CCCCCCCC.",
  "C.CCYCCC.C",
  "...CCCC...",
];
const LEGS = [
  ["...C..C...", "..CC..CC.."],
  ["....CC....", "...CC.C..."],
  ["...C...C..", "..CC...CC."],
  ["....CC....", "....C.CC.."],
];
export const ROBOT_H = ROBOT_TOP.length + 2;

const GLYPHS: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
  "7": "111001010010010",
  "8": "111101111101111",
  "9": "111101111001111",
};

/** Number boards are 11x9: a one-cell rim, a one-cell margin and two 3x5 digits. */
export const BOARD = { w: 11, h: 9 } as const;

/** A board at `k` times its size, every part still a whole number of cells. */
function board(px: Px, n: number, x: number, y: number, lit: boolean, k = 1) {
  px.rect(x, y, BOARD.w * k, BOARD.h * k, CREAM);
  px.rect(x + k, y + k, (BOARD.w - 2) * k, (BOARD.h - 2) * k, lit ? YELLOW : INK);
  [...String(n).padStart(2, "0")].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS["0"];
    for (let q = 0; q < 15; q++) if (g[q] === "1") px.rect(x + (2 + i * 4 + (q % 3)) * k, y + (2 + Math.floor(q / 3)) * k, k, k, lit ? INK : CREAM);
  });
  if (!lit) return;
  // The homepage marks the step that matters with yellow corner brackets, one cell out.
  const [l, r, t, b] = [x - 2 * k, x + (BOARD.w + 1) * k - k, y - 2 * k, y + (BOARD.h + 1) * k - k];
  for (const [cx, cy, sx, sy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]] as const)
    for (let q = 0; q < 3; q++) {
      px.rect(cx + sx * q * k, cy, k, k, YELLOW);
      px.rect(cx, cy + sy * q * k, k, k, YELLOW);
    }
}

/** The robot with an outline on its sides and top, so it reads in front of the sky, at `k` times its size. */
function robot(px: Px, x: number, feet: number, frame: number, lift: number, antenna: boolean, k = 1) {
  const rows = [...ROBOT_TOP, ...LEGS[frame % 4]];
  const top = feet - rows.length * k + 1 - lift * k;
  const at = (i: number, j: number) => j >= 0 && j < rows.length && i >= 0 && i < 10 && rows[j][i] !== ".";
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < 10; i++) {
      if (!at(i, j)) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]] as const) if (!at(i + dx, j + dy)) px.rect(x - 5 * k + (i + dx) * k, top + (j + dy) * k, k, k, INK);
    }
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch in MAP && px.rect(x - 5 * k + i * k, top + j * k, k, k, MAP[ch])));
  if (!antenna) px.rect(x - k, top, k, k, PALE);
}

/** A cream speech block with an ink tick, shown beside the robot's head after a copy. */
function tick(px: Px, x: number, y: number) {
  px.rect(x - 1, y - 1, 11, 10, INK);
  px.rect(x, y, 9, 8, CREAM);
  for (const [i, j] of [[2, 4], [3, 5], [4, 4], [5, 3], [6, 2]]) px.set(x + i, y + j, INK);
}

import { standOffset, skyStars, type Box } from "../chrome-layout";

// ── The scene ────────────────────────────────────────────────────────────────────────────────

export type SceneState = {
  /** Cells per page on the ruler, and how many pages the ruler shows. */
  pitch: number;
  pages: number;
  /** Ruler marks: the page index (in view) where each numbered board hangs, and its number. */
  boards: readonly { at: number; n: number; lit: boolean }[];
  /** The robot's position, in pages from the left of the view (fractional while it walks). */
  pos: number;
  frame: number;
  lift: number;
  antenna: boolean;
  copied: boolean;
  /** Height of the horizon (the ruler), in cells from the top, and where the ruler starts. */
  ruler: number;
  ox: number;
  /** Light the ruler behind the robot: off when the page is not on the trace. */
  trail: boolean;
  /** The sun's centre column and radius, or none; see `placeSun`. */
  sun: { cx: number; r: number } | null;
  /** Boards and robot are drawn at this many times their size (1 or 2), on the same grid. */
  scale?: number;
};

/**
 * Sky, banded sun, the ruler that is the site's timeline, numbered boards under it and the robot
 * on it. The ruler behind the robot is lit yellow: the run so far.
 */
export function drawScene(px: Px, s: SceneState) {
  const { w } = px;
  const R = s.ruler;
  const k = s.scale ?? 1;
  const span = s.pitch * s.pages;
  const o = s.ox;
  px.clear();

  const lit = Math.round(s.pos * s.pitch + standOffset(s.pitch, k));
  const rx = o + lit;

  // Stars stay out of the sun and out of the robot's column.
  const avoid: Box[] = [{ x0: rx - 6 * k - 3, x1: rx + 6 * k + 3, y0: R - 15 * k - 3, y1: R }];
  if (s.sun) avoid.push({ x0: s.sun.cx - s.sun.r - 2, x1: s.sun.cx + s.sun.r + 2, y0: R - s.sun.r - 2, y1: R });
  for (const st of skyStars(w, R, avoid)) px.set(st.x, st.y, st.pale ? PALE : CREAM);

  // The homepage sun, setting at one end of the timeline, cut by the horizon.
  if (s.sun) {
    const { cx, r } = s.sun;
    for (let y = -r; y < 0; y++) {
      const band = y > -r * 0.55 && (y + r) % 4 === 3 - Math.min(2, Math.floor((y + r * 0.55) / 3));
      if (band) continue;
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y) / r;
        if (d > 1) continue;
        px.set(cx + x, R + y, d > 0.84 && dith(cx + x, R + y, 0.5) ? PALE : YELLOW);
      }
    }
  }

  // Before the first page and past the last one the horizon is the homepage's dotted ground line.
  for (let x = 0; x < o - 1; x += 2) px.set(x, R, CREAM);
  for (let x = o + span; x < w; x += 2) px.set(x, R, CREAM);
  px.rect(o, R, span - 1, 1, CREAM);
  if (s.trail) px.rect(o, R, Math.max(0, Math.min(span - 1, lit)), 1, YELLOW);
  for (let q = 1; q < s.pages; q++) px.set(o + q * s.pitch - 1, R + 1, CREAM);

  for (const b of s.boards) {
    const x = o + b.at * s.pitch;
    px.rect(x + Math.floor((5.5 * k) - k / 2), R + 1, k, k, CREAM);
    board(px, b.n, x, R + 1 + k, b.lit, k);
  }

  robot(px, rx, R - 1, s.frame, s.lift, s.antenna, k);
  if (s.copied) tick(px, rx + 8 + 9 > w ? rx - 17 : rx + 8, R - ROBOT_H - 2 - s.lift);
}
