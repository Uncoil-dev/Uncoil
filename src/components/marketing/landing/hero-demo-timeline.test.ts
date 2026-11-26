import assert from "node:assert/strict";
import test from "node:test";
import { BREAK_COST, FIX_COST, SAVED_COST, frameAt, phaseTimes } from "./hero-demo-timeline.ts";

test("the break run streams steps in order and stops the counter at the failed step", () => {
  const early = frameAt("break", 600);
  assert.deepEqual(early.rows.map((r) => r.status).slice(0, 3), ["ok", "running", "idle"]);
  assert.ok(early.cost > 0 && early.cost < BREAK_COST);
  assert.equal(early.showCard, false);

  const { end } = phaseTimes("break");
  const done = frameAt("break", end);
  assert.deepEqual(done.rows.map((r) => r.status), ["ok", "warn", "warn", "ok", "ok", "fail", "skipped"]);
  assert.equal(done.rows.filter((r) => r.status === "fail").length, 1);
  assert.equal(done.cost, BREAK_COST);
  assert.equal(done.costStopped, true);
  assert.equal(done.showCard, true);
  assert.equal(frameAt("break", end + 60000).cost, BREAK_COST);
});

test("the fixed run ends all ok at the lower cost", () => {
  const { end } = phaseTimes("fix");
  const done = frameAt("fix", end);
  assert.ok(done.rows.every((r) => r.status === "ok"));
  assert.equal(done.cost, FIX_COST);
  assert.equal(done.finished, true);
  assert.equal(SAVED_COST, 0.36);
});

test("the cost never goes down while a run plays", () => {
  for (const phase of ["break", "fix"] as const) {
    let last = 0;
    for (let ms = 0; ms <= phaseTimes(phase).end; ms += 50) {
      const { cost } = frameAt(phase, ms);
      assert.ok(cost >= last);
      last = cost;
    }
  }
});
