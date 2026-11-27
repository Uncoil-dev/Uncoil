// Where the sun may stand in a scene, kept apart from the drawing code so the tests can sweep it.

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
