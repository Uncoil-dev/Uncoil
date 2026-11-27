// Pure helpers behind the pixel dissolve, where one shape's pixels fly over to form another. No DOM
// access, so they can be unit tested.

export type Pt = { x: number; y: number };
export type Particle = { from: Pt; to: Pt | null; seed: number };

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Ordered dither: true when a pixel at (x, y) should be inked for a tone between 0 (paper) and 1 (solid ink). */
export function inked(x: number, y: number, tone: number) {
  const t = (BAYER4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;
  return tone > t;
}

/** Small deterministic hash in [0, 1), so the art renders the same on every load. */
export function hash01(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Cells of an RGBA bitmap whose alpha is above half, sampled every `step` cells. */
export function rasterPoints(alpha: ArrayLike<number>, width: number, height: number, step = 1): Pt[] {
  const out: Pt[] = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (alpha[(y * width + x) * 4 + 3] > 127) out.push({ x, y });
    }
  }
  return out;
}

/**
 * Pairs every source pixel with a target pixel so one shape can dissolve into another.
 * Both sets are ordered left to right, so pixels travel a short way. When the source is
 * bigger, the spare pixels get no target and fall away as dust; when it is smaller, extra
 * particles start from an existing source pixel.
 */
export function pairParticles(from: readonly Pt[], to: readonly Pt[]): Particle[] {
  const byX = (a: Pt, b: Pt) => a.x - b.x || a.y - b.y;
  const a = [...from].sort(byX);
  const b = [...to].sort(byX);
  if (!a.length) return [];
  const out: Particle[] = [];
  if (a.length >= b.length) {
    // Spread the targets evenly across the source so dust falls from the whole shape, not one end.
    const keep = new Set<number>();
    for (let i = 0; i < b.length; i++) keep.add(Math.floor(((i + 0.5) * a.length) / b.length));
    let j = 0;
    a.forEach((p, i) => out.push({ from: p, to: keep.has(i) ? b[j++] : null, seed: hash01(i) }));
  } else {
    b.forEach((q, i) => out.push({ from: a[Math.floor((i * a.length) / b.length)], to: q, seed: hash01(i) }));
  }
  return out;
}
