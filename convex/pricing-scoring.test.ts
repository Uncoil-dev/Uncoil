import assert from "node:assert/strict";
import test from "node:test";
import { SUGGESTED_PRICES, checkPrices, costFromTokens, findPrice, resolveCostUsd, type ModelPrice } from "./modelPricing.ts";
import { DEFAULT_JUDGE_MODEL, MAX_DAILY_LIMIT, checkTrigger, estimatedGradeCost, judgeCost, judgeModel, startOfUtcDay, stepMatches, type RuleTrigger } from "./autoScoring.ts";

const price = (pattern: string, inputPerM = 1, outputPerM = 2): ModelPrice => ({ pattern, inputPerM, outputPerM });

test("checkPrices accepts a valid list and the suggested prices", () => {
  assert.equal(checkPrices([]), null);
  assert.equal(checkPrices(SUGGESTED_PRICES), null);
  assert.equal(checkPrices([price("free-model", 0, 0)]), null);
});

test("checkPrices rejects bad lists", () => {
  assert.match(checkPrices([price("  ")]) ?? "", /model name/);
  assert.match(checkPrices([price("a"), price("A")]) ?? "", /twice/);
  assert.match(checkPrices([price("x".repeat(121))]) ?? "", /120/);
  assert.match(checkPrices([price("a", -1)]) ?? "", /between 0/);
  assert.match(checkPrices([price("a", 1, 10_001)]) ?? "", /between 0/);
  assert.match(checkPrices([price("a", Number.NaN)]) ?? "", /between 0/);
  assert.match(checkPrices([{ ...price("a"), note: "n".repeat(201) }]) ?? "", /200/);
  const many = Array.from({ length: 51 }, (_, i) => price(`m${i}`));
  assert.match(checkPrices(many) ?? "", /at most 50/);
});

test("findPrice picks the longest matching prefix, case-insensitively", () => {
  assert.equal(findPrice("GPT-4o-mini-2024", SUGGESTED_PRICES)?.pattern, "gpt-4o-mini");
  assert.equal(findPrice("gpt-4o-2024", SUGGESTED_PRICES)?.pattern, "gpt-4o");
  assert.equal(findPrice("  gpt-4.1-nano ", SUGGESTED_PRICES)?.pattern, "gpt-4.1-nano");
});

test("findPrice returns null for unknown or empty inputs", () => {
  assert.equal(findPrice("mystery", SUGGESTED_PRICES), null);
  assert.equal(findPrice(undefined, SUGGESTED_PRICES), null);
  assert.equal(findPrice("   ", SUGGESTED_PRICES), null);
  assert.equal(findPrice("gpt-4o", undefined), null);
  assert.equal(findPrice("gpt-4o", []), null);
  assert.equal(findPrice("gpt-4o", [price("  ")]), null);
});

test("costFromTokens converts per-million prices and clamps bad token counts", () => {
  const p = price("m", 2, 10);
  assert.equal(costFromTokens(p, 1_000_000, 1_000_000), 12);
  assert.equal(costFromTokens(p, 0, 0), 0);
  assert.equal(costFromTokens(p, -5, Number.NaN), 0);
  assert.equal(costFromTokens(p, Number.POSITIVE_INFINITY, 500_000), 5);
});

test("resolveCostUsd prefers a reported cost", () => {
  assert.equal(resolveCostUsd(0.5, "gpt-4o", 1000, 1000, SUGGESTED_PRICES), 0.5);
});

test("resolveCostUsd fills the gap from project prices", () => {
  const prices = [price("custom", 1, 2)];
  assert.equal(resolveCostUsd(undefined, "custom-1", 1_000_000, 500_000, prices), 2);
  assert.equal(resolveCostUsd(0, "custom-1", 1_000_000, 0, prices), 1);
});

test("resolveCostUsd falls back to the reported value or zero", () => {
  assert.equal(resolveCostUsd(undefined, "custom", 0, 0, [price("custom")]), 0);
  assert.equal(resolveCostUsd(0, "custom", 0, 0, [price("custom")]), 0);
  assert.equal(resolveCostUsd(undefined, "unknown", 100, 100, [price("custom")]), 0);
  assert.equal(resolveCostUsd(undefined, undefined, 100, 100, undefined), 0);
  assert.equal(resolveCostUsd(Number.NaN, "custom", 1_000_000, 0, [price("custom", 3, 0)]), 3);
});

test("judgeModel and judgeCost handle known, unknown and zero input", () => {
  assert.equal(judgeModel(" gpt-4o-mini ")?.label, "GPT-4o mini");
  assert.equal(judgeModel("nope"), undefined);
  assert.equal(judgeModel(undefined), undefined);
  assert.equal(judgeCost("nope", 1000, 1000), 0);
  assert.equal(judgeCost("gpt-4o-mini", 0, 0), 0);
  assert.ok(Math.abs(judgeCost("gpt-4.1-mini", 1_000_000, 1_000_000) - 2) < 1e-9);
});

test("estimatedGradeCost uses the default model when none is given", () => {
  assert.equal(estimatedGradeCost(undefined), judgeCost(DEFAULT_JUDGE_MODEL, 1200, 120));
  assert.equal(estimatedGradeCost("unknown"), 0);
  assert.ok(estimatedGradeCost("gpt-4.1-mini") > estimatedGradeCost("gpt-4o-mini"));
});

test("stepMatches treats a missing trigger as every step", () => {
  assert.equal(stepMatches(undefined, {}), true);
  assert.equal(stepMatches({ when: "every" }, { spanType: "llm" }), true);
});

test("stepMatches filters on span type and model", () => {
  assert.equal(stepMatches({ when: "failed" }, { spanType: "error" }), true);
  assert.equal(stepMatches({ when: "failed" }, { spanType: "llm" }), false);
  assert.equal(stepMatches({ when: "run_end" }, { spanType: "run_end" }), true);
  assert.equal(stepMatches({ when: "run_end" }, {}), false);
  assert.equal(stepMatches({ when: "every", modelContains: " GPT " }, { modelId: "gpt-4o" }), true);
  assert.equal(stepMatches({ when: "every", modelContains: "claude" }, { modelId: "gpt-4o" }), false);
  assert.equal(stepMatches({ when: "every", modelContains: "claude" }, {}), false);
  assert.equal(stepMatches({ when: "every", modelContains: "  " }, {}), true);
});

test("checkTrigger validates when, model filter and daily cap", () => {
  assert.equal(checkTrigger(undefined), null);
  assert.equal(checkTrigger({ when: "every", dailyLimit: MAX_DAILY_LIMIT }), null);
  assert.match(checkTrigger({ when: "bad" } as unknown as RuleTrigger) ?? "", /Pick which/);
  assert.match(checkTrigger({ when: "every", modelContains: "x".repeat(81) }) ?? "", /80/);
  for (const dailyLimit of [0, 1.5, MAX_DAILY_LIMIT + 1, Number.NaN]) {
    assert.match(checkTrigger({ when: "every", dailyLimit }) ?? "", /daily cap/);
  }
});

test("startOfUtcDay rounds down to midnight UTC", () => {
  const midnight = Date.parse("2026-01-02T00:00:00.000Z");
  assert.equal(startOfUtcDay(midnight + 86_399_999), midnight);
  assert.equal(startOfUtcDay(midnight), midnight);
  assert.equal(startOfUtcDay(0), 0);
});
