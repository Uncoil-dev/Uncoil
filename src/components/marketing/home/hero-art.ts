// Hand-placed pixel pieces for the page's ink-coloured scenes (the hero, the trace view's
// landscape and the closing scene). Everything here draws in whole buffer pixels on the page grid:
// one-cell lines, sprites from strings, no sub-pixel motion and no free-floating noise near labels.

import { CREAM, INK, LEGS, RED, ROBOT_TOP, YELLOW, dith, type Px, type Scene } from "./pixels";
import { hash } from "./math";
import { BOARD, board } from "./steps-art";
import { pebbles } from "./soil";

/**
 * Ground with stepping stones, a cut for each gap, and a few pebbles in the soil. `top` returns a
 * colour for a stone's top row (the scan's trail, the robot's lit path) or nothing.
 */
export function groundArt(s: Scene, gaps: readonly (readonly [number, number])[], top?: (x: number) => number | undefined) {
  const { px, cam, groundY } = s;
  for (let x = 0; x < px.w; x++) {
    const wx = x + cam;
    const gap = gaps.find(([a, b]) => wx >= a - 3 && wx < b + 3);
    const wall = gap ? Math.min(wx - gap[0], gap[1] - 1 - wx) : 99;
    for (let y = groundY; y < px.h; y++) {
      const depth = y - groundY;
      // Ragged chasm walls: the cut steps in by one cell every few rows, like a cut in rock.
      const edge = Math.round(hash(Math.floor(depth / 3) + (gap && wx > (gap[0] + gap[1]) / 2 ? 50 : 0), 7) * 3) - 1 + Math.floor(depth / 8);
      if (gap && wall >= edge) {
        px.set(x, y, INK);
        continue;
      }
      const lit = depth === 0 || (gap && wall >= edge - 1);
      px.set(x, y, lit || (depth < 4 && dith(x, y, 0.5 - depth * 0.15)) ? CREAM : INK);
    }
  }
  for (const [x, y] of pebbles(px.w, px.h, groundY, gaps, cam)) px.set(x, y, CREAM);
  // Stones: one per agent step, every 14 world px.
  const first = Math.floor(cam / 14) * 14;
  for (let wx = first; wx < cam + px.w + 14; wx += 14) {
    if (gaps.some(([a, b]) => wx + 12 > a - 3 && wx < b + 3)) continue;
    const x = wx - cam;
    const y = stoneTop(wx, groundY);
    px.rect(x, y, 12, groundY - y, CREAM);
    px.rect(x, groundY, 12, 1, INK);
    px.rect(x + 9, y + 1, 1, 1, INK);
    const c = top?.(wx);
    if (c !== undefined) px.rect(x, y, 12, 1, c);
  }
}

/** Top row of the stone that starts at world x. */
export const stoneTop = (wx: number, groundY: number) => groundY - 3 - Math.round(hash(wx, 4) * 1.4);

/** Rope bridge over a chasm, with planks every 12 cells; `skip` leaves one plank out. */
export function bridgeArt(px: Px, x0: number, x1: number, groundY: number, skip: number, rope: (x: number) => number = () => CREAM, plank: (x: number) => number = () => CREAM) {
  const y = groundY - 3;
  for (let x = x0; x < x1; x++) px.set(x, y - 4 + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 2), rope(x));
  px.rect(x0 - 1, y - 7, 1, 10, CREAM);
  px.rect(x1, y - 7, 1, 10, CREAM);
  for (let i = 0, x = x0; x + 12 <= x1 + 1; i++, x += 12) {
    if (i === skip) continue;
    px.rect(x, y + 1, 11, 3, CREAM);
    px.rect(x, y + 1, 11, 1, plank(x));
    px.rect(x + 3, y + 2, 1, 1, INK);
  }
}

// ── Number boards ────────────────────────────────────────────────────────────────────────────

export type BoardTone = "plain" | "lit" | "failed";
const TONES: Record<BoardTone, { rim: number; fill: number; ink: number }> = {
  plain: { rim: CREAM, fill: INK, ink: CREAM },
  lit: { rim: CREAM, fill: YELLOW, ink: INK },
  failed: { rim: CREAM, fill: RED, ink: CREAM },
};

/** A step's signpost planted on its stone: the board on a short pole. Returns the board box. */
export function stoneSign(px: Px, n: number, stoneX: number, groundY: number, tone: BoardTone) {
  const top = stoneTop(stoneX, groundY);
  const bx = stoneX;
  const by = groundY - 15;
  // An ink halo keeps the board's rim apart from the ridge line behind it. It is as wide as the
  // stone pitch, so a row of signs hides the ridge as one piece instead of leaving dots between them.
  px.rect(bx - 2, by - 1, BOARD.w + 3, BOARD.h + 2, INK);
  px.rect(bx + 5, by + BOARD.h, 1, top - by - BOARD.h, CREAM);
  board(px, n, bx, by, TONES[tone]);
  return { x: bx, y: by, w: BOARD.w, h: BOARD.h };
}

