// The hero scene's clock, kept pure so it can be tested: when a visitor asks to break the step,
// the scene hurries ahead on its own timeline to the next break instead of jumping there.

import { HERO_LOOP, heroState, type HeroPhase } from "../pixel-world/world.ts";

/** Loop time where a phase first starts, read from the shared hero timeline. */
function phaseStart(phase: HeroPhase) {
  for (let t = 0; t < HERO_LOOP; t += 0.01) if (heroState(t).phase === phase) return t;
  return 0;
}
export const BREAK_AT = phaseStart("break");
export const FIXED_AT = phaseStart("cross");
/** How much faster the scene runs while it hurries to the step the visitor asked to break. */
export const HURRY = 5;

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

