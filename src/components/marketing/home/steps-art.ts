// Pixel pieces for the run's six steps, shared by the hero, the trace figure and the closing
// scene: where each step sits on the path, the board that carries its number, and the hollow
// stone that stands for an empty result. All numerals on the page come from the one 3x5 face here.

import { CREAM, INK, YELLOW, type Px } from "./pixels";
import { BOARD } from "./where-layout";

const GLYPHS: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
};

/** Two digits ("04") of the 3x5 face, 7 cells wide and 5 tall, top-left at x, y. */
export function numerals(px: Px, n: number, x: number, y: number, color: number) {
  [...String(n).padStart(2, "0")].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS["0"];
    for (let k = 0; k < 15; k++) if (g[k] === "1") px.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), color);
  });
}

export { BOARD };

/**
 * A step's number board: an 11x9 plate with a one-cell rim and the two digits inside. The rim
 * keeps the board apart from whatever stands behind it.
 */
export function board(px: Px, n: number, x: number, y: number, { rim, fill, ink }: { rim: number; fill: number; ink: number }) {
  px.rect(x, y, BOARD.w, BOARD.h, rim);
  px.rect(x + 1, y + 1, BOARD.w - 2, BOARD.h - 2, fill);
  numerals(px, n, x + 2, y + 2, ink);
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
