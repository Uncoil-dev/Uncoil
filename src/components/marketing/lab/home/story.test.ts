import assert from "node:assert/strict";
import test from "node:test";

import { EDGE, GAP, cellsPath, edgeCells, horizonRow, hud, robotAt, stopAt } from "./story.ts";

test("the short journey walks three stops in order and ends with the step found, not repaired", () => {
  assert.deepEqual([0, 0.4, 0.8].map(stopAt), [0, 1, 2]);
  for (let p = 0; p <= 1; p += 0.005) assert.ok(robotAt(p) < GAP.x0, `robot stepped into the gap at p=${p.toFixed(3)}`);
  assert.equal(hud(0).status, "idle");
  assert.equal(hud(0.5).status, "recording");
  const end = hud(1);
  assert.equal(end.status, "found");
  assert.equal(end.spans, 6);
});

test("a section edge is solid at the bottom, open at the top and thins out as it rises", () => {
  for (const shape of ["hills", "flat"] as const) {
    const { solid, dither, loose } = edgeCells(shape, 4);
    const solidAt = new Set(solid.map(([c, r]) => `${c},${r}`));
    for (let c = 0; c < EDGE.cols; c++) {
      assert.ok(solidAt.has(`${c},${EDGE.rows - 1}`), `${shape}: column ${c} has no ground`);
      assert.ok(horizonRow(c, shape, 4) > 0, `${shape}: column ${c} fills the top row`);
    }
    // Density per row: count fringe cells per row and check the lower rows are denser.
    const perRow = (r: number) => dither.filter(([, y]) => y === r).length + loose.filter(([, y]) => y === r).length;
    const flatTop = horizonRow(0, "flat", 4);
    if (shape === "flat") assert.ok(perRow(flatTop - 1) > perRow(flatTop - 12) * 2);
  }
});

test("cell paths merge horizontal runs into one rectangle", () => {
  assert.equal(cellsPath([[0, 0], [1, 0], [2, 0], [5, 1]], 8), "M0 0h24v8h-24zM40 8h8v8h-8z");
});
