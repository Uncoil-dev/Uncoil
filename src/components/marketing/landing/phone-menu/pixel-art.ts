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

function board(px: Px, n: number, x: number, y: number, lit: boolean) {
  px.rect(x, y, BOARD.w, BOARD.h, CREAM);
  px.rect(x + 1, y + 1, BOARD.w - 2, BOARD.h - 2, lit ? YELLOW : INK);
  [...String(n).padStart(2, "0")].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS["0"];
    for (let k = 0; k < 15; k++) if (g[k] === "1") px.set(x + 2 + i * 4 + (k % 3), y + 2 + Math.floor(k / 3), lit ? INK : CREAM);
  });
  if (!lit) return;
  // The homepage marks the step that matters with yellow corner brackets, one cell out.
  const [l, r, t, b] = [x - 2, x + BOARD.w + 1, y - 2, y + BOARD.h + 1];
  for (const [cx, cy, sx, sy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]] as const)
    for (let k = 0; k < 3; k++) {
      px.set(cx + sx * k, cy, YELLOW);
      px.set(cx, cy + sy * k, YELLOW);
    }
}

/** The robot with a one-cell ink outline on its sides and top, so it reads in front of the sun. */
function robot(px: Px, x: number, feet: number, frame: number, lift: number, antenna: boolean) {
  const rows = [...ROBOT_TOP, ...LEGS[frame % 4]];
  const top = feet - rows.length + 1 - lift;
  const at = (i: number, j: number) => j >= 0 && j < rows.length && i >= 0 && i < 10 && rows[j][i] !== ".";
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < 10; i++) {
      if (!at(i, j)) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]] as const) if (!at(i + dx, j + dy)) px.set(x - 5 + i + dx, top + j + dy, INK);
    }
  px.sprite(rows, x - 5, top);
  if (!antenna) px.set(x - 1, top, PALE);
}

/** A cream speech block with an ink tick, shown beside the robot's head after a copy. */
function tick(px: Px, x: number, y: number) {
  px.rect(x - 1, y - 1, 11, 10, INK);
  px.rect(x, y, 9, 8, CREAM);
  for (const [i, j] of [[2, 4], [3, 5], [4, 4], [5, 3], [6, 2]]) px.set(x + i, y + j, INK);
}

// ── The scene ────────────────────────────────────────────────────────────────────────────────

const hash = (n: number, seed: number) => {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

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
};

/**
 * Sky, banded sun, the ruler that is the site's timeline, numbered boards under it and the robot
 * on it. The ruler behind the robot is lit yellow: the run so far.
 */
export function drawScene(px: Px, s: SceneState) {
  const { w } = px;
  const R = s.ruler;
  const span = s.pitch * s.pages;
  px.clear();

  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, 3) * (w - 4)) + 2;
    const y = Math.floor(hash(i, 7) * (R - 14)) + 2;
    px.set(x, y, i % 4 === 1 ? PALE : CREAM);
  }

  // The homepage sun, setting at the far end of the timeline, cut by the horizon.
  const r = Math.max(8, Math.min(14, R - 8));
  const cx = w - r + 2;
  for (let y = -r; y < 0; y++) {
    const band = y > -r * 0.55 && (y + r) % 4 === 3 - Math.min(2, Math.floor((y + r * 0.55) / 3));
    if (band) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      px.set(cx + x, R + y, d > 0.84 && dith(cx + x, R + y, 0.5) ? PALE : YELLOW);
    }
  }

  // Before the first page and past the last one the horizon is the homepage's dotted ground line.
  const o = s.ox;
  for (let x = 0; x < o - 1; x += 2) px.set(x, R, CREAM);
  for (let x = o + span; x < w; x += 2) px.set(x, R, CREAM);
  const lit = Math.round(s.pos * s.pitch + s.pitch / 2);
  px.rect(o, R, span - 1, 1, CREAM);
  if (s.trail) px.rect(o, R, Math.max(0, Math.min(span - 1, lit)), 1, YELLOW);
  for (let k = 1; k < s.pages; k++) px.set(o + k * s.pitch - 1, R + 1, CREAM);

  for (const b of s.boards) {
    const x = o + b.at * s.pitch;
    px.set(x + 5, R + 1, CREAM);
    board(px, b.n, x, R + 2, b.lit);
  }

  const rx = o + lit;
  robot(px, rx, R - 1, s.frame, s.lift, s.antenna);
  if (s.copied) tick(px, rx + 8 + 9 > w ? rx - 17 : rx + 8, R - ROBOT_H - 2 - s.lift);
}
