// Pixel pieces for the run's six steps, shared by the hero and the trace scene: where each step
// sits on the path, a tiny numeral tag for it, and the hollow stone that stands for an empty result.

import { CREAM, INK, YELLOW, type Px } from "../pixel-world/pixels";

const GLYPHS: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
};

/** A two-digit step tag ("04") on an ink plate, so it reads over textured ground. */
export function stepTag(px: Px, n: number, cx: number, y: number, color: number) {
  const text = String(n).padStart(2, "0");
  const x = Math.round(cx) - 4;
  px.rect(x - 1, y - 1, 9, 7, INK);
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS["0"];
    for (let k = 0; k < 15; k++) if (g[k] === "1") px.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), color);
  });
}

/**
 * Left edges of the stones for steps 01 to 05 on the path. The ground draws a stone every 14
 * pixels, so steps sit on real stones: step 05 is the last stone before the gap, step 04 the one
 * before it, and so on. Steps that would fall off the left edge come back negative.
 */
export function stepStones(gap0: number) {
  const last = Math.floor((gap0 - 15) / 14) * 14;
  return [1, 2, 3, 4, 5].map((k) => last - (5 - k) * 14);
}

/** Step 04's stone: hollow while the search returns nothing, solid yellow once it is fixed. */
export function causeStone(px: Px, x: number, groundY: number, fixed: boolean) {
  px.rect(x, groundY - 5, 12, 5, INK);
  if (fixed) {
    px.rect(x, groundY - 3, 12, 3, YELLOW);
    return;
  }
  px.rect(x, groundY - 3, 12, 1, CREAM);
  px.rect(x, groundY - 3, 1, 3, CREAM);
  px.rect(x + 11, groundY - 3, 1, 3, CREAM);
}
