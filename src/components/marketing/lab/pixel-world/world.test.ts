import assert from "node:assert/strict";
import test from "node:test";

import { GAP, HERO_LOOP, heroState, heroTrack, hud, robotAt, stopAt } from "./world.ts";

test("the hero loop breaks the step, scans and rebuilds it before the robot crosses", () => {
  const order: string[] = [];
  for (let t = 0; t < HERO_LOOP; t += 0.05) {
    const { phase } = heroState(t);
    if (order.at(-1) !== phase) order.push(phase);
  }
  assert.deepEqual(order, ["walk", "break", "scan", "rebuild", "cross", "goal"]);
  assert.equal(heroState(HERO_LOOP + 0.01).phase, "walk");
});

test("the hero robot waits at the bridge edge until the step is rebuilt", () => {
  for (const phase of ["break", "scan", "rebuild"] as const) assert.equal(heroTrack({ phase, local: 0.5 }, 0.6), 0.6);
  assert.ok(heroTrack({ phase: "walk", local: 0.5 }, 0.6) < 0.6);
  assert.ok(heroTrack({ phase: "cross", local: 0.5 }, 0.6) > 0.6);
});

test("the journey robot never walks into the chasm while the step is broken", () => {
  for (let p = 0; p <= 1; p += 0.005) {
    const { status } = hud(p);
    if (status !== "fixed") assert.ok(robotAt(p) < GAP.x0, `robot at ${robotAt(p)} with status ${status} at p=${p.toFixed(3)}`);
  }
  assert.ok(robotAt(1) > GAP.x1);
});

test("scrolling moves through the four stops in order and the run ends fixed and cheaper", () => {
  const stops = [0, 0.25, 0.45, 0.8].map(stopAt);
  assert.deepEqual(stops, [0, 1, 2, 3]);
  const failed = hud(0.5);
  const done = hud(1);
  assert.equal(failed.status, "failed");
  assert.equal(done.status, "fixed");
  assert.equal(done.spans, 6);
  assert.ok(done.cost < failed.cost);
});
