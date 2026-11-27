// The pieces of step 06's plank after it snaps, as sprite rows ("R" is red, "." is clear). Pure,
// so the tests can check that the broken plank reads as a plank at an angle, not as two posts.

/** The left half, still nailed at its left end: cracked flat, sagging, then hanging. */
export const PLANK_LEFT = [
  ["RRRRR", "RRRRR", "RRRR."],
  ["RRR....", ".RRRR..", "..RR.R."],
  ["RR....", "RRR...", ".RRR..", "..RRR.", "...R.R"],
] as const;

/** What is left on the far nail once the right half has torn off: a stub with a slanted tear. */
export const PLANK_STUB = ["RRR", ".RR", "..R"] as const;

/** Filled cells of a sprite as [x, y]. */
export function spriteCells(rows: readonly string[]) {
  return rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === "." ? [] : [[x, y] as const])));
}
