// The "where it broke" figure, drawn on the page grid: six step plates threaded on one rope, each
// with a number board on a short post. Each step has its own hand-drawn icon, so the steps differ
// by more than their numbers. Where everything sits is worked out in where-layout.

import { CREAM, INK, RED, YELLOW, type Px } from "./pixels";
import { board } from "./steps-art";
import { robotInFront } from "./hero-art";
import { clamp01, ease } from "./math";
import { PLATE, boardBox, ropeCells, scanReach, scanStop, tailCells, type WhereLayout } from "./where-layout";
import type { StepIcon } from "./cases";

/** 7x7 icons, one per step kind, drawn in ink on the plate. */
export const ICONS = {
  // support-agent: the robot's head
  agent: ["...#...", "#######", "#.....#", "#.#.#.#", "#.....#", "#######", ".#...#."],
  // llm.chat: a speech bubble
  chat: ["#######", "#.....#", "#.#.#.#", "#.....#", "#######", ".##....", ".#....."],
  // order.lookup: a parcel
  parcel: [".#####.", "#..#..#", "#######", "#.....#", "#.###.#", "#.....#", "#######"],
  // docs.search: a lens with nothing in it
  search: [".###...", "#...#..", "#...#..", "#...#..", ".####..", "....##.", ".....##"],
  // llm.chat retry: going round again
  retry: [".###.#.", "#...##.", "#..###.", "#......", "#.....#", ".#...#.", "..###.."],
  // refund.issue, payments.charge: a coin
  coin: ["..###..", ".#...#.", "#..#..#", "#..#..#", "#..#..#", ".#...#.", "..###.."],
  // report.save: a page with lines
  page: ["#####..", "#...##.", "#.#..##", "#.....#", "#.###.#", "#.....#", "#######"],
  // calendar.lookup: a calendar sheet
  calendar: [".#...#.", "#######", "#.....#", "#.#.#.#", "#.....#", "#.#.#.#", "#######"],
  // booking.hold: a map pin
  pin: [".#####.", "##...##", "#..#..#", "##...##", ".##.##.", "..###..", "...#..."],
  // orders.cancel: a crossed box
  cross: ["#######", "##...##", "#.#.#.#", "#..#..#", "#.#.#.#", "##...##", "#######"],
  // orders.update_address: a house
  house: ["...#...", "..###..", ".##.##.", "##...##", ".#...#.", ".#.#.#.", ".#####."],
} as const satisfies Record<StepIcon, readonly string[]>;
export type IconName = StepIcon;

/** The figure's two grounds: ink lines on cream by day, cream lines on ink at night. */
export type WherePalette = { bg: number; line: number };
export const DAY_INK: WherePalette = { bg: CREAM, line: INK };
export const NIGHT_INK: WherePalette = { bg: INK, line: CREAM };

export type WhereState = {
  /** Seconds since the figure came into view: the rope draws in, then the plates land. */
  t: number;
  /** 0 at step 06, 1 when the frame has reached the cause: how far Uncoil's scan has read back. */
  scan: number;
  /** The step (1-6) that caused the failure. */
  cause: number;
  /** Seconds since the scan locked on the cause, or -1 while it has not: the robot lands on the cause plate then. */
  since?: number;
};

/** Seconds the robot takes to land on the cause plate. */
export const LAND = 0.5;

/** When each part of the figure appears, in seconds after it comes into view. */
export const ENTER = { rope: 1.4, plate: (i: number) => 0.25 + i * 0.18, tail: 1.6 } as const;

