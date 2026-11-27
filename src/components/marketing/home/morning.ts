// The morning half's thin landscape: a ground line with stones, and a far ridge for the strip
// between setup and price. Drawn on the page grid in ink on a clear canvas over the cream
// sections, with first light (#fff4b5) dithered above the ridge, strongest under the fix and gone
// by the questions. Pure, so the tests can check what it draws.

import { INK, PALE, YELLOW, Px, dith } from "./pixels.ts";
import { hash, noise } from "./math.ts";

export type GroundSpec = {
  /** 0..1: how much first light shows above the ridge. 0 draws none. */
  glow: number;
  /** 0..1: how tall the far ridge stands; 0 leaves the ground flat. */
  hills: number;
  /** Stepping stones on the ground line, one per agent step, as in the scenes above. */
  stones?: boolean;
  /** A few pines standing on the ground line. */
  pines?: boolean;
  /** A low sun in yellow, rising behind the ridge on the right, which dips to let it show. */
  sun?: boolean;
};

const PINE = ["....#....", "...###...", "..#####..", "....#....", "...###...", "..#####..", ".#######.", "....#...."];
const PINE_BIG = ["......#......", ".....###.....", "....#####....", "......#......", ".....###.....", "....#####....", "......#......", ".....###.....", "....#####....", "...#######...", "..#########..", "......#......"];
const SUN_AT = 0.78;

export function drawGround(px: Px, { glow, hills, stones = false, pines = false, sun = false }: GroundSpec) {
  const { w, h } = px;
  px.buf.fill(0);
  const base = h - 2;
  const sunR = sun ? Math.max(0, Math.min(11, base - 3)) : 0;
  const sunX = Math.min(w - sunR - 2, Math.round(w * SUN_AT));
  let prevTop = -1;
  for (let x = 0; x < w; x++) {
    const n = 0.65 * noise(x * 0.035, 41) + 0.35 * noise(x * 0.11, 43);
    let rise = hills * (h - 3) * Math.min(1, Math.max(0.15, (n - 0.2) * 2.2));
    // The ridge dips on either side of the sun, so the sun stands in a notch of the hills.
    if (sunR) rise *= Math.min(1, Math.pow(Math.abs(x - sunX) / (sunR + 8), 2));
    const top = base - 1 - Math.round(rise);
    // The far ridge is a solid one-cell line with a thin dithered shade under it.
    if (hills > 0) {
      // Two cells thick, and joined to the column before it, so the crest is one unbroken stroke.
      for (let y = prevTop < 0 ? top : Math.min(top, prevTop + 1); y <= top + 1; y++) px.set(x, y, INK);
      for (let y = top + 2; y < base; y++) if (dith(x, y, 0.55 - (y - top) * 0.14)) px.set(x, y, INK);
    }
    prevTop = top;
    // First light: pale pixels thinning upward, brightest on the right where the sun stood.
    const k = glow * (0.35 + 0.65 * Math.pow(x / Math.max(1, w - 1), 1.4));
    for (let d = 1; d <= 5; d++) {
      const y = top - d;
      if (y >= 0 && dith(x, y, k * (1 - d / 6) * 0.85)) px.set(x, y, PALE);
    }
    // The sun: the part of the disc above the ridge, over the first light.
    if (sunR && Math.abs(x - sunX) <= sunR) {
      const cy = base - 1;
      for (let y = cy - sunR; y < top; y++) {
        const d = Math.hypot(x - sunX, y - cy) / sunR;
        if (d <= 1 && y >= 0) px.set(x, y, d > 0.86 && dith(x, y, 0.5) ? PALE : YELLOW);
      }
    }
  }
  px.rect(0, base, w, 2, INK);
  if (pines) {
    for (let x = 14; x + 9 < w; x += 20 + Math.floor(hash(x, 9) * 34)) {
      if (sunR && Math.abs(x + 4 - sunX) < sunR + 8) continue;
      const tree = base >= PINE_BIG.length && hash(x, 17) > 0.45 ? PINE_BIG : PINE;
      px.sprite(tree, x, base - tree.length, { "#": INK });
    }
  }
  if (stones) {
    for (let x = 6; x + 12 < w; x += 14) {
      const sh = 1 + Math.round(hash(x, 4) * 1.4);
      px.rect(x, base - sh, 12, sh, INK);
      if (glow > 0) px.rect(x, base - sh - 1, 12, 1, PALE);
    }
  }
}
