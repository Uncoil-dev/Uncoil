// A tiny software renderer for the page's pixel scenes. Everything is drawn into one low-resolution
// buffer with solid brand colors and ordered dithering, then scaled up with crisp pixels.

import { hash } from "./math.ts";

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
};

export const INK = rgba("#090909");
export const CREAM = rgba("#eceae3");
export const YELLOW = rgba("#f4d44d");
export const PALE = rgba("#fff4b5");
// The one red on the page. Only the broken step uses it.
export const RED = rgba("#ff4d3d");

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const dith = (x: number, y: number, d: number) => d > BAYER[(y & 3) * 4 + (x & 3)];

export class Px {
  w: number;
  h: number;
  buf: Uint32Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
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
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.buf[j * this.w + i] = c;
  }
  dither(x: number, y: number, w: number, h: number, d: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++)
      for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) if (dith(i, j, d)) this.buf[j * this.w + i] = c;
  }
  sprite(rows: readonly string[], x: number, y: number, map: Record<string, number>, flip = false) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = map[row[flip ? row.length - 1 - i : i]];
        if (c !== undefined) this.set(x + i, y + j, c);
      }
    });
  }
  /** Swaps ink and cream everywhere, leaving yellow and red: night art turned into a morning scene. */
  swap() {
    const ink = INK >>> 0;
    const cream = CREAM >>> 0;
    const b = this.buf;
    for (let i = 0; i < b.length; i++) {
      if (b[i] === ink) b[i] = cream;
      else if (b[i] === cream) b[i] = ink;
    }
  }
  blit(ctx: CanvasRenderingContext2D) {
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.buf);
    ctx.putImageData(img, 0, 0);
  }
}

// ── Sprites ────────────────────────────────────────────────────────────────────────────────

export const ROBOT_TOP = [
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
export const LEGS = [
  ["...C..C...", "..CC..CC.."],
  ["....CC....", "...CC.C..."],
  ["...C...C..", "..CC...CC."],
  ["....CC....", "....C.CC.."],
];

export function flag(px: Px, x: number, groundY: number, raise: number) {
  px.rect(x, groundY - 28, 1, 28, CREAM);
  px.rect(x - 1, groundY - 29, 3, 1, CREAM);
  const y = Math.round(groundY - 8 - raise * 18);
  px.rect(x + 1, y, 10, 6, raise >= 1 ? YELLOW : CREAM);
  px.dither(x + 1, y, 10, 6, 0.3, INK);
}

// ── Scenery ─────────────────────────────────────────────────────────────────────────────────

export type Scene = { px: Px; cam: number; groundY: number; t: number };

/** Pixel pines along the far side of the path, skipping the world-x ranges in `clear`. */
export function pines({ px, cam, groundY }: Scene, clear: readonly (readonly [number, number])[], parallax = 0.85) {
  const off = cam * parallax;
  const first = Math.floor(off / 23) - 1;
  for (let k = first; k < first + px.w / 23 + 3; k++) {
    if (hash(k, 61) < 0.45) continue;
    const wx = k * 23 + Math.round(hash(k, 67) * 12);
    if (clear.some(([a, b]) => wx / parallax > a - 10 && wx / parallax < b + 10)) continue;
    const x = Math.round(wx - off);
    const tall = 9 + Math.round(hash(k, 71) * 10);
    const base = groundY - 4;
    for (let j = 0; j < tall; j++) {
      const half = Math.floor(((j % 4) + 1 + j / 2.2) / 1.6);
      px.rect(x - half, base - tall + j, half * 2 + 1, 1, INK);
      px.set(x - half, base - tall + j, CREAM);
      px.set(x + half, base - tall + j, CREAM);
    }
    px.set(x, base - tall - 1, CREAM);
    px.rect(x, base, 1, 2, CREAM);
  }
}

/** Yellow pixels flying in from scattered positions to rebuild a step. */
export function rebuild(px: Px, x: number, y: number, w: number, h: number, t: number) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const d = hash(k, 23) * 0.5;
      const f = Math.min(1, Math.max(0, (t - d) / 0.5));
      const e = 1 - Math.pow(1 - f, 3);
      if (f <= 0) continue;
      const sx = x + i + (hash(k, 29) - 0.5) * 120;
      const sy = y + j - 30 - hash(k, 31) * 60;
      px.set(sx + (x + i - sx) * e, sy + (y + j - sy) * e, f >= 1 && j > 0 && (i + j) % 3 === 0 ? INK : YELLOW);
    }
}
