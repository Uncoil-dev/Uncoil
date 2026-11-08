import assert from "node:assert/strict";
import test from "node:test";
import { checkPrices, costFromTokens, findPrice, resolveCostUsd } from "../../convex/modelPricing.ts";
import { checkConfig, checkValue, isPass, summarize } from "../../convex/scoreConfigRules.ts";
import { checkFilter, matchesRun } from "../../convex/batchRules.ts";
import { checkBaseUrl } from "./llm-providers.ts";

const prices = [{ pattern: "gpt-4o", inputPerM: 2.5, outputPerM: 10 }, { pattern: "gpt-4o-mini", inputPerM: 0.15, outputPerM: 0.6 }];

test("the longest model name wins", () => {
  assert.equal(findPrice("gpt-4o-mini-2024-07-18", prices)?.pattern, "gpt-4o-mini");
  assert.equal(findPrice("GPT-4o-2024", prices)?.pattern, "gpt-4o");
  assert.equal(findPrice("claude-x", prices), null);
});

test("reported cost always wins; saved prices only fill the gap", () => {
  assert.equal(resolveCostUsd(0.5, "gpt-4o", 1000, 1000, prices), 0.5);
  assert.ok(Math.abs(resolveCostUsd(undefined, "gpt-4o", 1_000_000, 100_000, prices) - 3.5) < 1e-9);
  assert.equal(resolveCostUsd(0, "gpt-4o", 0, 0, prices), 0);
  assert.equal(resolveCostUsd(undefined, "unknown", 500, 500, prices), 0);
  assert.equal(costFromTokens(prices[0], -5, Number.NaN), 0);
});

test("price lists are checked", () => {
  assert.equal(checkPrices(prices), null);
  assert.match(checkPrices([{ pattern: " ", inputPerM: 1, outputPerM: 1 }]) ?? "", /model name/);
  assert.match(checkPrices([prices[0], { ...prices[0], pattern: "GPT-4O" }]) ?? "", /twice/);
  assert.match(checkPrices([{ pattern: "x", inputPerM: -1, outputPerM: 1 }]) ?? "", /between/);
});

test("score types validate values and pass rules", () => {
  const numeric = { name: "g", dataType: "numeric" as const, min: 0, max: 1, passThreshold: 0.8 };
  assert.equal(checkConfig(numeric), null);
  assert.match(checkConfig({ ...numeric, passThreshold: 2 }) ?? "", /inside the range/);
  assert.match(checkConfig({ name: "c", dataType: "categorical", categories: ["a"] }) ?? "", /two categories/);
  assert.match(checkValue(numeric, "numeric", 1.5) ?? "", /above/);
  assert.match(checkValue(numeric, "boolean", true) ?? "", /numeric score/);
  assert.equal(checkValue(numeric, "numeric", 0.4), null);
  assert.equal(isPass(numeric, 0.8), true);
  assert.equal(isPass(numeric, 0.79), false);
  const cat = { name: "c", dataType: "categorical" as const, categories: ["good", "bad"], passCategories: ["good"] };
  assert.equal(checkValue(cat, "categorical", "meh") === null, false);
  assert.equal(isPass(cat, "good"), true);
  const stats = summarize(numeric, [{ value: 0.9, createdAt: 2 }, { value: 0.5, createdAt: 5 }]);
  assert.deepEqual([stats.count, stats.passCount, stats.judged, stats.lastAt], [2, 1, 2, 5]);
  assert.ok(Math.abs((stats.average ?? 0) - 0.7) < 1e-9);
});

test("bulk actions never cut off a live run", () => {
  assert.match(checkFilter("cancel_stuck", { status: "running" }) ?? "", /at least 1 hour/);
  assert.match(checkFilter("cancel_stuck", { status: "failed", olderThanHours: 5 }) ?? "", /still running/);
  assert.equal(checkFilter("cancel_stuck", { status: "running", olderThanHours: 2 }), null);
  const now = Date.parse("2026-11-07T12:00:00Z");
  const run = { runId: "r", status: "running", startedAt: "2026-11-07T01:00:00Z", lastSpanAt: "2026-11-07T11:30:00Z", primaryModel: "gpt-4o" };
  assert.equal(matchesRun(run, { status: "running", olderThanHours: 2 }, now), false);
  assert.equal(matchesRun({ ...run, lastSpanAt: undefined }, { status: "running", olderThanHours: 2 }, now), true);
  assert.equal(matchesRun(run, { modelContains: "CLAUDE" }, now), false);
});

test("model connection addresses must be public https", () => {
  assert.equal(checkBaseUrl("https://api.openai.com/v1/").ok, true);
  for (const bad of ["http://api.openai.com", "https://localhost/v1", "https://10.0.0.5/v1", "https://169.254.169.254/", "https://[::1]/v1", "https://service.internal/v1", "https://user:pw@api.example.com/", "https://8.8.8.8/v1", "nonsense", "https://api.example.com:8443/v1"]) assert.equal(checkBaseUrl(bad).ok, false, bad);
});
