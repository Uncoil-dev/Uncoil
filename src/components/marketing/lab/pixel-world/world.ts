// Timing and layout for the pixel world: where the robot is, which stop is active and what the
// run looks like at any moment. Pure functions only, so the canvas and the tests share one story.

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Linear interpolation through sorted [at, value] keyframes, held flat outside the range. */
export function keyframe(frames: readonly (readonly [number, number])[], at: number) {
  if (at <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [a1, v1] = frames[i];
    if (at <= a1) {
      const [a0, v0] = frames[i - 1];
      return a1 === a0 ? v1 : v0 + ((v1 - v0) * (at - a0)) / (a1 - a0);
    }
  }
  return frames[frames.length - 1][1];
}

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

// ── Hero loop ────────────────────────────────────────────────────────────────────────────────

export type HeroPhase = "walk" | "break" | "scan" | "rebuild" | "cross" | "goal";

const HERO_SEGMENTS: readonly (readonly [HeroPhase, number])[] = [
  ["walk", 3.2],
  ["break", 1.6],
  ["scan", 2],
  ["rebuild", 1.5],
  ["cross", 2.4],
  ["goal", 1.6],
];

export const HERO_LOOP = HERO_SEGMENTS.reduce((sum, [, d]) => sum + d, 0);

/** Phase of the hero loop at `seconds`, plus 0..1 progress through that phase. */
export function heroState(seconds: number): { phase: HeroPhase; local: number } {
  let t = ((seconds % HERO_LOOP) + HERO_LOOP) % HERO_LOOP;
  for (const [phase, d] of HERO_SEGMENTS) {
    if (t < d) return { phase, local: t / d };
    t -= d;
  }
  return { phase: "goal", local: 1 };
}

/** Robot position on the hero track: 0 is the start, `edge` the bridge, 1 the flag. */
export function heroTrack({ phase, local }: { phase: HeroPhase; local: number }, edge: number) {
  if (phase === "walk") return edge * local;
  if (phase === "cross") return edge + (1 - edge) * ease(local);
  if (phase === "goal") return 1;
  return edge;
}

// ── Scroll journey ───────────────────────────────────────────────────────────────────────────

export const WORLD_W = 2000;
export const GAP = { x0: 1176, x1: 1212 } as const;
export const BROKEN = { x: 1188, w: 12 } as const;

export const STOP_X = [330, 790, GAP.x0, 1600] as const;

// Scroll progress → robot x. Flat runs are where the robot pauses and the scene plays out.
const ROBOT_FRAMES = [
  [0, 40],
  [0.07, 290],
  [0.16, 360],
  [0.23, 740],
  [0.33, 830],
  [0.4, GAP.x0 - 10],
  [0.62, GAP.x0 - 10],
  [0.7, 1300],
  [0.78, 1560],
  [0.88, 1640],
  [1, 1890],
] as const;

export const robotAt = (p: number) => keyframe(ROBOT_FRAMES, clamp01(p));

/** Which of the four stops (0-3) the dialog box should show at scroll progress `p`. */
export function stopAt(p: number) {
  if (p < 0.2) return 0;
  if (p < 0.38) return 1;
  if (p < 0.54) return 2;
  return 3;
}

/** Scene beats along the journey, each 0..1. */
export function beats(p: number) {
  return {
    prompt: clamp01((p - 0.05) / 0.1),
    drop: clamp01((p - 0.2) / 0.04),
    tower: clamp01((p - 0.24) / 0.1),
    collapse: clamp01((p - 0.39) / 0.04),
    scan: clamp01((p - 0.43) / 0.1),
    rebuild: clamp01((p - 0.54) / 0.08),
    savings: clamp01((p - 0.78) / 0.1),
    flag: clamp01((p - 0.94) / 0.06),
  };
}

export const RUN_SPANS = [
  { kind: "AGENT", name: "support-agent", meta: "run started" },
  { kind: "LLM", name: "chat", meta: "412 tok · 820 ms" },
  { kind: "TOOL", name: "order.lookup", meta: "140 ms" },
  { kind: "TOOL", name: "docs.search", meta: "0 results" },
  { kind: "LLM", name: "chat · retry", meta: "$0.0187" },
  { kind: "TOOL", name: "refund.issue", meta: "502 · 5000 ms" },
] as const;

export type RunStatus = "idle" | "recording" | "failed" | "fixed";

/** What the in-game HUD shows for the example run at scroll progress `p`. */
export function hud(p: number) {
  const b = beats(p);
  const spans = b.drop < 1 ? 0 : Math.max(1, Math.ceil(b.tower * RUN_SPANS.length));
  const status: RunStatus = b.rebuild >= 1 ? "fixed" : b.collapse > 0 ? "failed" : spans > 0 ? "recording" : "idle";
  const cost = b.savings > 0 ? 0.0187 - (0.0187 - 0.0061) * ease(b.savings) : spans >= 5 ? 0.0187 : spans * 0.0031;
  return { spans, status, cost };
}
