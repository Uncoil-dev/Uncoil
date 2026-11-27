import { describe, expect, it } from "vitest";
import { BOARD_PITCH, SunTrack, deviceShift, footerRuler, placeSun, restX, skyStars, waterfallBar } from "./chrome-layout";

describe("navbar menu waterfall", () => {
  it("steps each page's bar down from where the one before it ended, inside the lane", () => {
    const lane = 47;
    const bars = Array.from({ length: 6 }, (_, j) => waterfallBar(lane, 6, j));
    for (let j = 1; j < bars.length; j++) expect(bars[j].start).toBe(bars[j - 1].start + bars[j - 1].width + 1);
    expect(bars.at(-1)!.start + bars.at(-1)!.width).toBeLessThanOrEqual(lane);
    expect(bars.every((b) => Number.isInteger(b.start) && b.width >= 1)).toBe(true);
  });
});

describe("footer ruler", () => {
  it("hangs each board over its column when the columns sit in one row", () => {
    // 1440px wide at a 6px cell: six columns 38 cells apart, the first at the band's edge.
    const cols = [0, 38, 77, 115, 153, 192];
    const r = footerRuler(229, 6, cols);
    expect(r).toMatchObject({ ox: 0, boards: true });
    cols.forEach((left, i) => expect(Math.abs(r.ox + i * r.pitch - left)).toBeLessThanOrEqual(2));
  });

  it("draws boards and robot at twice the size when the columns are far enough apart", () => {
    expect(footerRuler(229, 6, [0, 38, 77, 115, 153, 192]).scale).toBe(2);
    expect(footerRuler(87, 6).scale).toBe(1);
  });

  it("spreads the boards evenly across the band when the columns wrap", () => {
    const r = footerRuler(87, 6);
    expect(r.boards).toBe(true);
    expect(r.pitch).toBeGreaterThanOrEqual(BOARD_PITCH);
    expect(r.ox + 6 * r.pitch).toBeLessThanOrEqual(87);
  });

  it("leaves the boards out rather than letting them overlap on the narrowest phones", () => {
    const r = footerRuler(70, 6);
    expect(r.boards).toBe(false);
    expect(r.ox + 6 * r.pitch).toBeLessThanOrEqual(70);
  });
});

describe("device pixel snapping", () => {
  it("moves an edge that starts half a pixel in onto a whole device pixel", () => {
    for (const [left, dpr] of [[231.5, 1.25], [231.5, 1], [10.4, 1.5], [0, 2]] as const) {
      const d = (left + deviceShift(left, dpr)) * dpr;
      expect(Math.abs(d - Math.round(d))).toBeLessThan(1e-9);
      expect(Math.abs(deviceShift(left, dpr))).toBeLessThanOrEqual(0.5 / dpr + 1e-9);
    }
  });
});

describe("sun and robot", () => {
  // The robot is 12 cells wide with its outline (6 cells left of its centre, 5 right at 1x).
  const gap = (w: number, rest: number, scale: number, side: 1 | -1) => {
    const sun = placeSun(w, 18 * scale, rest, scale, side)!;
    const [l, r] = [sun.cx - sun.r, sun.cx + sun.r];
    return rest - 6 * scale > r ? rest - 6 * scale - r - 1 : l - (rest + 6 * scale - 1) - 1;
  };

  it("keeps at least 3 empty cells between the sun and the robot wherever it rests, at every width", () => {
    for (const scale of [1, 2]) for (let w = 40 * scale; w <= 260; w += 7) for (let rest = 0; rest < w; rest += 3) for (const side of [1, -1] as const) expect(gap(w, rest, scale, side)).toBeGreaterThanOrEqual(3);
  });

  it("leaves the sun where it is until the robot would come within 3 cells", () => {
    expect(placeSun(87, 18, 10, 1, 1)!.side).toBe(1);
    expect(placeSun(87, 18, 67, 1, 1)!.side).toBe(-1);
    expect(placeSun(87, 18, 40, 1, -1)!.side).toBe(-1);
  });

  it("jumps at once when still, and otherwise slides to the other side in whole cells", () => {
    const t = new SunTrack();
    expect(t.update(0, 87, 18, 10, 1, true)!.cx).toBe(87 - 10 + 2);
    const mid = t.update(100, 87, 18, 67, 1, false)!;
    expect(Number.isInteger(mid.cx)).toBe(true);
    expect(t.moving).toBe(true);
    expect(t.update(2000, 87, 18, 67, 1, false)!.cx).toBe(10 - 2);
    expect(t.moving).toBe(false);
  });

  it("puts the robot over its board when the pitch has room for one", () => {
    expect(restX(1, 14, 2)).toBe(1 + 28 + 6);
    expect(restX(6, 2, 4)).toBe(6 + 8 + 1);
  });
});

describe("sky stars", () => {
  it("places the same stars every time and keeps them out of the boxes to avoid", () => {
    const avoid = [{ x0: 40, x1: 70, y0: 0, y1: 60 }];
    expect(skyStars(120, 50, avoid)).toEqual(skyStars(120, 50, avoid));
    expect(skyStars(120, 50, avoid).some((s) => s.x >= 40 && s.x <= 70)).toBe(false);
  });

  it("spreads over the whole sky, taller skies getting more stars", () => {
    const short = skyStars(66, 14);
    const tall = skyStars(66, 44);
    expect(tall.length).toBeGreaterThan(short.length);
    const ys = tall.map((s) => s.y);
    expect(Math.min(...ys)).toBeLessThan(12);
    expect(Math.max(...ys)).toBeGreaterThan(32);
    expect(new Set(tall.map((s) => `${s.x},${s.y}`)).size).toBe(tall.length);
  });
});
