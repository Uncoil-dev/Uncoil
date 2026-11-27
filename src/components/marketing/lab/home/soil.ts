// Pebbles in the soil of the ink scenes: placed on a fixed rhythm, never on a chasm edge. Pure,
// so the tests can check the clearance.

import { hash } from "../pixel-world/world.ts";

/** Small stones bedded in the soil, one of these per pebble. */
const PEBBLES = [["CC"], ["CCC"], [".C.", "CCC"], ["CC"]] as const;

/** Pebble cells under the ground line, as [x, y] buffer cells, kept two cells clear of every chasm wall. */
export function pebbles(w: number, h: number, groundY: number, gaps: readonly (readonly [number, number])[], cam = 0) {
  const out: [number, number][] = [];
  const clear = (x: number) => !gaps.some(([a, b]) => x + cam >= a - 6 && x + cam < b + 6);
  for (let band = 0; groundY + 7 + band * 6 < h - 2; band++) {
    const y0 = groundY + 7 + band * 6;
    // Each row of soil gets one pebble per 11-column bay, at most, so they never clump.
    for (let bay = Math.floor(cam / 11) - 1; bay * 11 < cam + w + 11; bay++) {
      const k = bay * 53 + band * 7;
      if (hash(k, 41) > 0.42 - band * 0.05) continue;
      const shape = PEBBLES[Math.floor(hash(k, 43) * PEBBLES.length)];
      const x0 = bay * 11 + 2 + Math.floor(hash(k, 47) * 6) - cam;
      const y = y0 + (band % 2 ? 1 : 0);
      const cells: [number, number][] = [];
      shape.forEach((row, j) => [...row].forEach((c, i) => c === "C" && cells.push([x0 + i, y + j])));
      if (cells.every(([x]) => clear(x))) out.push(...cells);
    }
  }
  return out;
}
