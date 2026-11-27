// One robot at a time between the trace board and the dawn strip. The robot standing under the
// trace board walks off to the right as the strip scrolls in; the robot carrying the plank walks
// in from the left only once the first one has gone. Both read the same scroll value: how far the
// dawn strip has risen, 0 as its top edge meets the bottom of the screen and 1 as its bottom edge
// leaves the top. Pure, so the tests can sweep it.

import { clamp01 } from "./math.ts";

/** The strip's rise over which the standing robot walks off. */
export const EXIT_FROM = 0.03;
export const EXIT_TO = 0.22;
/** The carrier is not drawn before this rise, so the two robots are never on screen together. */
export const CARRY_FROM = 0.28;

/** How far the standing robot has walked off, 0 standing, 1 gone past the right edge. */
export const exitProgress = (rise: number) => clamp01((rise - EXIT_FROM) / (EXIT_TO - EXIT_FROM));

/** The strip's rise for a strip whose top edge is at `top` CSS px, on a screen `vh` tall. */
export const riseOf = (top: number, height: number, vh: number) => clamp01((vh - top) / (vh + height));

/** Where the standing robot is in cells: from its post to past the right edge. */
export const standingX = (home: number, w: number, rise: number) => Math.round(home + (w + 10 - home) * exitProgress(rise));

/** Where the carrier is in cells, or null while it is not on the strip yet. */
export function carrierX(w: number, rise: number) {
  if (rise < CARRY_FROM) return null;
  return Math.round(-6 + (w + 12) * clamp01((rise - CARRY_FROM) / (1 - CARRY_FROM)));
}
