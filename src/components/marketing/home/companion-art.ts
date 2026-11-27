// The robot that walks down the page beside the reader, kept pure so the tests can check it: its
// sprite, where its rail sits in the page margin, and where on the rail it stands for a scroll
// position. It is drawn on the page grid, five cells wide, in whichever of ink and cream the page
// under it is not, so it needs no outline and no panel behind it.

/** What the robot is doing in a chapter: alarmed at the break, searching in the trace, carrying the repair, then just walking. */
export type Mood = "alert" | "search" | "carry" | "walk";

/**
 * Body rows, 5 wide, after the hero's robot: antenna, a head with a dark face and two yellow eyes,
 * a body and two legs. B is body, F the face (the page's own colour), Y yellow.
 */
const ANTENNA = ["..Y..", "..B.."];
const HEAD = ["BBBBB", "BYFYB", "BBBBB"];
const BODY = ".BBB.";
const LEGS = [".B.B.", "B...B"];
const LOOK = ["BYFFB", "BFFYB"];
// The "!" is yellow and one row clear of the antenna, so it never reads as part of the track.
const ALERT = ["..Y..", "..Y..", ".....", "..Y..", "....."];
// Arms up, holding the yellow plank over its head.
const CARRY = ["YYYYY", "B...B", "B...B"];

export const ROBOT_W = 5;

/**
 * The robot's rows for a mood and a walk frame, top row first. Extra rows (the "!" or the plank)
 * sit above the head, so the feet always stand on the same row.
 */
export function robotRows(mood: Mood, frame: number, blink = 0): string[] {
  const head = [...HEAD];
  if (mood === "search") head[1] = LOOK[blink % 2];
  const top = mood === "alert" ? [...ALERT, ...ANTENNA] : mood === "carry" ? CARRY : ANTENNA;
  return [...top, ...head, BODY, LEGS[frame % 2]];
}

/** Rows below the robot's top that are the robot itself (not the "!" or the plank above it). */
export const robotHeight = (mood: Mood) => robotRows(mood, 0).length;

/** The page's text column ends this far from the right edge (sections: 1280px wide, 40px padding). */
export function rightGutter(vw: number) {
  return vw < 768 ? 20 : Math.max(40, vw / 2 - 640);
}

/**
 * Where the rail stands, in CSS px from the left of the screen: centred in the right margin from
 * tablets up, and on phones in the left margin, nudged off the edge so it peeks in and keeps at
 * least 4px from the text.
 */
export function railLeft(vw: number, cell: number, dpr = 1) {
  const w = ROBOT_W * cell;
  // Whole device pixels, so every cell of the robot covers the same number of screen pixels.
  const snap = (x: number) => Math.round(x * dpr) / dpr;
  if (vw < 768) return snap(Math.min(-cell, rightGutter(vw) - 4 - w));
  return snap(vw - rightGutter(vw) / 2 - w / 2);
}

/**
 * Reading progress through the chapters: the index of the chapter whose top has passed the
 * reading line, plus how far it is to the next one. -1 before the first; chapters.length - 1 at the last.
 */
export function progressAt(tops: readonly number[], line: number) {
  let i = -1;
  tops.forEach((top, k) => {
    if (top <= line) i = k;
  });
  if (i < 0) return -1;
  if (i >= tops.length - 1) return tops.length - 1;
  const span = tops[i + 1] - tops[i];
  return i + (span > 0 ? Math.min(1, (line - tops[i]) / span) : 0);
}

/** The rail's stops in cells from its top, evenly spaced, and the robot's feet row for a progress. */
export function railStops(rows: number, count: number) {
  return Array.from({ length: count }, (_, i) => Math.round((i * (rows - 1)) / Math.max(1, count - 1)));
}

export function feetRow(stops: readonly number[], progress: number, snap: boolean) {
  const p = Math.max(0, Math.min(stops.length - 1, snap ? Math.floor(progress) : progress));
  const i = Math.floor(p);
  const f = p - i;
  return Math.round(i >= stops.length - 1 ? stops[stops.length - 1] : stops[i] + (stops[i + 1] - stops[i]) * f);
}
