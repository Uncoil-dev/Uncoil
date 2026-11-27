// The "where it broke" figure, drawn on the page grid: six step plates threaded on one rope, each
// with a number board on a short post. Each step has its own hand-drawn icon, so the steps differ
// by more than their numbers. Where everything sits is worked out in where-layout.

import { CREAM, INK, RED, YELLOW, type Px } from "../pixel-world/pixels";
import { board } from "./steps-art";
import { PLATE, boardBox, ropeCells, type WhereLayout } from "./where-layout";

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
  // refund.issue: a coin
  coin: ["..###..", ".#...#.", "#..#..#", "#..#..#", "#..#..#", ".#...#.", "..###.."],
} as const;
export type IconName = keyof typeof ICONS;

/** The loose end of the rope, hanging off step 06 (offsets from the plate's far edge). */
const TAIL = [[1, 0], [2, 0], [3, 1], [3, 2], [3, 3], [4, 4], [4, 5], [4, 6], [3, 7], [3, 8], [2, 9]] as const;

export type WhereState = {
  /** Seconds since the figure came into view: the rope draws in, then the plates land. */
  t: number;
  /** 0 at step 06, 1 at step 04: how far Uncoil's scan has read back. */
  scan: number;
};

/** When each part of the figure appears, in seconds after it comes into view. */
export const ENTER = { rope: 1.4, plate: (i: number) => 0.25 + i * 0.18, tail: 1.6 } as const;

export function drawWhere(px: Px, l: WhereLayout, icons: readonly IconName[], { t, scan }: WhereState) {
  px.clear(CREAM);
  const { cells, snap } = ropeCells(l);
  const c4 = l.centers[3];
  const c6 = l.centers[5];
  const along = (x: number, y: number) => (l.vertical ? y : x);
  const scanAt = Math.round(along(c6.x, c6.y) + (along(c4.x, c4.y) - along(c6.x, c6.y)) * scan);
  const scanning = scan > 0.02;
  const found = scan >= 0.92;

  // The rope, drawing in from step 01; the read-back part glows yellow on an ink shadow.
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
    } else px.set(x, y, red ? RED : INK);
  });
  // Frayed ends either side of the snap.
  if (shown > snap) {
    const [ax, ay] = cells[snap - 1];
    px.set(l.vertical ? ax - 1 : ax + 1, l.vertical ? ay + 1 : ay - 1, scanning && along(ax, ay) >= scanAt ? YELLOW : INK);
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
    const cause = i === 3 && found;
    px.rect(x, y, PLATE, PLATE, INK);
    px.rect(x + 1, y + 1, PLATE - 2, PLATE - 2, failed ? RED : cause ? YELLOW : CREAM);
    px.sprite(ICONS[icons[i]], x + 2, y + 2, { "#": INK });
    if (failed) {
      // A crack runs down the failed plate, through its rim.
      for (const [dx, dy] of [[6, 0], [6, 1], [5, 2], [5, 3]] as const) px.set(x + dx, y + dy, CREAM);
    }
    // The post and the number board.
    const b = boardBox(l, i);
    if (l.vertical) px.rect(x + PLATE, c.y, b.x - x - PLATE, 1, INK);
    else if (i % 2 === 0) px.rect(c.x, b.y + b.h, 1, y - b.y - b.h, INK);
    else px.rect(c.x, y + PLATE, 1, b.y - y - PLATE, INK);
    board(px, i + 1, b.x, b.y, failed ? { rim: INK, fill: RED, ink: CREAM } : cause ? { rim: INK, fill: YELLOW, ink: INK } : { rim: INK, fill: INK, ink: CREAM });
  });

  if (t >= ENTER.tail) {
    const ox = l.vertical ? c6.x : c6.x + (PLATE >> 1);
    const oy = l.vertical ? c6.y + (PLATE >> 1) : c6.y;
    for (const [a, b] of TAIL) px.set(l.vertical ? ox + b : ox + a, l.vertical ? oy + a : oy + b, RED);
  }

  // Uncoil's scan: yellow brackets on an ink shadow, closing in on step 04 when it gets there.
  if (scanning) {
    const half = PLATE >> 1;
    const pos = { x: Math.round(c6.x + (c4.x - c6.x) * scan) - half, y: Math.round(c6.y + (c4.y - c6.y) * scan) - half, w: PLATE, h: PLATE };
    const pad = found ? 2 : 3;
    for (const [color, d] of [[INK, 1], [YELLOW, 0]] as const) {
      const l0 = pos.x - pad + d;
      const r0 = pos.x + PLATE - 1 + pad + d;
      const t0 = pos.y - pad + d;
      const b0 = pos.y + PLATE - 1 + pad + d;
      for (const [cx, cy, sx, sy] of [[l0, t0, 1, 1], [r0, t0, -1, 1], [l0, b0, 1, -1], [r0, b0, -1, -1]] as const)
        for (let k = 0; k < 3; k++) {
          px.set(cx + sx * k, cy, color);
          px.set(cx, cy + sy * k, color);
        }
    }
  }
}
