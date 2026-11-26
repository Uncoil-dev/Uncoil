// Where everything sits on the menu map. Pure functions in CSS pixels, so the canvas, the stop
// buttons and the tests all read the same geometry.

export type Pt = { x: number; y: number };
export type Side = "left" | "right";
export type Box = { x: number; y: number; w: number; h: number };
export type MapLayout = {
  w: number;
  h: number;
  /** Index 0 is the trailhead, 1-5 are the five stops. */
  points: Pt[];
  sides: Side[];
  /** Sign boxes for stops 1-5 (index 0 of this array is stop 1). */
  signs: Box[];
  path: { pts: Pt[]; len: number[] };
  /** Arc length along the path at each point. */
  at: number[];
};

export const SIGN_H = 48;
const EDGE = 8;

/** Lays out the trailhead and five stops as switchbacks climbing a `w` x `h` map. */
export function mapLayout(w: number, h: number): MapLayout {
  // Narrow phones pull the stops toward the middle so every sign keeps room for its name.
  const inset = w < 360 ? 0.45 : 0.42;
  const GAP = w < 360 ? 12 : 16;
  const top = Math.max(SIGN_H + 30, h * 0.17);
  const base = h - 26;
  const step = (base - top) / 5;
  const points: Pt[] = [{ x: w * 0.5, y: base }];
  const sides: Side[] = ["left"];
  for (let k = 1; k <= 5; k++) {
    const side: Side = k % 2 ? "left" : "right";
    sides.push(side);
    points.push({ x: side === "left" ? w * inset : w * (1 - inset), y: base - step * k });
  }
  const signs = points.slice(1).map((p, i) => {
    const y = p.y - 18 - SIGN_H;
    return sides[i + 1] === "left" ? { x: EDGE, y, w: p.x - GAP - EDGE, h: SIGN_H } : { x: p.x + GAP, y, w: w - EDGE - p.x - GAP, h: SIGN_H };
  });

  // Each leg leaves a stop along the ground, swings out past the next stop, climbs and comes
  // back in to it, so the trail runs under the signs instead of through them.
  const pts: Pt[] = [points[0]];
  const at = [0];
  const len = [0];
  for (let k = 0; k < 5; k++) {
    const a = points[k];
    const b = points[k + 1];
    const out = sides[k + 1] === "left" ? w * 0.1 : w * 0.9;
    const c1 = { x: out, y: a.y };
    const c2 = { x: out, y: b.y };
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      const p = {
        x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
        y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
      };
      const prev = pts[pts.length - 1];
      len.push(len[len.length - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
      pts.push(p);
    }
    at.push(len[len.length - 1]);
  }
  return { w, h, points, sides, signs, path: { pts, len }, at };
}

/** The point `s` pixels along the path, and which way the walker faces there. */
export function pointAt({ pts, len }: MapLayout["path"], s: number): Pt & { dir: 1 | -1 } {
  const total = len[len.length - 1];
  const d = Math.min(Math.max(s, 0), total);
  let i = 1;
  while (i < len.length - 1 && len[i] < d) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const f = len[i] === len[i - 1] ? 0 : (d - len[i - 1]) / (len[i] - len[i - 1]);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dir: b.x >= a.x ? 1 : -1 };
}

/** How long the robot takes to walk `dist` pixels: brisk, and never more than 1.2 seconds. */
export function walkTime(dist: number) {
  if (dist <= 0) return 0;
  return Math.min(1.2, Math.max(0.35, dist / 520));
}

export const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
