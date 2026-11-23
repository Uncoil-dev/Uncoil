import assert from "node:assert/strict";
import test from "node:test";

import { METRICS, type Metric } from "./alert-metrics.ts";

const keys = Object.keys(METRICS) as Metric[];

test("METRICS: exposes the four known metrics with complete config", () => {
  assert.deepEqual(keys.sort(), ["cost_usd", "failed_runs", "minutes_without_runs", "slow_p95_seconds"]);
  for (const key of keys) {
    const m = METRICS[key];
    assert.ok(m.title && m.hint && m.sentence && m.unit, key);
    assert.ok(m.defaultLimit > 0, key);
    assert.equal(typeof m.defaultName, "function");
    assert.equal(typeof m.format, "function");
    assert.equal(typeof m.condition, "function");
  }
});

test("METRICS: unknown metric key is undefined", () => {
  assert.equal((METRICS as Record<string, unknown>)["not_a_metric"], undefined);
});

test("defaultName: window-based metrics switch between hour and day", () => {
  assert.equal(METRICS.failed_runs.defaultName(60), "Failed runs per hour");
  assert.equal(METRICS.failed_runs.defaultName(1440), "Failed runs per day");
  assert.equal(METRICS.cost_usd.defaultName(0), "Spend per hour");
  assert.equal(METRICS.cost_usd.defaultName(2880), "Spend per day");
});

test("defaultName: fixed-window metrics ignore the window", () => {
  assert.equal(METRICS.slow_p95_seconds.defaultName(1440), "Slow runs (p95)");
  assert.equal(METRICS.minutes_without_runs.defaultName(60), "No runs received");
});

test("fixedWindow: only the fixed-window metrics define it", () => {
  assert.equal(METRICS.failed_runs.fixedWindow, undefined);
  assert.equal(METRICS.cost_usd.fixedWindow, undefined);
  assert.equal(METRICS.slow_p95_seconds.fixedWindow, 60);
  assert.equal(METRICS.minutes_without_runs.fixedWindow, 1440);
});

test("format: renders values per metric, including zero", () => {
  assert.equal(METRICS.failed_runs.format(0), "0");
  assert.equal(METRICS.failed_runs.format(12), "12");
  assert.equal(METRICS.cost_usd.format(0), "$0.00");
  assert.equal(METRICS.cost_usd.format(3.456), "$3.46");
  assert.equal(METRICS.slow_p95_seconds.format(0), "0 s");
  assert.equal(METRICS.slow_p95_seconds.format(21), "21 s");
  assert.equal(METRICS.minutes_without_runs.format(45), "45 min");
});

test("condition: describes threshold and window", () => {
  assert.equal(METRICS.failed_runs.condition(5, 60), "> 5 / hour");
  assert.equal(METRICS.failed_runs.condition(5, 1440), "> 5 / day");
  assert.equal(METRICS.cost_usd.condition(30, 60), "> $30 / hour");
  assert.equal(METRICS.cost_usd.condition(0, 1440), "> $0 / day");
  assert.equal(METRICS.slow_p95_seconds.condition(20, 1440), "> 20 s");
  assert.equal(METRICS.minutes_without_runs.condition(30, 60), "> 30 min quiet");
});
