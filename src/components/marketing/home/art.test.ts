import { describe, expect, it } from "vitest";
import { robotInFront } from "./hero-art";
import { CREAM, Px } from "./pixels";

const SKY_A = 0x01020304;
const SKY_B = 0x05060708;

/** Draws the dawn robot over a sky and returns the cells it covers, as "x,y". */
function covered(sky: (x: number, y: number) => number, frame = 1) {
  const px = new Px(40, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) px.set(x, y, sky(x, y));
  robotInFront(px, 20, 30, frame, false, false, { swap: true, plank: true, solid: true });
  const cells: [number, number][] = [];
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (px.buf[y * 40 + x] !== sky(x, y)) cells.push([x, y]);
  return { px, cells };
}

describe("the dawn robot", () => {
  it("covers the same cells over a plain and a dithered sky, with no gap inside any row of its body", () => {
    for (const frame of [0, 1, 2, 3]) {
      const plain = covered(() => SKY_A, frame);
      const busy = covered((x, y) => ((x + y) % 2 ? SKY_A : SKY_B), frame);
      expect(busy.cells).toEqual(plain.cells);
      // Above the legs, every row runs unbroken from its first covered cell to its last.
      for (let y = 0; y < 26; y++) {
        const xs = plain.cells.filter(([, cy]) => cy === y).map(([x]) => x);
        if (xs.length) expect(xs.length, `frame ${frame} row ${y}`).toBe(xs[xs.length - 1] - xs[0] + 1);
      }
    }
  });

  it("is edged all round in one solid cream cell, plank included", () => {
    const { px, cells } = covered(() => SKY_A);
    const cream = CREAM >>> 0;
    const at = (x: number, y: number) => px.buf[y * 40 + x] >>> 0;
    const set = new Set(cells.map(([x, y]) => `${x},${y}`));
    // A covered cell with an uncovered neighbour is on the edge: it must be cream.
    for (const [x, y] of cells)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!set.has(`${x + dx},${y + dy}`)) expect(at(x, y), `edge ${x},${y}`).toBe(cream);
  });
});
