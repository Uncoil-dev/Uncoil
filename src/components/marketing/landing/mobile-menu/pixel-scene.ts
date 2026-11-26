// A tiny software renderer for the phone menu's night scene: stars, a banded sun, two ridge
// lines, a stone path and the walking robot. Everything is drawn into one low-resolution buffer
// in brand colors with ordered dithering, then scaled up with crisp pixels.

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
};

const INK = rgba("#090909");
const CREAM = rgba("#eceae3");
const YELLOW = rgba("#f4d44d");
const PALE = rgba("#fff4b5");

/** Deterministic 0..1 noise so the hills look the same on every render and every device. */
function hash(n: number, seed = 1) {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, seed = 1) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

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
  set(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = Math.max(0, Math.round(y)); j < Math.min(this.h, Math.round(y) + h); j++)
      for (let i = Math.max(0, Math.round(x)); i < Math.min(this.w, Math.round(x) + w); i++) this.buf[j * this.w + i] = c;
  }
  sprite(rows: readonly string[], x: number, y: number) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = SPRITE_COLORS[row[i]];
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

const SPRITE_COLORS: Record<string, number> = { C: CREAM, K: INK, Y: YELLOW };
const ROBOT_TOP = ["....Y.....", "....C.....", ".CCCCCCCC.", ".CKKKKKKC.", ".CKYKKYKC.", ".CKKKKKKC.", ".CCCCCCCC.", "...CCCC...", ".CCCCCCCC.", "C.CCYCCC.C", "...CCCC..."];
const LEGS = [
  ["...C..C...", "..CC..CC.."],
  ["....CC....", "...CC.C..."],
  ["...C...C..", "..CC...CC."],
  ["....CC....", "....C.CC.."],
];

function robot(px: Px, x: number, groundY: number, frame: number) {
  const top = groundY - ROBOT_TOP.length - 2 - (frame % 2);
  px.sprite(ROBOT_TOP, x - 5, top);
  px.sprite(LEGS[frame % 4], x - 5, groundY - 2);
}

function ridge(px: Px, base: number, amp: number, freq: number, seed: number, far: boolean) {
  const topAt = (x: number) => Math.round(base - amp * (0.6 * noise(x * freq, seed) + 0.3 * noise(x * freq * 2.7, seed + 1) + 0.1 * noise(x * freq * 7, seed + 2)));
  let prev = topAt(-1);
  for (let x = 0; x < px.w; x++) {
    const top = topAt(x);
    for (let y = top; y < base + 6; y++) {
      const d = y - top;
      const on = d < 1 || y <= prev ? true : d < 4 ? dith(x, y, (far ? 0.3 : 0.5) - d * 0.14) : hash(x * 977 + y, seed) < (far ? 0.008 : 0.018);
      px.set(x, y, on ? (far && d > 0 && y > prev ? INK : CREAM) : INK);
    }
    prev = top;
  }
}

/**
 * Draws one frame. `walk` is 0..1 along the path; stones behind the robot light up yellow, so
 * the path reads as a trace being recorded. `seconds` drives star twinkle and the walk cycle.
 */
export function drawScene(px: Px, walk: number, seconds: number, moving: boolean) {
  const { w, h } = px;
  const groundY = h - 6;
  px.buf.fill(INK);
  // A thin strip (a group is open) keeps only the path and the robot, so it never looks crowded.
  const roomy = h >= 30;
  for (let i = 0; roomy && i < 40; i++) {
    const twinkle = moving && hash(i + Math.floor(seconds * 1.5), 11) > 0.93;
    if (!twinkle) px.set(Math.floor(hash(i, 3) * w), Math.floor(hash(i, 7) * groundY * 0.45), hash(i, 13) > 0.8 ? PALE : CREAM);
  }
  const r = Math.round(Math.min(w * 0.12, h * 0.3));
  const cx = Math.round(w * 0.78);
  const cy = Math.round(groundY - Math.min(h * 0.3, 26));
  for (let y = -r; roomy && y <= r; y++) {
    if (y > -r * 0.15 && (y + r) % 5 < 1 + Math.floor(((y + r * 0.15) / r) * 3)) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d <= 1) px.set(cx + x, cy + y, d > 0.86 && dith(cx + x, cy + y, 0.5) ? PALE : YELLOW);
    }
  }
  if (roomy) ridge(px, groundY - Math.min(h * 0.16, 8), Math.min(h * 0.3, 22), 0.02, 21, true);
  ridge(px, groundY - 3, Math.min(h * 0.2, 12), 0.04, 5, false);
  px.rect(0, groundY, w, h - groundY, INK);
  px.rect(0, groundY, w, 1, CREAM);
  const rx = Math.round(-6 + (w + 12) * walk);
  for (let x = 2; x < w; x += 14) {
    const y = groundY - 3 - Math.round(hash(x, 4) * 1.4);
    px.rect(x, y, 12, groundY - y, x + 12 < rx ? YELLOW : CREAM);
    px.rect(x + 9, y + 1, 1, 1, INK);
  }
  if (h >= 17) robot(px, rx, groundY - 3, moving ? Math.floor(seconds * 8) : 0);
}
