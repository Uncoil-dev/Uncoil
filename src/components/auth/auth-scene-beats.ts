// Timing for the sign-in and sign-up pixel scenes. Pure functions only, so the canvas and the
// tests share one story.

import { clamp01, ease } from "@/components/marketing/home/math";

/** Where the three sign-up stops stand, as fractions of the scene width. */
export const STOP_FRACTIONS = [0.3, 0.58, 0.86] as const;

/** The path's stones sit every 14 cells, as on the homepage. */
export const STONE_PITCH = 14;

/**
 * Left edge of the stone nearest each stop, so a stop's sign stands on a real stone. The sign's
 * board is 11 cells wide, so its middle is 5 cells in from that edge.
 */
export function stopStones(width: number) {
  return STOP_FRACTIONS.map((f) => Math.round((width * f - 5) / STONE_PITCH) * STONE_PITCH);
}

export const SIGN_UP_INTRO = 2.4;
export const STOP_HOLD = 2.6;

/**
 * Sign-up: the robot walks in to the start of the path, then the stops light up one after
 * another to show what happens after the form. `active` is null while walking and when still.
 */
export function signUpBeat(seconds: number, still: boolean) {
  if (still) return { walk: 1, active: null, walking: false } as const;
  if (seconds < SIGN_UP_INTRO) return { walk: ease(seconds / SIGN_UP_INTRO), active: null, walking: true } as const;
  const active = Math.floor((seconds - SIGN_UP_INTRO) / STOP_HOLD) % STOP_FRACTIONS.length;
  return { walk: 1, active, walking: false } as const;
}

export const SIGN_IN_DELAY = 0.3;
export const SIGN_IN_CROSS = 2.4;

/** Sign-in: the robot finishes crossing the repaired bridge, then the flag goes up. Plays once. */
export function signInBeat(seconds: number, still: boolean) {
  if (still) return { cross: 1, flag: 1, walking: false };
  const cross = ease((seconds - SIGN_IN_DELAY) / SIGN_IN_CROSS);
  const flag = clamp01((seconds - SIGN_IN_DELAY - SIGN_IN_CROSS) / 0.8);
  return { cross, flag, walking: cross > 0 && cross < 1 };
}
