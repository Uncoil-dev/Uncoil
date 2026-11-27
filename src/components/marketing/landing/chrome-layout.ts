// Grid geometry for the navbar menus and the footer. Every length here is whole cells of the
// page's pixel grid (see ../home/grid.ts), so bars, boards and the robot all land on the same grid.

/** A number board in the scene is 11 cells wide; boards need one free cell between them. */
export const BOARD_PITCH = 12;

/** A number board is 9 cells tall. */
export const BOARD_H = 9;

/** Whole cells per page so `pages` pages fit in `cells` cells, never below `min`. */
export const lanePitch = (cells: number, pages: number, min = 2) => Math.max(min, Math.floor(cells / Math.max(1, pages)));

/**
 * The bar for page `j` in a menu's waterfall: each page starts where the one before it ended,
 * one pitch per page, with one cell of ink between neighbours.
 */
export function waterfallBar(laneCells: number, pages: number, j: number) {
  const pitch = lanePitch(laneCells, pages);
  return { start: j * pitch, width: pitch - 1, pitch };
}

/**
 * Where the footer's ruler starts and how far apart its boards are, in cells. When the link
 * columns sit in one row (`cols` gives their left edges in cells), each board hangs over its
 * column, and wide pitches draw the boards and robot at twice the size on the same grid.
 * Otherwise the boards are spread evenly across the band, and are left out when they would not
 * fit side by side.
 */
export function footerRuler(cells: number, count: number, cols: readonly number[] = []) {
  const pad = 1;
  if (cols.length === count && count > 1) {
    const pitch = Math.round((cols[count - 1] - cols[0]) / (count - 1));
    if (pitch >= BOARD_PITCH && cols[0] >= 0 && cols[count - 1] + BOARD_PITCH <= cells) return { ox: cols[0], pitch, boards: true, scale: pitch >= 2 * BOARD_PITCH ? 2 : 1 };
  }
  const pitch = lanePitch(cells - 2 * pad, count);
  return { ox: pad, pitch, boards: pitch >= BOARD_PITCH, scale: 1 };
}

/** Rows below the ruler for a scene drawn at `scale`: a stem, the boards and a margin. */
export const rowsBelow = (scale = 1) => 3 + BOARD_H * scale;

/** Where in a page the robot stands, in cells from the page's start: over its board, else the middle. */
export const standOffset = (pitch: number, scale = 1) => (pitch >= BOARD_PITCH * scale ? Math.round(5.5 * scale) : Math.round(pitch / 2));

/** The robot's x (its centre cell) when it rests on page `page` of a ruler starting at `ox`. */
export const restX = (ox: number, pitch: number, page: number, scale = 1) => ox + Math.round(page * pitch + standOffset(pitch, scale));

export type SunSide = 1 | -1;
export type SunPlace = { cx: number; r: number; side: SunSide };

/**
 * The sun, setting at one end of the scene. The robot is 12 cells wide with its outline, and the
 * sun keeps at least 3 empty cells from it, so the sun sits at whichever end the robot is not
 * resting near. A sun already on a valid side stays there; it only crosses over when the robot's
 * resting spot would come within 3 cells. Wide enough scenes always have one valid side, and
 * the sun shrinks to make that true.
 */
export function placeSun(w: number, ruler: number, rest: number, scale = 1, side: SunSide = 1): SunPlace | null {
  const big = Math.max(8, Math.min(ruler - 8, 14 * scale - (scale > 1 ? 4 : 0)));
  const r = Math.min(big, Math.floor((w - 2 - 12 * scale) / 4));
  if (r < 4) return null;
  const okRight = rest <= w - 2 * r - 1 - 6 * scale;
  const okLeft = rest >= 2 * r + 2 + 6 * scale;
  const at: SunSide = side === 1 ? (okRight ? 1 : -1) : okLeft ? -1 : 1;
  return { cx: at === 1 ? w - r + 2 : r - 2, r, side: at };
}

export type Box = { x0: number; x1: number; y0: number; y1: number };

/**
 * Stars at fixed positions: a low-discrepancy sequence spreads them evenly over the sky at any
 * height, a few per hundred cells, so the sky reads composed whether the card is short or tall.
 * Those inside `avoid` (the sun and the robot) are left out; the rest do not move.
 */
export function skyStars(w: number, ruler: number, avoid: readonly Box[] = []) {
  const top = 2;
  const bottom = ruler - 3;
  const innerW = w - 4;
  if (bottom <= top || innerW < 8) return [] as { x: number; y: number; pale: boolean }[];
  const n = Math.max(5, Math.round((innerW * (bottom - top)) / 110));
  const out: { x: number; y: number; pale: boolean }[] = [];
  for (let i = 1; i <= n; i++) {
    const x = 2 + Math.floor(((0.5 + 0.7548776662466927 * i) % 1) * innerW);
    const y = top + Math.floor(((0.5 + 0.5698402909980532 * i) % 1) * (bottom - top));
    if (avoid.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1)) continue;
    out.push({ x, y, pale: i % 4 === 1 });
  }
  return out;
}

/**
 * Carries the sun between its two sides. It slides in whole cells over a short time when the
 * robot's resting spot makes it change sides, and jumps at once when `still` (reduced motion, the
 * first frame, a resize).
 */
export class SunTrack {
  side: SunSide = 1;
  moving = false;
  private from = 0;
  private to = 0;
  private t0 = 0;
  private w = 0;
  private r = 0;
  update(now: number, w: number, ruler: number, rest: number, scale: number, still: boolean) {
    const p = placeSun(w, ruler, rest, scale, this.side);
    if (!p) {
      this.moving = false;
      return null;
    }
    this.side = p.side;
    if (this.w !== w || this.r !== p.r || still) {
      this.from = this.to = p.cx;
      this.w = w;
      this.r = p.r;
    } else if (p.cx !== this.to) {
      this.from = this.cx(now);
      this.to = p.cx;
      this.t0 = now;
    }
    const cx = this.cx(now);
    this.moving = cx !== this.to;
    return { cx, r: p.r };
  }
  private cx(now: number) {
    const k = this.from === this.to ? 1 : Math.min(1, Math.max(0, (now - this.t0) / 500));
    return Math.round(this.from + (this.to - this.from) * (1 - (1 - k) ** 2));
  }
}

/**
 * The CSS px to shift an element by so its left edge lands on a whole device pixel. A layout
 * centred in an odd-width window starts half a pixel in, which would blur every cell edge at a
 * 125% display scale.
 */
export function deviceShift(left: number, dpr: number) {
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const d = left * ratio;
  return (Math.round(d) - d) / ratio;
}
