import assert from "node:assert/strict";
import test from "node:test";

import { promptLines } from "./story.ts";
import { RUN_A, RUN_B, PLAN_CALL, modelCalls, tokens, totalCost, type ExampleSpan } from "./run-data.ts";
import { CASES, topSteps } from "./cases.ts";
import { logLines } from "./logs.ts";
import { BREAK_AT, FIXED_AT, HERO_LOOP, breakTarget, focusStep, heroState, scanAt, scanPath, type HeroPhase } from "./hero-clock.ts";
import { KIT, SPRITE, spritePaths } from "./kit.ts";
import { promptFor } from "./prompt.ts";
import { snapCell, targetCell } from "./grid.ts";
import { placeSun } from "./sun.ts";
import { drawGround } from "./morning.ts";
import { PALE, INK, Px } from "./pixels.ts";
import { PLATE, boardBox, ropeCells, scanReach, scanStop, scanStopIndex, scanStops, tailCells, whereLayout } from "./where-layout.ts";
import { pebbles } from "./soil.ts";
import { PLANK_LEFT, PLANK_STUB, spriteCells } from "./plank.ts";
import { callCost, getModel } from "../../../lib/tools/models.ts";

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
  const runs: [string, readonly ExampleSpan[]][] = [["run A", RUN_A], ["run B", RUN_B], ...CASES.flatMap((c): [string, readonly ExampleSpan[]][] => [[c.id, c.run], [`${c.id} fixed`, c.fix.after]])];
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
  for (const run of [RUN_A, RUN_B, ...CASES.flatMap((c) => [c.run, c.fix.after])]) {
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

test("every case tells one six-step run: the page's steps are the run's steps, it fails at 06 and the cause is where the page says", () => {
  assert.deepEqual(CASES.map((c) => c.id), ["empty", "loop", "timeout", "wrong"]);
  for (const c of CASES) {
    const root = c.run.find((s) => !s.parentSpanId)!;
    const top = [root, ...c.run.filter((s) => s.parentSpanId === root.spanId)];
    assert.deepEqual(c.steps.map((s) => s.name), top.map((s) => s.name), `${c.id}: steps differ from the run`);
    assert.equal(root.name, c.agent);
    assert.deepEqual(c.run.filter((s) => s.errorType).map((s) => s.spanId), [top[5].spanId], `${c.id}: fails somewhere other than step 06`);
    assert.equal(top[c.cause - 1].spanId, c.causeSpan, `${c.id}: the trace opens on another step than the cause`);
    assert.equal(c.fix.after.some((s) => s.errorType), false, `${c.id}: the fixed run still fails`);
    // A model step's note quotes its own tokens and latency.
    for (const [i, s] of c.steps.entries()) {
      const m = /^([\d,]+) tok · (\d+) ms$/.exec(s.note);
      if (m) assert.deepEqual([Number(m[1].replace(",", "")), Number(m[2])], [tokens(top[i]), top[i].latencyMs], `${c.id}: step ${i + 1} note`);
    }
  }
  // The figures the fix quotes for each case.
  assert.deepEqual(CASES.map((c) => [c.fix.before, c.fix.afterValue]), [["$0.42", "$0.06"], ["$0.37", "$0.04"], ["31.9s", "2.5s"], ["409", "200"]]);
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
  assert.equal(focusStep("fail", 4), 6);
  assert.equal(focusStep("mark", 4), 4);
  assert.equal(focusStep("repair", 3), 3);
  assert.equal(scanAt({ phase: "trace", local: 0 }), 0);
  assert.equal(scanAt({ phase: "trace", local: 1 }), 1);
  assert.ok(scanAt({ phase: "trace", local: 0.5 }) > 0 && scanAt({ phase: "trace", local: 0.5 }) < 1);
});

test("when step 06 is its own cause the scan reads back, finds nothing and comes home to 06", () => {
  const path = Array.from({ length: 101 }, (_, i) => scanPath({ phase: "trace", local: i / 100 }, true));
  const far = path.indexOf(Math.max(...path));
  assert.ok(path[far] > 0.99, "it reaches the furthest step");
  assert.ok(far > 0 && far < 100);
  path.slice(1, far + 1).forEach((v, i) => assert.ok(v >= path[i], "it turns back early"));
  path.slice(far + 1).forEach((v, i) => assert.ok(v <= path[far + i], "it heads out again"));
  assert.ok(path[100] < 1e-9);
  assert.equal(scanPath({ phase: "mark", local: 0.5 }, true), 0);
  assert.equal(scanPath({ phase: "mark", local: 0.5 }, false), 1);
});

test("breaking the hero step hurries to the next failure and never interrupts one in progress", () => {
  assert.equal(heroState(breakTarget(0.5)).phase, "fail");
  assert.equal(breakTarget(0.5), BREAK_AT);
  assert.equal(breakTarget(BREAK_AT + 0.5), -1);
  const late = FIXED_AT + 0.3;
  assert.ok(Math.abs(breakTarget(late) - (HERO_LOOP + BREAK_AT)) < 1e-9);
  assert.equal(heroState(breakTarget(late) + 0.001).phase, "fail");
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

test("the scan frame only ever sits on a step, walking back from 06 to each case's cause", () => {
  const visits = (cause: number) => {
    const seen: number[] = [];
    for (let i = 0; i <= 100; i++) {
      const at = scanStop(i / 100, cause);
      if (seen.at(-1) !== at) seen.push(at);
    }
    return seen;
  };
  assert.deepEqual(visits(4), [5, 4, 3]);
  assert.deepEqual(visits(3), [5, 4, 3, 2]);
  assert.deepEqual(visits(5), [5, 4]);
  // Step 06 as its own cause: back to 04, nothing there, home to 06.
  assert.deepEqual(visits(6), [5, 4, 3, 5]);
  for (const c of CASES) assert.equal(scanStop(0.92, c.cause), c.cause - 1, `${c.id}: the frame ends off the cause`);
  assert.equal(scanReach(0.92, 4), 1);
  assert.equal(scanReach(0, 6), 0);
});

test("the scan frame fits inside the figure on every step it visits", () => {
  for (const vertical of [true, false]) {
    const l = whereLayout(vertical ? 80 : 240, vertical);
    for (const i of [2, 3, 4, 5]) {
      const c = l.centers[i];
      const b = boardBox(l, i);
      const half = PLATE >> 1;
      assert.ok(Math.min(c.x - half, b.x) - 3 >= 0, `left edge, step ${i + 1}`);
      assert.ok(Math.min(c.y - half, b.y) - 3 >= 0, `top edge, step ${i + 1}`);
      assert.ok(Math.max(c.y + half, b.y + b.h - 1) + 3 < l.rows, `bottom edge, step ${i + 1}`);
    }
  }
});

// ── What the page says about each example case ──────────────────────────────────────────────

/** Step numbers a line names: "step 4", "steps 02 to 05", "06 · llm.chat". */
const named = (text: string) => [...text.matchAll(/\bsteps?\s+0?(\d)(?:\s+to\s+0?(\d))?|\b0(\d)\b/gi)].flatMap((m) => [m[1], m[2], m[3]].filter(Boolean).map(Number));

test("a fixed run has no error output, and no leftover empty result", () => {
  for (const c of CASES) {
    for (const s of c.fix.after) {
      assert.doesNotMatch(s.detail.output, /error|fail|refus|\b[45]\d\d\b|\[\s?\]|timed out/i, `${c.id} fixed ${s.spanId}: ${s.detail.output}`);
      assert.equal(s.errorType, undefined);
    }
  }
});

test("the copy only names steps that exist in the run it describes", () => {
  for (const c of CASES) {
    const before = topSteps(c.run).length;
    const after = topSteps(c.fix.after).length;
    for (const line of [c.brokeAt, ...c.reading, c.shows, c.fix.answer]) for (const n of named(line)) assert.ok(n <= before, `${c.id}: "${line}" names step ${n} of ${before}`);
    for (const n of named(c.fix.passes)) assert.ok(n <= after, `${c.id}: "${c.fix.passes}" names step ${n} but the fixed run has ${after}`);
    assert.doesNotMatch(c.fix.passes, /step 0?6/i, `${c.id}: the fixed run is ${after} steps`);
    assert.equal(c.fix.metric.includes("Step"), false, `${c.id}: name the tool, not a step number`);
  }
});

test("every scan stop has its own caption, and the caption names the step the frame is on", () => {
  for (const c of CASES) {
    const stops = scanStops(c.cause);
    assert.equal(c.reading.length, stops.length, `${c.id}: one caption per stop`);
    stops.forEach((stop, i) => {
      assert.match(c.reading[i], new RegExp(`^${String(stop + 1).padStart(2, "0")} · `), `${c.id}: caption ${i} is about another step`);
      assert.ok(c.reading[i].includes(c.steps[stop].name.split(" ")[0]), `${c.id}: caption ${i} does not name ${c.steps[stop].name}`);
    });
    for (let k = 0; k <= 100; k++) assert.equal(stops[scanStopIndex(k / 100, c.cause)], scanStop(k / 100, c.cause));
    assert.equal(scanStopIndex(0.92, c.cause), stops.length - 1);
  }
});

test("when step 06 is the cause, the copy walks the steps the frame visits", () => {
  const c = CASES.find((x) => x.cause === 6)!;
  assert.deepEqual(scanStops(6), [5, 4, 3, 5]);
  assert.doesNotMatch(c.reading.join(" "), /05 to 01/);
  assert.match(c.fix.answer, /idempotency/i);
  assert.doesNotMatch(c.causeShort + c.shows + c.fix.answer, /no timeout set|had no timeout/i, "the call timed out after the client's default");
});

test("the wrong-tool case names the pick as its cause, the same step everywhere", () => {
  const c = CASES.find((x) => x.id === "wrong")!;
  assert.equal(c.cause, 4);
  assert.equal(c.causeSpan, "w-pick");
  assert.equal(c.brokeAt, "step 4.");
  assert.notEqual(c.runId.replace("run_", ""), "7730", "the run id is not the order id");
  assert.notEqual(c.fix.afterId.replace("run_", ""), "7731");
});

test("the empty-search failure is causal: the guessed refund is refused for the window it missed", () => {
  const c = CASES.find((x) => x.id === "empty")!;
  const fail = c.run.find((s) => s.errorType)!;
  assert.match(fail.errorMessage!, /^422/);
  assert.match(fail.detail.output, /refund window/);
  assert.doesNotMatch(c.reading.join(" ") + c.failShort + c.fix.answer, /502/);
});

test("the log tail is the run as the app would log it: no annotations, no invented fields", () => {
  for (const c of CASES) {
    for (const l of logLines(c.run, c.runId)) {
      assert.doesNotMatch(l.text, / · /, `${c.id}: "${l.text}" carries an annotation`);
      assert.doesNotMatch(l.text, /channel=/);
      assert.equal((l.text.match(/\(/g) ?? []).length, (l.text.match(/\)/g) ?? []).length, `${c.id}: unbalanced "${l.text}"`);
    }
  }
});

test("the fixed loop run drafts with its sources, and the post-fix step counts are the real ones", () => {
  const loop = CASES.find((x) => x.id === "loop")!;
  const draft = loop.fix.after.find((s) => s.spanId === "lb-draft")!;
  assert.doesNotMatch(draft.detail.output, /"sources": \[\]/);
  assert.deepEqual(CASES.map((c) => topSteps(c.fix.after).length), [5, 5, 6, 5]);
  assert.equal(topSteps(CASES[0].run).length, 6);
});

test("the sun is placed clear of every post and pole at any width, shrinking only when it has to", () => {
  for (let w = 90; w <= 450; w += 3) {
    const posts: [number, number][] = [[Math.round(w * 0.58) + 11, Math.round(w * 0.58) + 37], [Math.round(w * 0.93) - 1, Math.round(w * 0.93) + 12]];
    const r0 = Math.min(Math.round(w * 0.11), 26);
    const sun = placeSun(w, r0, posts, w * 0.8);
    if (!sun) continue;
    assert.ok(sun.cx - sun.r >= 0 && sun.cx + sun.r < w, `${w}: the sun leaves the screen`);
    for (const [a, b] of posts) assert.ok(sun.cx + sun.r + 3 <= a || sun.cx - sun.r - 3 >= b, `${w}: a post crosses the sun (${sun.cx}±${sun.r} vs ${a}-${b})`);
    if (sun.r < r0) assert.equal(placeSun(w, sun.r + 1, posts, w * 0.8), null, `${w}: a larger sun would have fitted`);
  }
  // 1440 wide (240 cells): the sun keeps off the gantry and the flag, in the gap between them.
  const sun = placeSun(240, 26, [[0, 108], [150, 176], [222, 235]], 192)!;
  assert.ok(sun.r >= 18 && sun.cx > 176 && sun.cx < 222);
});

test("the cause plate's board hangs below it, so the robot standing on it covers nothing", () => {
  for (const c of CASES) {
    for (const [cols, vertical] of [[240, false], [137, false], [87, true]] as const) {
      const l = whereLayout(cols, vertical, c.cause);
      assert.equal(l.above[c.cause - 1], false, `${c.id}: the cause's board is above its plate`);
      l.above.slice(1).forEach((a, i) => assert.notEqual(a, l.above[i], `${c.id}: neighbouring boards on the same side`));
      if (!vertical) {
        const b = boardBox(l, c.cause - 1);
        assert.ok(b.y > l.centers[c.cause - 1].y, "the board is under the plate");
        // Room above the plate for the 13-row robot, its landing hop and the frame's rim.
        assert.ok(l.centers[c.cause - 1].y - (PLATE >> 1) - 2 - 13 >= 0, `${c.id}: no room above the cause plate`);
      }
    }
  }
});

test("the morning strips draw only ink and first light, and the light is gone when asked for none", () => {
  for (const spec of [{ glow: 0.9, hills: 0.35, stones: true }, { glow: 0.45, hills: 0.6 }, { glow: 0, hills: 0.6 }]) {
    const px = new Px(120, 8);
    drawGround(px, spec);
    const [ink, pale] = [INK >>> 0, PALE >>> 0];
    const colours = new Set(px.buf);
    for (const c of colours) assert.ok(c === 0 || c === ink || c === pale, `unexpected colour ${c}`);
    assert.equal(colours.has(pale), spec.glow > 0, `glow ${spec.glow}`);
    // The ground line is two solid ink rows along the whole strip.
    for (let x = 0; x < 120; x++) assert.equal(px.buf[6 * 120 + x] === ink && px.buf[7 * 120 + x] === ink, true);
  }
});
