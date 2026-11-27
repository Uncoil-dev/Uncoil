// The hero scene's clock, kept pure so it can be tested. The loop teaches the page's point: the
// run fails at step 06, Uncoil walks back along the run to step 04 and marks it as the cause,
// step 04 is repaired, and only then does the robot cross step 06. When a visitor asks to break
// the step, the scene hurries ahead on its own timeline to the next failure instead of jumping.

export type HeroPhase = "walk" | "fail" | "trace" | "mark" | "repair" | "cross" | "goal";

const SEGMENTS: readonly (readonly [HeroPhase, number])[] = [
  ["walk", 3.2],
  ["fail", 1.6],
  ["trace", 1.6],
  ["mark", 1.1],
  ["repair", 1.3],
  ["cross", 2.4],
  ["goal", 1.8],
];

export const HERO_LOOP = SEGMENTS.reduce((sum, [, d]) => sum + d, 0);

/** Phase of the loop at `seconds`, plus 0..1 progress through that phase. */
export function heroState(seconds: number): { phase: HeroPhase; local: number } {
  let t = ((seconds % HERO_LOOP) + HERO_LOOP) % HERO_LOOP;
  for (const [phase, d] of SEGMENTS) {
    if (t < d) return { phase, local: t / d };
    t -= d;
  }
  return { phase: "goal", local: 1 };
}

function phaseStart(phase: HeroPhase) {
  let t = 0;
  for (const [p, d] of SEGMENTS) {
    if (p === phase) return t;
    t += d;
  }
  return 0;
}

export const BREAK_AT = phaseStart("fail");
export const FIXED_AT = phaseStart("cross");
/** How much faster the scene runs while it hurries to the step the visitor asked to break. */
export const HURRY = 5;

/** Which step the scene is pointing at: 06 where the run failed, 04 once Uncoil has found the cause. */
export function focusStep(phase: HeroPhase): 4 | 6 {
  return phase === "mark" || phase === "repair" ? 4 : 6;
}

/** Where Uncoil's scan sits between step 06 (0) and step 04 (1) while it walks the run back. */
export function scanAt({ phase, local }: { phase: HeroPhase; local: number }) {
  if (phase === "fail" || phase === "walk") return 0;
  if (phase === "trace") return local < 0.15 ? 0 : 1 - Math.pow(1 - (local - 0.15) / 0.85, 3);
  return 1;
}

/**
 * When to break next, on the scene's own clock: now-ish if the robot is still walking up to the
 * step, or on the next lap if the run is already fixed. Returns -1 while a break is playing.
 */
export function breakTarget(now: number) {
  const t = ((now % HERO_LOOP) + HERO_LOOP) % HERO_LOOP;
  if (t < BREAK_AT) return now + (BREAK_AT - t);
  if (t >= FIXED_AT) return now + (HERO_LOOP - t) + BREAK_AT;
  return -1;
}
