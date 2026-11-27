// The morning half's thin landscape: a ground line with stones, and a far ridge for the strip
// between setup and price. Drawn on the page grid in ink on a clear canvas over the cream
// sections, with first light (#fff4b5) dithered above the ridge, strongest under the fix and gone
// by the questions. Pure, so the tests can check what it draws.

import { INK, PALE, Px, dith } from "./pixels.ts";
import { hash, noise } from "./math.ts";

export type GroundSpec = {
  /** 0..1: how much first light shows above the ridge. 0 draws none. */
  glow: number;
  /** 0..1: how tall the far ridge stands; 0 leaves the ground flat. */
  hills: number;
  /** Stepping stones on the ground line, one per agent step, as in the scenes above. */
  stones?: boolean;
  /** A few small pines standing on the ground line. */
  pines?: boolean;
};

const PINE = ["...#...", "..###..", "...#...", "..###..", ".#####."];

export function drawGround(px: Px, { glow, hills, stones = false, pines = false }: GroundSpec) {
  const { w, h } = px;
  px.buf.fill(0);
  const base = h - 2;
  for (let x = 0; x < w; x++) {
    const n = 0.65 * noise(x * 0.035, 41) + 0.35 * noise(x * 0.11, 43);
    const rise = hills * (h - 3) * Math.min(1, Math.max(0.1, (n - 0.25) * 2));
    const top = base - 1 - Math.round(rise);
    // The far ridge is a one-cell line with a thin dithered shade under it.
    if (hills > 0) {
      px.set(x, top, INK);
      for (let y = top + 1; y < base; y++) if (dith(x, y, 0.55 - (y - top) * 0.14)) px.set(x, y, INK);
    }
    // First light: pale pixels thinning upward, brightest on the right where the sun stood.
    const k = glow * (0.35 + 0.65 * Math.pow(x / Math.max(1, w - 1), 1.4));
    for (let d = 1; d <= 5; d++) {
      const y = top - d;
      if (y >= 0 && dith(x, y, k * (1 - d / 6) * 0.85)) px.set(x, y, PALE);
    }
  }
  px.rect(0, base, w, 2, INK);
  if (pines) {
    for (let x = 18; x + 8 < w; x += 23 + Math.floor(hash(x, 9) * 40)) px.sprite(PINE, x, base - PINE.length, { "#": INK });
  }
  if (stones) {
    for (let x = 6; x + 12 < w; x += 14) {
      const sh = 1 + Math.round(hash(x, 4) * 1.4);
      px.rect(x, base - sh, 12, sh, INK);
      if (glow > 0) px.rect(x, base - sh - 1, 12, 1, PALE);
    }
  }
}
