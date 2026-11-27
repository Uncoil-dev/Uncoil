import { describe, expect, it } from "vitest";
import { inked, pairParticles, rasterPoints, segment } from "./art";

describe("editorial pixel art helpers", () => {
  it("dithers a mid tone to roughly half the pixels and keeps the extremes solid", () => {
    let on = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) on += inked(x, y, 0.5) ? 1 : 0;
    expect(on).toBe(8);
    expect(inked(3, 3, 0)).toBe(false);
    expect(inked(-1, -5, 1)).toBe(true);
  });

  it("samples only opaque cells of a bitmap", () => {
    // 3x2 bitmap: opaque at (1,0) and (2,1).
    const rgba = new Uint8ClampedArray(3 * 2 * 4);
    rgba[(0 * 3 + 1) * 4 + 3] = 255;
    rgba[(1 * 3 + 2) * 4 + 3] = 200;
    rgba[(1 * 3 + 0) * 4 + 3] = 60;
    expect(rasterPoints(rgba, 3, 2)).toEqual([{ x: 1, y: 0 }, { x: 2, y: 1 }]);
  });

  it("gives every target pixel exactly one particle and lets spare source pixels fall away", () => {
    const from = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
    const to = Array.from({ length: 4 }, (_, i) => ({ x: i * 2, y: 5 }));
    const pairs = pairParticles(from, to);
    expect(pairs).toHaveLength(10);
    const targets = pairs.flatMap((p) => (p.to ? [`${p.to.x},${p.to.y}`] : []));
    expect(new Set(targets).size).toBe(4);
    expect(pairs.filter((p) => p.to === null)).toHaveLength(6);
  });

  it("adds particles when the target shape is bigger than the source", () => {
    const pairs = pairParticles([{ x: 0, y: 0 }], [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
    expect(pairs).toHaveLength(3);
    expect(pairs.every((p) => p.to && p.from.x === 0)).toBe(true);
  });

  it("clamps scroll sub-ranges", () => {
    expect(segment(0.1, 0.2, 0.6)).toBe(0);
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.6)).toBe(1);
  });
});
