// A small software renderer for the menu map: one low-resolution buffer in the three brand
// colors with ordered dithering, scaled up with crisp pixels. Sprites match the pixel world on
// the homepage concept.

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
};

export const INK = rgba("#090909");
export const CREAM = rgba("#eceae3");
export const YELLOW = rgba("#f4d44d");
export const PALE = rgba("#fff4b5");

/** Deterministic 0..1 noise so the hills look the same on every render and every device. */
export function hash(n: number, seed = 1) {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise(x: number, seed = 1) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const dith = (x: number, y: number, d: number) => d > BAYER[(y & 3) * 4 + (x & 3)];

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
    x = Math.round(x);
    y = Math.round(y);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.buf[j * this.w + i] = c;
  }
  sprite(rows: readonly string[], x: number, y: number, map: Record<string, number>, flip = false) {
    x = Math.round(x);
    y = Math.round(y);
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = map[row[flip ? row.length - 1 - i : i]];
        if (c !== undefined) this.set(x + i, y + j, c);
      }
    });
  }
  blit(ctx: CanvasRenderingContext2D) {
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.buf);
    ctx.putImageData(img, 0, 0);
  }
}

export const MAP = { C: CREAM, K: INK, Y: YELLOW, P: PALE } as Record<string, number>;

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
const ROBOT_WAVE = [
  "....Y....C",
  "....C....C",
  ".CCCCCCCCC",
  ".CKKKKKKC.",
  ".CKYKKYKC.",
  ".CKKKKKKC.",
  ".CCCCCCCC.",
  "...CCCC...",
  ".CCCCCCCC.",
  "C.CCYCCC..",
  "...CCCC...",
];
const LEGS = [
  ["...C..C...", "..CC..CC.."],
  ["....CC....", "...CC.C..."],
  ["...C...C..", "..CC...CC."],
  ["....CC....", "....C.CC.."],
];
export const ROBOT_H = ROBOT_TOP.length + 2;

/** The robot with its feet on `groundY`. `frame` steps the legs; `lift` raises it for a hop. */
export function robot(px: Px, x: number, groundY: number, frame: number, flip: boolean, lift = 0, wave = false) {
  const top = groundY - ROBOT_H - Math.round(lift);
  // A one-pixel ink halo keeps the robot readable over the trail and landmarks.
  const halo = { C: INK, K: INK, Y: INK };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    px.sprite(wave ? ROBOT_WAVE : ROBOT_TOP, x - 5 + dx, top + dy, halo, flip);
    px.sprite(LEGS[lift > 0 ? 2 : frame % 4], x - 5 + dx, top + ROBOT_TOP.length + dy, halo, flip);
  }
  px.sprite(wave ? ROBOT_WAVE : ROBOT_TOP, x - 5, top, MAP, flip);
  px.sprite(LEGS[lift > 0 ? 2 : frame % 4], x - 5, top + ROBOT_TOP.length, MAP, flip);
}

/** Small landmarks, one per stop, so each sign reads as a place rather than a row. */
export const LANDMARKS: readonly (readonly string[])[] = [
  // Product: a stack of trace spans, the last one lit.
  ["CCCCCCCC...", "...........", "..CCCCC....", "...........", "....CCCCCC.", "...........", "...YYYY....", "...........", "CCCCCCCCCCC"],
  // Solutions: two pines.
  ["....C......", "...CKC.....", "...CKC..C..", "..CKKKC.CKC", "..CKKKCCKKC", ".CKKKKKCKKC", ".CCCCCCCKKKC", "....C...CCCC", "....C....C."],
  // Developers: a terminal with a prompt.
  ["CCCCCCCCCCC", "CKKKKKKKKKC", "CKYKKKKKKKC", "CKKYKKKKKKC", "CKYKKYYYKKC", "CKKKKKKKKKC", "CCCCCCCCCCC", "....CCC....", "..CCCCCCC.."],
  // Company: a cabin with a lit window.
  [".....C.....", "....CKC....", "...CKKKC...", "..CKKKKKC..", ".CCCCCCCCC.", ".CKKKKKKKC.", ".CKYYKKCKC.", ".CKYYKKCKC.", ".CCCCCCCCC."],
  // Pricing: the summit flag.
  ["CYYYYY.....", "CYYYYYY....", "CYYYYY.....", "C..........", "C..........", "C..........", "C..........", "C..........", "CC........."],
];

const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111"];
export function digit(px: Px, n: number, x: number, y: number, c: number) {
  const g = DIGITS[n] ?? DIGITS[0];
  for (let i = 0; i < 15; i++) if (g[i] === "1") px.set(x + (i % 3), y + Math.floor(i / 3), c);
}

/**
 * A ridge across the map. The far ridge (`fill`) has a solid lit crest and dark land below it
 * with the odd speck of light; the others are dotted contour lines on the slope.
 */
export function ridge(px: Px, base: number, amp: number, freq: number, seed: number, fill: boolean) {
  for (let x = 0; x < px.w; x++) {
    const top = Math.round(base - amp * (0.6 * noise(x * freq, seed) + 0.3 * noise(x * freq * 2.7, seed + 1) + 0.1 * noise(x * freq * 7, seed + 2)));
    if (!fill) {
      if (x % 4 === 0) px.set(x, top, CREAM);
      continue;
    }
    for (let y = top; y < px.h; y++) {
      const d = y - top;
      const on = d === 0 || (d < 4 && dith(x, y, 0.45 - d * 0.14)) || hash(x * 977 + y, seed) < 0.008;
      px.set(x, y, on ? CREAM : INK);
    }
  }
}

/** The banded sun, the warm light behind the far stop. */
export function sun(px: Px, cx: number, cy: number, r: number) {
  for (let y = -r; y <= r; y++) {
    const band = y > -r * 0.15 && (y + r) % 5 < 1 + Math.floor(((y + r * 0.15) / r) * 3);
    if (band) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      px.set(cx + x, cy + y, d > 0.86 && dith(cx + x, cy + y, 0.5) ? PALE : YELLOW);
    }
  }
}
