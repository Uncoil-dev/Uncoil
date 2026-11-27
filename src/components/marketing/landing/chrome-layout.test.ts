import { describe, expect, it } from "vitest";
import { BOARD_PITCH, deviceShift, footerRuler, waterfallBar } from "./chrome-layout";

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

  it("spreads the boards evenly when the columns wrap, keeping room for the sun", () => {
    const r = footerRuler(87, 6);
    expect(r.boards).toBe(true);
    expect(r.pitch).toBeGreaterThanOrEqual(BOARD_PITCH);
    expect(r.ox + 6 * r.pitch).toBeLessThanOrEqual(87 - 8);
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
