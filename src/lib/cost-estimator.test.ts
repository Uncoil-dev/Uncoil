import assert from "node:assert/strict";
import test from "node:test";
import { defaultInput, estimate, formatUsd, fromSearch, levers, sanitize, toSearch } from "./cost-estimator.ts";

test("a simple case matches hand maths", () => {
  const r = estimate({ ...defaultInput, runsPerDay: 100, callsPerRun: 2, inputTokens: 1000, outputTokens: 500, inputPricePerM: 1, outputPricePerM: 2, retryRate: 0, successRate: 100, cachedShare: 0, toolCostPerRun: 0 });
  // per call: 1000*1/1e6 + 500*2/1e6 = 0.002; two calls = 0.004; 100 runs = 0.4/day; 30 days = 12
  assert.ok(Math.abs(r.costPerRun - 0.004) < 1e-12);
  assert.ok(Math.abs(r.perMonth - 12) < 1e-9);
  assert.equal(r.retryOverheadPerMonth, 0);
});

test("retries and failures raise the cost of a successful task", () => {
  const base = estimate({ ...defaultInput, retryRate: 0, successRate: 100 });
  const worse = estimate({ ...defaultInput, retryRate: 50, successRate: 50 });
  assert.ok(worse.costPerSuccess > base.costPerSuccess * 2.9);
  assert.ok(worse.failedSpendPerMonth > 0);
});

test("caching only reduces input cost", () => {
  const none = estimate({ ...defaultInput, cachedShare: 0 }).perMonth;
  const cached = estimate({ ...defaultInput, cachedShare: 80 }).perMonth;
  assert.ok(cached < none);
});

test("levers are sorted and never negative", () => {
  const list = levers(defaultInput);
  assert.equal(list.length, 4);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].monthlySaving >= list[i].monthlySaving);
  assert.ok(list.every((l) => l.monthlySaving >= 0));
});

test("bad numbers are clamped instead of producing NaN", () => {
  const r = estimate({ ...defaultInput, runsPerDay: Number.NaN, successRate: 0, retryRate: -5 });
  assert.ok(Number.isFinite(r.perMonth) && Number.isFinite(r.costPerSuccess));
});

test("share links round trip", () => {
  const input = { ...defaultInput, runsPerDay: 777, retryRate: 12 };
  assert.deepEqual(fromSearch(toSearch(input)), input);
  assert.deepEqual(fromSearch("runsPerDay=abc"), defaultInput);
});

test("sanitize clamps negative, huge and non-number inputs to the documented ranges", () => {
  const low = sanitize({ ...defaultInput, runsPerDay: -10, cachedShare: -1, retryRate: -5, toolCostPerRun: -2, successRate: 0 });
  assert.equal(low.runsPerDay, 0);
  assert.equal(low.cachedShare, 0);
  assert.equal(low.retryRate, 0);
  assert.equal(low.toolCostPerRun, 0);
  assert.equal(low.successRate, 1);

  const high = sanitize({ ...defaultInput, runsPerDay: 1e12, callsPerRun: 5000, inputTokens: 1e9, outputTokens: 1e9, cachedShare: 150, inputPricePerM: 5000, cachedDiscount: 101, successRate: 250 });
  assert.equal(high.runsPerDay, 1_000_000_000);
  assert.equal(high.callsPerRun, 1000);
  assert.equal(high.inputTokens, 5_000_000);
  assert.equal(high.outputTokens, 500_000);
  assert.equal(high.cachedShare, 100);
  assert.equal(high.inputPricePerM, 1000);
  assert.equal(high.cachedDiscount, 100);
  assert.equal(high.successRate, 100);

  const junk = sanitize({ ...defaultInput, runsPerDay: Number.NaN, inputTokens: Number.POSITIVE_INFINITY, successRate: "50" as unknown as number });
  assert.equal(junk.runsPerDay, 0);
  assert.equal(junk.inputTokens, 0);
  assert.equal(junk.successRate, 1);

  assert.deepEqual(sanitize(defaultInput), defaultInput);
});

test("formatUsd shows cents precision for small values and whole dollars for large ones", () => {
  assert.equal(formatUsd(0.0012345), "$0.0012");
  assert.equal(formatUsd(0.5), "$0.50");
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(12.5), "$12.50");
  assert.equal(formatUsd(1234567.89), "$1,234,568");
  assert.equal(formatUsd(-0.25), "-$0.25");
  assert.equal(formatUsd(Number.NaN), "—");
  assert.equal(formatUsd(Number.POSITIVE_INFINITY), "—");
});