/**
 * Step 06's sign: the bridge's own name board, hung from a gantry on the far post so the robot
 * walks under it. `sway` nudges the board one cell while the plank under it breaks.
 */
export function gantrySign(px: Px, plankX: number, gap1: number, groundY: number, tone: BoardTone, sway = 0) {
  const arm = groundY - 31;
  px.rect(gap1, arm, 1, groundY - 10 - arm, CREAM);
  px.rect(plankX - 1, arm, gap1 - plankX + 2, 1, CREAM);
  px.set(gap1 - 1, arm + 1, CREAM);
  const bx = plankX + sway;
  px.rect(bx - 1, arm + 1, BOARD.w + 2, BOARD.h + 2, INK);
  px.set(bx + 1, arm + 1, CREAM);
  px.set(bx + 9, arm + 1, CREAM);
  board(px, 6, bx, arm + 2, TONES[tone]);
  return { x: bx, y: arm + 2, w: BOARD.w, h: BOARD.h, top: arm };
}

// ── The broken plank ─────────────────────────────────────────────────────────────────────────

// Each half of the plank swings down on its rope end: flat, half-way, hanging.
const HALF = [
  ["RRRRR", "RRRRR", "RRRRR"],
  ["RR...", "RRR..", ".RRR.", "..RRR", "...RR"],
  ["RRR", "RRR", "RRR", "RRR", "RRR"],
] as const;
const MAP = { R: RED, C: CREAM, K: INK, Y: YELLOW } as Record<string, number>;

/**
 * Step 06's plank breaking: a crack opens in the middle while it shakes, then both halves swing
 * down and hang from the rope, and three red crumbs drop out of sight. `fall` runs 0..1.
 */
export function brokenPlank(px: Px, x: number, groundY: number, crack: boolean, fall: number) {
  const y = groundY - 2;
  if (fall <= 0) {
    px.rect(x, y, 11, 3, RED);
    if (crack) {
      px.set(x + 5, y, INK);
      px.set(x + 4, y + 1, INK);
      px.set(x + 5, y + 2, INK);
    }
    return;
  }
  const f = Math.min(2, Math.floor(fall * 4));
  px.sprite(HALF[f], x, y, MAP);
  px.sprite(HALF[f], x + 11 - HALF[f][0].length, y, MAP, true);
  for (let i = 0; i < 3; i++) {
    const drop = Math.floor(fall * 60) - i * 4;
    if (drop > 0) px.set(x + 4 + i, y + 3 + drop, RED);
  }
}

// ── Uncoil's scan ────────────────────────────────────────────────────────────────────────────

/** Corner brackets around a box, `pad` cells out, each arm three cells long. */
export function brackets(px: Px, box: { x: number; y: number; w: number; h: number }, pad: number, color = YELLOW) {
  const l = box.x - pad;
  const r = box.x + box.w - 1 + pad;
  const t = box.y - pad;
  const b = box.y + box.h - 1 + pad;
  for (const [cx, cy, sx, sy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]] as const) {
    for (let k = 0; k < 3; k++) {
      px.set(cx + sx * k, cy, color);
      px.set(cx, cy + sy * k, color);
    }
  }
}

// ── The robot ────────────────────────────────────────────────────────────────────────────────

/**
 * The robot with a one-cell ink outline on its sides and top, so it reads in front of a sign or
 * stone behind it. `alert` adds the "!" bubble over its head, on its left when `bubbleLeft`.
 */
export function robotInFront(px: Px, x: number, groundY: number, frame: number, alert = false, bubbleLeft = false) {
  const bob = frame % 2;
  const top = groundY - ROBOT_TOP.length - 2 - bob;
  const rows = [...ROBOT_TOP, ...LEGS[frame % 4]];
  const at = (i: number, j: number) => j >= 0 && j < rows.length && i >= 0 && i < 10 && rows[j][i] !== ".";
  const legsY = groundY - 2;
  const yOf = (j: number) => (j < ROBOT_TOP.length ? top + j : legsY + j - ROBOT_TOP.length);
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < 10; i++) {
      if (!at(i, j)) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]] as const) if (!at(i + dx, j + dy)) px.set(x - 5 + i + dx, yOf(j) + dy, INK);
    }
  px.sprite(ROBOT_TOP, x - 5, top, MAP);
  px.sprite(LEGS[frame % 4], x - 5, legsY, MAP);
  if (alert) {
    const bx = bubbleLeft ? x - 12 : x + 3;
    px.rect(bx, top - 11, 9, 10, INK);
    px.rect(bx + 1, top - 10, 7, 8, CREAM);
    px.rect(bx + 4, top - 9, 1, 4, INK);
    px.rect(bx + 4, top - 4, 1, 1, INK);
    px.rect(bubbleLeft ? bx + 5 : bx + 2, top - 2, 2, 1, CREAM);
  }
}

/** A one-cell stem from a callout box down to the thing it names; dashed when it is an invitation. */
export function stem(px: Px, x: number, from: number, to: number, color: number, dashed = false) {
  for (let y = from; y < to; y++) if (!dashed || (y - from) % 3 < 2) px.set(x, y, color);
}
