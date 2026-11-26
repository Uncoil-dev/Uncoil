import assert from "node:assert/strict";
import test from "node:test";

import { EDGE, cellsPath, edgeCells, horizonRow, numberLines } from "./story.ts";
import { RUN_A, RUN_B, totalCost } from "./run-data.ts";
import { chapterAt } from "./rail-logic.ts";
import { BREAK_AT, FIXED_AT, breakTarget } from "./hero-clock.ts";
import { HERO_LOOP, heroState } from "../pixel-world/world.ts";
import { KIT, SPRITE, spritePaths } from "./kit.ts";

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

test("every inventory item has a square 12-cell sprite drawn only in cream and yellow", () => {
  assert.equal(new Set(KIT.map((k) => k.id)).size, KIT.length);
  for (const item of KIT) {
    assert.equal(item.sprite.length, SPRITE, `${item.id}: row count`);
    for (const row of item.sprite) assert.match(row, /^[.#y]{12}$/, `${item.id}: ${row}`);
    const { cream, yellow } = spritePaths(item.sprite);
    assert.ok(cream.length > 0 && yellow.length > 0, `${item.id} needs both colours`);
  }
});

test("sprite paths merge runs of one colour and skip empty cells", () => {
  const { cream, yellow } = spritePaths(["##.y", "y..#"]);
  assert.equal(cream, "M0 0h2v1h-2zM3 1h1v1h-1z");
  assert.equal(yellow, "M3 0h1v1h-1zM0 1h1v1h-1z");
});

test("the setup prompt numbers its written lines and leaves blank lines unnumbered", () => {
  const lines = numberLines("Set up.\n\n1. Install.\n2. Run.\n\nDo not invent a key.");
  assert.deepEqual(lines.map((l) => l.n), ["01", "", "02", "03", "", "04"]);
  assert.equal(lines[5].line, "Do not invent a key.");
});

test("the example runs add up to the cost figures the page shows", () => {
  assert.equal(totalCost(RUN_A).toFixed(2), "0.42");
  assert.equal(totalCost(RUN_B).toFixed(2), "0.06");
  assert.deepEqual(RUN_A.filter((s) => s.errorType).map((s) => s.name), ["refund.issue"]);
  assert.equal(RUN_B.some((s) => s.errorType), false);
  // Every child starts and ends inside its parent, so the timeline draws a real nesting.
  for (const run of [RUN_A, RUN_B]) {
    const byId = new Map(run.map((s) => [s.spanId, s]));
    for (const s of run) {
      const parent = byId.get(s.parentSpanId);
      if (!parent) continue;
      const start = Date.parse(s.createdAt);
      const pStart = Date.parse(parent.createdAt);
      assert.ok(start >= pStart && start + s.latencyMs <= pStart + parent.latencyMs, `${s.spanId} spills out of ${parent.spanId}`);
    }
  }
});

test("the rail marks the last chapter whose top has passed the reading line", () => {
  assert.equal(chapterAt([500, 900, 1300], 360), -1);
  assert.equal(chapterAt([-400, 120, 900], 360), 1);
  assert.equal(chapterAt([-900, -500, -100], 360), 2);
});

test("breaking the hero step hurries to the next break and never interrupts one in progress", () => {
  assert.equal(heroState(breakTarget(0.5)).phase, "break");
  assert.equal(breakTarget(0.5), BREAK_AT);
  assert.equal(breakTarget(BREAK_AT + 0.5), -1);
  const late = FIXED_AT + 0.3;
  assert.ok(Math.abs(breakTarget(late) - (HERO_LOOP + BREAK_AT)) < 1e-9);
  assert.equal(heroState(breakTarget(late) + 0.001).phase, "break");
});
