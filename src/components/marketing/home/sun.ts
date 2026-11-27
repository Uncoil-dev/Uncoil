// Where the sun may stand in a scene, kept apart from the drawing code so the tests can sweep it.

/**
 * The columns the sun keeps out of around a goal flag standing at column `goal`: the pole, the
 * cloth that runs ten cells to its right, and a clear band either side, so the disc and the flag
 * never read as touching.
 */
export const flagKeepOut = (goal: number): [number, number] => [goal - 6, goal + 17];

/**
 * Where the sun stands so that no post, pole or line of copy crosses it: the centre nearest to
 * `prefer` that keeps the whole disc, with 3 pixels of air, clear of every `avoid` column range.
 * When nothing fits at full size the sun gets smaller, down to `minR`; null if it fits at no size.
 */
export function placeSun(w: number, r0: number, avoid: readonly (readonly [number, number])[], prefer: number, minR = 8) {
  for (let r = r0; r >= minR; r--) {
    const lo = r + 2;
    const hi = w - r - 3;
    let free: [number, number][] = hi >= lo ? [[lo, hi]] : [];
    for (const [a, b] of avoid) {
      const from = a - r - 3;
      const to = b + r + 3;
      free = free.flatMap(([x0, x1]) => {
        const out: [number, number][] = [];
        if (from > x0) out.push([x0, Math.min(x1, from)]);
        if (to < x1) out.push([Math.max(x0, to), x1]);
        return out;
      });
    }
    if (!free.length) continue;
    let best = free[0][0];
    let gap = Infinity;
    for (const [x0, x1] of free) {
      const x = Math.min(x1, Math.max(x0, prefer));
      if (Math.abs(x - prefer) < gap) {
        gap = Math.abs(x - prefer);
        best = x;
      }
    }
    return { cx: best, r };
  }
  return null;
}

/**
 * A sun that stands in the sky between the copy and the top of the goal flag, for screens too
 * narrow to give it room beside the flag: the largest disc, up to `r`, with 4 rows of air above the
 * flag's top and 3 under the copy, centred in that gap. Null when the gap is too small for a disc
 * that still reads as a sun.
 */
export function skySun(copyEnd: number, flagTop: number, r: number, minR = 5) {
  const top = copyEnd + 3;
  const bottom = flagTop - 4;
  const fit = Math.min(r, Math.floor((bottom - top) / 2));
  return fit >= minR ? { r: fit, cy: Math.round((top + bottom) / 2) } : null;
}
