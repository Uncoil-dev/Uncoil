import assert from "node:assert/strict";
import test from "node:test";

import { EDGE, cellsPath, edgeCells, horizonRow, promptLines } from "./story.ts";
import { RUN_A, RUN_B, PLAN_CALL, modelCalls, totalCost, type ExampleSpan } from "./run-data.ts";
import { CASES } from "./cases.ts";
import { logLines } from "./logs.ts";
import { chapterAt } from "./rail-logic.ts";
import { BREAK_AT, FIXED_AT, HERO_LOOP, breakTarget, focusStep, heroState, scanAt, type HeroPhase } from "./hero-clock.ts";
import { KIT, SPRITE, spritePaths } from "./kit.ts";
import { promptFor } from "./prompt.ts";
import { snapCell, targetCell } from "./grid.ts";
import { PLATE, boardBox, ropeCells, scanStop, tailCells, whereLayout } from "./where-layout.ts";
import { pebbles } from "./soil.ts";
import { PLANK_LEFT, PLANK_STUB, spriteCells } from "./plank.ts";
import { callCost, getModel } from "../../../lib/tools/models.ts";

test("a section edge is solid at the bottom, open at the top and thins out as it rises", () => {
  for (const shape of ["hills", "flat"] as const) {
    const { solid, dither, loose } = edgeCells(shape, 4);
    const solidAt = new Set(solid.map(([c, r]) => `${c},${r}`));
    for (let c = 0; c < EDGE.cols; c++) {
      assert.ok(solidAt.has(`${c},${EDGE.rows - 1}`), `${shape}: column ${c} has no ground`);
      assert.ok(horizonRow(c, shape, 4) > 0, `${shape}: column ${c} fills the top row`);
    }
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

test("the setup prompt keeps its own step numbers and gains no second numbering", () => {
  const lines = promptLines(promptFor("Cursor"));
  assert.deepEqual(lines.filter((l) => l.num).map((l) => l.num), ["1", "2", "3", "4"]);
  for (const l of lines) assert.doesNotMatch(l.text, /^\d+\.\s/, `"${l.text}" still carries a number`);
  assert.equal(lines[0].num, "");
});

test("every model call is priced from its tokens with the repo's price table", () => {
  const runs: [string, readonly ExampleSpan[]][] = [["run A", RUN_A], ["run B", RUN_B], ...CASES.map((c): [string, readonly ExampleSpan[]] => [c.id, c.run])];
  for (const [name, run] of runs) {
    for (const s of run) {
      if (s.spanType !== "llm_call") {
        assert.equal(s.costUsd, 0, `${name} ${s.spanId}: only model calls cost money`);
        continue;
      }
      const model = getModel(s.modelId ?? "");
      assert.ok(model, `${name} ${s.spanId}: unknown model ${s.modelId}`);
      const expected = callCost(model, s.inputTokens ?? 0, s.outputTokens ?? 0);
      assert.ok(Math.abs(s.costUsd - expected) < 1e-9, `${name} ${s.spanId}: $${s.costUsd} but its tokens cost $${expected}`);
    }
  }
  // The figures the page quotes: $0.42 before the fix, $0.06 after, 8 model calls down to 2.
  assert.equal(totalCost(RUN_A).toFixed(2), "0.42");
  assert.equal(totalCost(RUN_B).toFixed(2), "0.06");
  assert.deepEqual([modelCalls(RUN_A), modelCalls(RUN_B)], [8, 2]);
  assert.ok(RUN_A.includes(PLAN_CALL));
});

test("the example runs nest properly and fail only where the page says", () => {
  assert.deepEqual(RUN_A.filter((s) => s.errorType).map((s) => s.name), ["refund.issue"]);
  assert.equal(RUN_B.some((s) => s.errorType), false);
  for (const run of [RUN_A, RUN_B, ...CASES.map((c) => c.run)]) {
    const byId = new Map(run.map((s) => [s.spanId, s]));
    for (const s of run) {
      const parent = byId.get(s.parentSpanId);
      if (!parent) continue;
      const start = Date.parse(s.createdAt);
      const pStart = Date.parse(parent.createdAt);
      assert.ok(start >= pStart && start + s.latencyMs <= pStart + parent.latencyMs, `${s.spanId} spills out of ${parent.spanId}`);
    }
  }
  for (const c of CASES) assert.ok(c.run.some((s) => s.spanId === c.cause), `${c.id}: the cause is not in its run`);
});

test("the log tail is the same run, with the empty search as an ordinary info line", () => {
  const lines = logLines(RUN_A, "run_9f3a");
  const empty = lines.filter((l) => l.text.includes("docs.search") && l.text.includes("hits=0"));
  assert.equal(empty.length, 1);
  assert.equal(empty[0].level, "INFO");
  assert.ok(lines.filter((l) => l.level === "ERROR").every((l) => /refund|at /.test(l.text)));
  assert.equal(lines.filter((l) => l.text.startsWith("openai POST")).length, modelCalls(RUN_A));
  const times = lines.map((l) => l.time);
  assert.deepEqual(times, [...times].sort());
});

test("the hero fails at 06, walks back to 04, fixes it, and only then crosses", () => {
  const order: HeroPhase[] = [];
  for (let t = 0; t < HERO_LOOP; t += 0.05) {
    const { phase } = heroState(t);
    if (order.at(-1) !== phase) order.push(phase);
  }
  assert.deepEqual(order, ["walk", "fail", "trace", "mark", "repair", "cross", "goal"]);
  assert.equal(focusStep("fail"), 6);
  assert.equal(focusStep("mark"), 4);
  assert.equal(focusStep("repair"), 4);
  assert.equal(scanAt({ phase: "trace", local: 0 }), 0);
  assert.equal(scanAt({ phase: "trace", local: 1 }), 1);
  assert.ok(scanAt({ phase: "trace", local: 0.5 }) > 0 && scanAt({ phase: "trace", local: 0.5 }) < 1);
});

test("breaking the hero step hurries to the next failure and never interrupts one in progress", () => {
  assert.equal(heroState(breakTarget(0.5)).phase, "fail");
  assert.equal(breakTarget(0.5), BREAK_AT);
  assert.equal(breakTarget(BREAK_AT + 0.5), -1);
  const late = FIXED_AT + 0.3;
  assert.ok(Math.abs(breakTarget(late) - (HERO_LOOP + BREAK_AT)) < 1e-9);
  assert.equal(heroState(breakTarget(late) + 0.001).phase, "fail");
});

test("the rail marks the last chapter whose top has passed the reading line", () => {
  assert.equal(chapterAt([500, 900, 1300], 360), -1);
  assert.equal(chapterAt([-400, 120, 900], 360), 1);
  assert.equal(chapterAt([-900, -500, -100], 360), 2);
});

test("a page cell always covers a whole number of device pixels", () => {
  for (const dpr of [1, 1.25, 1.5, 2, 2.625, 3]) {
    for (const w of [390, 768, 1440]) {
      const cell = snapCell(targetCell(w), dpr);
      assert.ok(Math.abs(cell * dpr - Math.round(cell * dpr)) < 1e-9, `dpr ${dpr}, width ${w}: ${cell}`);
      assert.ok(Math.abs(cell - targetCell(w)) <= 0.5 / dpr + 1e-9);
    }
  }
  assert.equal(snapCell(6, 1.25), 6.4);
});

test("the trace figure keeps its plates apart, its boards on screen and its rope unbroken until the snap", () => {
  for (const [cols, vertical] of [[137, false], [213, false], [87, true]] as const) {
    const l = whereLayout(cols, vertical);
    for (let i = 0; i < 6; i++) {
      const b = boardBox(l, i);
      assert.ok(b.x >= 0 && b.x + b.w <= cols && b.y >= 0 && b.y + b.h <= l.rows, `${cols}: board ${i + 1} off the figure`);
      if (i) {
        const [p, q] = [l.centers[i - 1], l.centers[i]];
        assert.ok(Math.abs(p.x - q.x) > PLATE || Math.abs(p.y - q.y) > PLATE, `${cols}: plates ${i} and ${i + 1} overlap`);
      }
    }
    const { cells, snap } = ropeCells(l);
    assert.ok(snap > 0 && snap < cells.length);
    for (let k = 1; k < cells.length; k++) {
      const gap = Math.max(Math.abs(cells[k][0] - cells[k - 1][0]), Math.abs(cells[k][1] - cells[k - 1][1]));
      assert.equal(gap, 1, `${cols}: the rope jumps at cell ${k}`);
    }
  }
});

test("pebbles in the soil keep clear of the chasm", () => {
  const gap = [100, 136] as const;
  const cells = pebbles(240, 150, 110, [gap]);
  assert.ok(cells.length > 10);
  for (const [x, y] of cells) {
    assert.ok(x < gap[0] - 6 || x >= gap[1] + 6, `pebble at ${x},${y} sits on the chasm edge`);
    assert.ok(y > 110 + 4);
  }
});

test("the snapped plank hangs at an angle, so it never reads as a post", () => {
  for (const rows of [PLANK_LEFT.at(-1)!, PLANK_STUB]) {
    const cells = spriteCells(rows);
    // Every row starts further right than the one above it, or level with it.
    const starts = rows.map((row) => row.search(/[^.]/));
    starts.slice(1).forEach((x, i) => assert.ok(x >= starts[i], `row ${i + 1} steps back left`));
    // No column is filled for more than three rows in a row.
    for (let x = 0; x < rows[0].length; x++) {
      const run = cells.filter(([cx]) => cx === x).length;
      assert.ok(run <= 3, `column ${x} is a post of ${run} cells`);
    }
  }
  // It hangs lower than the flat plank and is wider than it is a post.
  const hanging = PLANK_LEFT.at(-1)!;
  assert.ok(hanging.length > 3 && hanging[0].length >= 5);
});

test("the loose rope end under step 06 hangs down on phones instead of curling sideways", () => {
  const l = whereLayout(80, true);
  const c = l.centers[5];
  const tail = tailCells(l);
  // It starts under the plate, only ever goes down, and stays within a cell of the plate's middle.
  assert.ok(tail.every(([, y]) => y > c.y + (PLATE >> 1)));
  tail.slice(1).forEach(([, y], i) => assert.ok(y >= tail[i][1], "the tail climbs back up"));
  assert.ok(tail.every(([x]) => Math.abs(x - c.x) <= 1));
  // It stays clear of step 06's number board, which sits to the right of the plate.
  const b = boardBox(l, 5);
  assert.ok(tail.every(([x]) => x < b.x));
  // And it fits inside the figure.
  assert.ok(tail.every(([, y]) => y < l.rows));
});

test("the scan frame only ever sits on a step: 06, then 05, then 04", () => {
  const stops = Array.from({ length: 101 }, (_, i) => scanStop(i / 100));
  assert.deepEqual([...new Set(stops)], [5, 4, 3]);
  assert.equal(scanStop(0), 5);
  assert.equal(scanStop(1), 3);
});

test("the scan frame fits inside the figure on every step it visits", () => {
  for (const vertical of [true, false]) {
    const l = whereLayout(vertical ? 80 : 240, vertical);
    for (const i of [3, 4, 5]) {
      const c = l.centers[i];
      const b = boardBox(l, i);
      const half = PLATE >> 1;
      assert.ok(Math.min(c.x - half, b.x) - 3 >= 0, `left edge, step ${i + 1}`);
      assert.ok(Math.min(c.y - half, b.y) - 3 >= 0, `top edge, step ${i + 1}`);
      assert.ok(Math.max(c.y + half, b.y + b.h - 1) + 3 < l.rows, `bottom edge, step ${i + 1}`);
    }
  }
});
