import assert from "node:assert/strict";
import test from "node:test";
import { cachingSavings, defaultCaching, checkFit, compareModels, defaultCompare, defaultRate, rateLimits } from "./calculators.ts";
import { callCost, getModel, models, money, formatTokens } from "./models.ts";

test("shared model list is sane and unique", () => {
  const ids = new Set(models.map((m) => m.id));
  assert.equal(ids.size, models.length);
  for (const m of models) {
    assert.ok(m.input > 0 && m.output > 0, m.id);
    assert.ok(m.output >= m.input, `${m.id} output should not be cheaper than input`);
    assert.ok(m.context >= 100_000, m.id);
    if (m.cached !== undefined) assert.ok(m.cached < m.input, `${m.id} cached price should be below input`);
    if (m.maxOutput) assert.ok(m.maxOutput <= m.context, m.id);
  }
});

test("call cost matches hand maths and handles cache", () => {
  const m = getModel("gpt-4o")!;
  assert.equal(callCost(m, 1_000_000, 0), 2.5);
  assert.equal(callCost(m, 0, 1_000_000), 10);
  assert.equal(callCost(m, 1_000_000, 0, 500_000), 0.5 * 2.5 + 0.5 * 1.25);
  const noCache = getModel("llama-4-scout")!;
  assert.equal(callCost(noCache, 1_000_000, 0, 1_000_000), 0.1);
  assert.equal(callCost(m, NaN, -5), 0);
  assert.equal(callCost(m, 100, 0, 9999), (100 * 1.25) / 1e6);
});

test("context fit reports fits, tight and too big", () => {
  const rows = checkFit(() => 170_000, 4000);
  const by = (id: string) => rows.find((r) => r.model.id === id)!;
  assert.equal(by("gpt-4o").status, "too-big");
  assert.equal(by("gpt-4o").chunks, 2);
  assert.equal(by("claude-sonnet-5-5").status, "fits");
  assert.equal(by("claude-haiku-4-5").status, "tight");
  const big = checkFit(() => 100, 10_000_000);
  assert.equal(big.find((r) => r.model.id === "gpt-4o")!.outputCapped, true);
  assert.equal(checkFit(() => 0, 0)[0].status, "fits");
});

test("price comparison ranks by cost and scales with requests", () => {
  const rows = compareModels(defaultCompare);
  const cheap = Math.min(...rows.map((r) => r.perMonth));
  const dear = Math.max(...rows.map((r) => r.perMonth));
  assert.ok(cheap < dear);
  const nano = rows.find((r) => r.model.id === "gpt-5-nano")!;
  assert.ok(Math.abs(nano.perRequest - (2000 * 0.05 + 400 * 0.4) / 1e6) < 1e-12);
  assert.ok(Math.abs(nano.perMonth - nano.perRequest * 100_000) < 1e-9);
  assert.equal(compareModels({ requestsPerMonth: NaN, inputTokens: -1, outputTokens: 0, cachedShare: 500 })[0].perMonth, 0);
});

test("rate limits find the limiting factor and users", () => {
  const r = rateLimits({ ...defaultRate, rpm: 100, tpm: 0, retryRate: 0, callsPerAction: 2, secondsBetweenActions: 60, targetUsers: 10, peakFactor: 1 });
  assert.equal(r.limitingFactor, "requests");
  assert.equal(r.maxActionsPerMinute, 50);
  assert.equal(r.maxUsersNormal, 50);
  assert.equal(r.neededRpm, 20);
  assert.equal(r.verdict, "ok");
  const t = rateLimits({ ...defaultRate, rpm: 10_000, tpm: 30_000, inputTokens: 2000, outputTokens: 1000, retryRate: 0, callsPerAction: 1, targetUsers: 1000, secondsBetweenActions: 30, peakFactor: 1 });
  assert.equal(t.limitingFactor, "tokens");
  assert.equal(t.maxCallsPerMinute, 10);
  assert.equal(t.verdict, "over");
  const sep = rateLimits({ ...defaultRate, separateOutputLimit: true, rpm: 1000, tpm: 100_000, otpm: 4000, inputTokens: 1000, outputTokens: 400, retryRate: 0 });
  assert.equal(sep.limitingFactor, "output tokens");
  assert.equal(sep.maxCallsPerMinute, 10);
});

test("rate limits survive nonsense", () => {
  const r = rateLimits({ ...defaultRate, rpm: 0, tpm: 0, targetUsers: 0, callsPerAction: NaN, secondsBetweenActions: 0 });
  assert.equal(r.limitingFactor, "none");
  assert.equal(r.verdict, "ok");
  assert.doesNotThrow(() => rateLimits({ ...defaultRate, rpm: -5, peakFactor: -1 }));
});

test("formatters", () => {
  assert.equal(money(0), "$0");
  assert.equal(money(1234.5), "$1,235");
  assert.equal(money(0.00123), "$0.00123");
  assert.equal(money(NaN), "—");
  assert.equal(formatTokens(1_048_576), "1.05M");
  assert.equal(formatTokens(128000), "128K");
  assert.equal(formatTokens(4096), "4.1K");
});

test("caching savings only lists cached models and saves nothing at zero hits", () => {
  const rows = cachingSavings(defaultCaching);
  assert.ok(rows.length > 0 && rows.every((r) => r.model.cached !== undefined && r.saved > 0));
  assert.ok(rows.every((r) => r.withCache < r.withoutCache));
  const none = cachingSavings({ ...defaultCaching, hitRate: 0 });
  assert.ok(none.every((r) => Math.abs(r.saved) < 1e-9));
});
