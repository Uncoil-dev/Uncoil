// A tiny software renderer for the pixel world. Everything is drawn into one low-resolution
// buffer with solid brand colors and ordered dithering, then scaled up with crisp pixels.

import { hash, noise, reliefUnder, sunRadius } from "../scene";

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255);
};

export const INK = rgba("#090909");
export const CREAM = rgba("#eceae3");
export const YELLOW = rgba("#f4d44d");
export const PALE = rgba("#fff4b5");

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const dith = (x: number, y: number, d: number) => d > BAYER[(y & 3) * 4 + (x & 3)];

export class Px {
  buf: Uint32Array;
  constructor(public w: number, public h: number) {
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
export const ROBOT_H = ROBOT_TOP.length + 2;
const MAP = { C: CREAM, K: INK, Y: YELLOW } as Record<string, number>;

export function robot(px: Px, x: number, groundY: number, frame: number, alert = false) {
  const bob = frame % 2;
  const top = groundY - ROBOT_H - bob;
  px.sprite(ROBOT_TOP, x - 5, top, MAP);
  px.sprite(LEGS[frame % 4], x - 5, groundY - 2, MAP);
  if (alert) {
    // A cream speech block with a "!" in ink.
    px.rect(x + 4, top - 10, 7, 8, CREAM);
    px.rect(x + 7, top - 9, 1, 4, INK);
    px.rect(x + 7, top - 4, 1, 1, INK);
    px.rect(x + 5, top - 2, 2, 1, CREAM);
  }
}

const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001"];
export function digit(px: Px, n: number, x: number, y: number, c: number) {
  const g = DIGITS[n] ?? DIGITS[0];
  for (let i = 0; i < 15; i++) if (g[i] === "1") px.set(x + (i % 3), y + Math.floor(i / 3), c);
}

/** A numbered stop sign. A lit sign turns yellow with ink digits. */
export function signpost(px: Px, n: number, x: number, groundY: number, lit = false) {
  px.rect(x, groundY - 16, 1, 16, CREAM);
  px.rect(x - 5, groundY - 24, 11, 9, lit ? YELLOW : CREAM);
  px.rect(x - 4, groundY - 23, 9, 7, lit ? YELLOW : INK);
  digit(px, 0, x - 3, groundY - 22, lit ? INK : YELLOW);
  digit(px, n, x + 1, groundY - 22, lit ? INK : YELLOW);
}

export function flag(px: Px, x: number, groundY: number, raise: number) {
  px.rect(x, groundY - 28, 1, 28, CREAM);
  px.rect(x - 1, groundY - 29, 3, 1, CREAM);
  const y = Math.round(groundY - 8 - raise * 18);
  px.rect(x + 1, y, 10, 6, raise >= 1 ? YELLOW : CREAM);
  px.dither(x + 1, y, 10, 6, 0.3, INK);
}

// ── Landscape ──────────────────────────────────────────────────────────────────────────────

export type Scene = { px: Px; cam: number; groundY: number; t: number };

/** A box in the top-left corner that holds HTML text: no stars, sun or hills are drawn there. */
export type Clear = { x: number; y: number } | null;

/** Sky, stars, sun and two ridge lines, kept out of the `clear` box so text never sits on art. */
export function landscape({ px, cam, groundY, t }: Scene, sunX: number, relief: number, clear: Clear) {
  const { w, h } = px;
  px.clear();
  const inClear = (x: number, y: number) => clear !== null && x < clear.x + 2 && y < clear.y + 2;
  for (let i = 0; i < 70; i++) {
    const sx = Math.floor(hash(i, 3) * w);
    const sy = Math.floor(hash(i, 7) * groundY * 0.62);
    const tw = hash(i + Math.floor(t * 1.5), 11) > 0.93;
    if (!tw && !inClear(sx, sy)) px.set(sx, sy, hash(i, 13) > 0.8 ? PALE : CREAM);
  }
  // A banded pixel sun on the far ridge. It shrinks rather than slide under the heading.
  const cx = Math.round(w * sunX - cam * 0.14);
  const full = Math.round(Math.min(w * 0.11, h * 0.2));
  const shared = clear !== null && cx - full < clear.x;
  const r = sunRadius(w, h, groundY, shared ? clear.y : null);
  const cy = Math.round(groundY - h * 0.2 - r * 0.6);
  for (let y = -r; y <= r; y++) {
    const band = y > -r * 0.15 && (y + r) % 5 < 1 + Math.floor(((y + r * 0.15) / r) * 3);
    if (band) continue;
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y) / r;
      if (d > 1) continue;
      px.set(cx + x, cy + y, d > 0.86 && dith(cx + x, cy + y, 0.5) ? PALE : YELLOW);
    }
  }
  const lift = reliefUnder(groundY, h, clear?.y ?? null, relief);
  ridge(px, cam * 0.2, groundY - h * 0.1 * lift, h * 0.24 * lift, 0.014, 0.1, 21);
  ridge(px, cam * 0.5, groundY - 3, h * 0.17 * lift, 0.03, 0.22, 5);
}

