// Small pure helpers shared by the homepage's pixel scenes and the sign-in pages: easing, scroll
// sub-ranges and deterministic noise, so the art looks the same on every render and every device.

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Maps a 0..1 progress onto a sub-range, so several animations can share one scroll value. */
export const segment = (p: number, start: number, end: number) => clamp01((p - start) / (end - start));

/** Deterministic 0..1 noise so the hills look the same on every render and every device. */
export function hash(n: number, seed = 1) {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise(x: number, seed = 1) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}