export function drawWhere(px: Px, l: WhereLayout, icons: readonly IconName[], { t, scan, cause, since = -1 }: WhereState, pal: WherePalette = DAY_INK) {
  const { bg, line } = pal;
  px.clear(bg);
  const { cells, snap } = ropeCells(l);
  const reach = l.centers[cause >= 6 ? 3 : cause - 1];
  const c6 = l.centers[5];
  const along = (x: number, y: number) => (l.vertical ? y : x);
  const scanAt = Math.round(along(c6.x, c6.y) + (along(reach.x, reach.y) - along(c6.x, c6.y)) * scanReach(scan, cause));
  const scanning = scan > 0.02;
  const stop = scanStop(scan, cause);
  const found = scan >= 0.92;

  // The rope, drawing in from step 01; the read-back part glows yellow on a shadow.
  const shown = Math.floor(cells.length * Math.min(1, t / ENTER.rope));
  cells.forEach(([x, y], i) => {
    if (i >= shown) return;
    const broken = i >= snap && i < snap + 3;
    if (broken) return;
    const red = i >= snap + 3;
    const lit = scanning && along(x, y) >= scanAt;
    if (lit) {
      px.set(x, y, YELLOW);
      px.set(l.vertical ? x + 1 : x, l.vertical ? y : y + 1, INK);
    } else px.set(x, y, red ? RED : line);
  });
  // Frayed ends either side of the snap.
  if (shown > snap) {
    const [ax, ay] = cells[snap - 1];
    px.set(l.vertical ? ax - 1 : ax + 1, l.vertical ? ay + 1 : ay - 1, scanning && along(ax, ay) >= scanAt ? YELLOW : line);
    if (shown > snap + 3) {
      const [bx, by] = cells[snap + 3];
      px.set(l.vertical ? bx + 1 : bx - 1, l.vertical ? by - 1 : by + 1, RED);
    }
  }

  l.centers.forEach((c, i) => {
    if (t < ENTER.plate(i)) return;
    const land = t < ENTER.plate(i) + 0.1 ? -1 : 0;
    const x = c.x - (PLATE >> 1);
    const y = c.y - (PLATE >> 1) + land;
    const failed = i === 5;
    const lit = i === cause - 1 && found;
    // The failed step stays red; when it is its own cause, its rim turns yellow once found.
    px.rect(x, y, PLATE, PLATE, failed && lit ? YELLOW : line);
    px.rect(x + 1, y + 1, PLATE - 2, PLATE - 2, failed ? RED : lit ? YELLOW : bg);
    px.sprite(ICONS[icons[i]], x + 2, y + 2, { "#": failed || lit ? INK : line });
    if (failed) {
      // A crack runs down the failed plate, through its rim.
      for (const [dx, dy] of [[6, 0], [6, 1], [5, 2], [5, 3]] as const) px.set(x + dx, y + dy, CREAM);
    }
    // The post and the number board.
    const b = boardBox(l, i);
    if (l.vertical) px.rect(x + PLATE, c.y, b.x - x - PLATE, 1, line);
    else if (l.above[i]) px.rect(c.x, b.y + b.h, 1, y - b.y - b.h, line);
    else px.rect(c.x, y + PLATE, 1, b.y - y - PLATE, line);
    board(px, i + 1, b.x, b.y, failed ? { rim: line, fill: RED, ink: CREAM } : lit ? { rim: line, fill: YELLOW, ink: INK } : { rim: line, fill: INK, ink: CREAM });
  });

  if (t >= ENTER.tail) {
    for (const [x, y] of tailCells(l)) px.set(x, y, RED);
  }

  // Uncoil's scan: a corner frame, tightening on the cause once it is found.
  if (scanning) {
    // The frame always sits squarely on a step: it reads back from 06 one step at a time and
    // locks on the cause. It wraps the plate and its number board together, so its corners
    // never land on either.
    const c = l.centers[stop];
    const half = PLATE >> 1;
    const b = boardBox(l, stop);
    const x0 = Math.min(c.x - half, b.x);
    const y0 = Math.min(c.y - half, b.y);
    const x1 = Math.max(c.x + half, b.x + b.w - 1);
    const y1 = Math.max(c.y + half, b.y + b.h - 1);
    // Two cells thick: a line in the ground's contrast colour with a yellow line inside it.
    const out = found ? 2 : 3;
    for (const [color, pad] of [[line === INK ? INK : bg, out], [YELLOW, out - 1]] as const) {
      const l0 = x0 - pad;
      const r0 = x1 + pad;
      const t0 = y0 - pad;
      const b0 = y1 + pad;
      const arm = 3 + pad;
      for (const [cx, cy, sx, sy] of [[l0, t0, 1, 1], [r0, t0, -1, 1], [l0, b0, 1, -1], [r0, b0, -1, -1]] as const)
        for (let k = 0; k < arm; k++) {
          px.set(cx + sx * k, cy, color);
          px.set(cx, cy + sy * k, color);
        }
    }
  }
  // The robot lands on the cause plate once the scan has locked on it, standing on the frame's
  // top edge. The cause's number board hangs below its plate, so nothing above it is covered.
  if (since >= 0 && l.above[cause - 1] === false) {
    const c = l.centers[cause - 1];
    const top = c.y - (PLATE >> 1);
    const drop = Math.round((1 - ease(clamp01(since / LAND))) * 9);
    robotInFront(px, c.x, top - 1 - drop, 0, false, false);
  }
}