function ridge(px: Px, off: number, base: number, amp: number, freq: number, dens: number, seed: number) {
  const far = dens < 0.15;
  const topAt = (x: number) => {
    const wx = x + Math.round(off);
    return Math.round(base - amp * (0.6 * noise(wx * freq, seed) + 0.3 * noise(wx * freq * 2.7, seed + 1) + 0.1 * noise(wx * freq * 7, seed + 2)));
  };
  let prev = topAt(-1);
  for (let x = 0; x < px.w; x++) {
    const wx = x + Math.round(off);
    const top = topAt(x);
    for (let y = top; y < base + 6; y++) {
      const d = y - top;
      // A solid lit crest, a short dithered falloff, then dark rock with the odd speck of light.
      const on = d < 1 || y <= prev ? true : d < 4 ? dith(x, y, (far ? 0.3 : 0.5) - d * 0.14) : hash(wx * 977 + y, seed) < dens * 0.08;
      px.set(x, y, on ? (far && d > 0 && y > prev ? INK : CREAM) : INK);
    }
    prev = top;
  }
}

/** Ground with stepping stones. `gaps` are world-x ranges with no ground (a chasm). */
export function ground(s: Scene, gaps: readonly (readonly [number, number])[], litUntil = -1, litFrom = Infinity) {
  const { px, cam, groundY } = s;
  for (let x = 0; x < px.w; x++) {
    const wx = x + cam;
    const gap = gaps.find(([a, b]) => wx >= a - 3 && wx < b + 3);
    // Ragged chasm walls: the gap narrows a little with depth, like a cut in rock.
    const wall = gap ? Math.min(wx - gap[0], gap[1] - 1 - wx) : 99;
    for (let y = groundY; y < px.h; y++) {
      const depth = y - groundY;
      const edge = Math.round(hash(Math.floor(depth / 3) + (gap && wx > (gap[0] + gap[1]) / 2 ? 50 : 0), 7) * 3) - 1 + Math.floor(depth / 8);
      if (gap && wall >= edge) {
        px.set(x, y, INK);
        continue;
      }
      const lit = depth === 0 || (gap && wall >= edge - 1);
      px.set(x, y, lit || (depth < 4 && dith(x, y, 0.5 - depth * 0.15)) || hash(wx * 613 + y, 9) < 0.025 * (1 - depth / 40) ? CREAM : INK);
    }
  }
  // Stones: one per agent step, every 14 world px.
  const first = Math.floor(cam / 14) * 14;
  for (let wx = first; wx < cam + px.w + 14; wx += 14) {
    if (gaps.some(([a, b]) => wx + 12 > a - 3 && wx < b + 3)) continue;
    const x = wx - cam;
    const y = groundY - 3 - Math.round(hash(wx, 4) * 1.4);
    px.rect(x, y, 12, groundY - y, CREAM);
    px.rect(x, groundY, 12, 1, INK);
    px.rect(x + 9, y + 1, 1, 1, INK);
    if (wx >= litFrom && wx < litUntil) px.rect(x, y, 12, 2, YELLOW);
  }
}

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

/** Rope bridge planks over a chasm. `skip` is the plank index that is broken (or -1). */
export function bridge(s: Scene, x0: number, x1: number, skip: number) {
  const { px, cam, groundY } = s;
  const y = groundY - 3;
  for (let x = x0; x < x1; x++) px.set(x - cam, y - 4 + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 2), CREAM);
  px.rect(x0 - cam - 1, y - 7, 1, 10, CREAM);
  px.rect(x1 - cam, y - 7, 1, 10, CREAM);
  for (let i = 0, x = x0; x + 12 <= x1 + 1; i++, x += 12) {
    if (i === skip) continue;
    px.rect(x - cam, y + 1, 11, 3, CREAM);
    px.rect(x - cam + 3, y + 2, 1, 1, INK);
  }
}

