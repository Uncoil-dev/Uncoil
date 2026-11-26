// Timing and layout for the sign-in and sign-up pixel scenes. Pure functions only, so the
// canvas and the tests share one story.

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

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

/** Where the three sign-up stops stand, as fractions of the scene width. */
export const STOP_FRACTIONS = [0.3, 0.58, 0.86] as const;

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

/**
 * How tall the hills may grow (0..1) so their crests stay below the heading block.
 * `clearY` is the lowest row the text uses, in scene pixels; null means no text to avoid.
 */
export function reliefUnder(groundY: number, h: number, clearY: number | null, wanted: number) {
  if (clearY === null) return wanted;
  // Ridge crests reach at most 0.34 * h * relief above the ground line.
  const room = groundY - clearY - 4;
  return Math.max(0.15, Math.min(wanted, room / (0.34 * h)));
}

/**
 * Sun radius that keeps the top of the sun below the heading block when they share columns.
 * The sun's centre sits at groundY - 0.2h - 0.6r, so its top edge is groundY - 0.2h - 1.6r.
 */
export function sunRadius(w: number, h: number, groundY: number, clearY: number | null) {
  const r = Math.round(Math.min(w * 0.11, h * 0.2));
  if (clearY === null) return r;
  return Math.max(0, Math.min(r, Math.floor((groundY - h * 0.2 - clearY - 3) / 1.6)));
}
