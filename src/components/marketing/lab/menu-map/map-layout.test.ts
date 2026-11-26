import { describe, expect, it } from "vitest";
import { mapLayout, overlaps, pointAt, walkTime } from "./map-layout";
import { STOPS, stopForPath } from "./stops";

// Map sizes from real phones: portrait at 320-430 wide (map is what is left after the bar,
// board and dock), plus the left column of an 844 x 390 landscape phone.
const SIZES = [
  [320, 240],
  [360, 380],
  [390, 460],
  [430, 520],
  [464, 334],
] as const;

describe("menu map layout", () => {
  it.each(SIZES)("keeps every sign tappable, on screen and clear of the others at %ix%i", (w, h) => {
    const { signs } = mapLayout(w, h);
    for (const [i, s] of signs.entries()) {
      expect(s.h).toBeGreaterThanOrEqual(48);
      expect(s.w).toBeGreaterThanOrEqual(120);
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(w);
      for (const other of signs.slice(i + 1)) expect(overlaps(s, other)).toBe(false);
    }
  });

  it("walks the trail from the trailhead through each stop in order", () => {
    const L = mapLayout(390, 460);
    for (let k = 0; k < L.points.length; k++) {
      const p = pointAt(L.path, L.at[k]);
      expect(p.x).toBeCloseTo(L.points[k].x, 3);
      expect(p.y).toBeCloseTo(L.points[k].y, 3);
    }
    expect(L.at).toEqual([...L.at].sort((a, b) => a - b));
    // The far stop is the highest point on the map, where the sun sits.
    expect(Math.min(...L.points.map((p) => p.y))).toBe(L.points[5].y);
  });

  it("never makes a tap wait more than 1.2 seconds for the robot", () => {
    const L = mapLayout(430, 520);
    expect(walkTime(L.at[5])).toBeLessThanOrEqual(1.2);
    expect(walkTime(0)).toBe(0);
  });
});

describe("menu map stops", () => {
  it("follows the desktop navbar order with Docs first under Developers", () => {
    expect(STOPS.map((s) => s.name)).toEqual(["Product", "Solutions", "Developers", "Company", "Pricing"]);
    expect(STOPS[2].links[0]).toMatchObject({ title: "Docs", href: "/docs" });
  });

  it("starts the robot at the stop for the current page", () => {
    expect(stopForPath("/")).toBe(-1);
    expect(stopForPath("/docs/python")).toBe(2);
    expect(stopForPath("/docs/some/page/")).toBe(2);
    expect(stopForPath("/pricing?plan=pro")).toBe(4);
    expect(stopForPath("/blog/a-post")).toBe(3);
    expect(stopForPath("/integrations")).toBe(0);
  });
});
