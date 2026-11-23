import assert from "node:assert/strict";
import test from "node:test";

import {
  PRICES_CHECKED,
  PRICE_SOURCE_NOTE,
  callCost,
  formatTokens,
  getModel,
  models,
  money,
  providers,
} from "./models.ts";

test("model ids are unique and non-empty", () => {
  const ids = models.map((m) => m.id);
  assert.ok(ids.length > 0);
  assert.ok(ids.every((id) => id.length > 0));
  assert.equal(new Set(ids).size, ids.length);
});

test("prices, context and limits are valid numbers", () => {
  for (const m of models) {
    assert.ok(Number.isFinite(m.input) && m.input >= 0, `${m.id} input`);
    assert.ok(Number.isFinite(m.output) && m.output >= 0, `${m.id} output`);
    if (m.cached !== undefined) {
      assert.ok(Number.isFinite(m.cached) && m.cached >= 0, `${m.id} cached`);
    }
    assert.ok(Number.isInteger(m.context) && m.context > 0, `${m.id} context`);
    if (m.maxOutput !== undefined) {
      assert.ok(Number.isInteger(m.maxOutput) && m.maxOutput > 0, `${m.id} maxOutput`);
    }
  }
});

test("every model has a name and a listed provider", () => {
  for (const m of models) {
    assert.ok(m.name.length > 0, `${m.id} name`);
    assert.ok(providers.includes(m.provider), `${m.id} provider`);
  }
});

test("providers has no duplicates and each one has a model", () => {
  assert.equal(new Set(providers).size, providers.length);
  for (const p of providers) {
    assert.ok(models.some((m) => m.provider === p), `no model for ${p}`);
  }
});

test("getModel returns the matching model", () => {
  for (const m of models) {
    assert.equal(getModel(m.id), m);
  }
});

test("getModel returns undefined for unknown ids", () => {
  assert.equal(getModel("not-a-model"), undefined);
  assert.equal(getModel(""), undefined);
  assert.equal(getModel(models[0].id.toUpperCase()), undefined);
});

test("price check date is ISO and appears in the source note", () => {
  assert.match(PRICES_CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(PRICES_CHECKED)));
  assert.ok(PRICE_SOURCE_NOTE.length > 0);
});

test("callCost applies input and output rates per million tokens", () => {
  const model = { ...models[0], input: 2, output: 10, cached: undefined };
  assert.equal(callCost(model, 1_000_000, 0), 2);
  assert.equal(callCost(model, 0, 1_000_000), 10);
  assert.equal(callCost(model, 500_000, 100_000), 2);
  assert.equal(callCost(model, 0, 0), 0);
});

test("callCost uses the cached rate and clamps cached tokens to input", () => {
  const model = { ...models[0], input: 2, output: 10, cached: 0.5 };
  assert.equal(callCost(model, 1_000_000, 0, 1_000_000), 0.5);
  assert.equal(callCost(model, 1_000_000, 0, 5_000_000), 0.5);
  assert.equal(callCost(model, 1_000_000, 0, 500_000), 1.25);
});

test("callCost ignores cached tokens when the model has no cached rate", () => {
  const model = { ...models[0], input: 2, output: 10, cached: undefined };
  assert.equal(callCost(model, 1_000_000, 0, 1_000_000), 2);
});

test("callCost treats negative and non-finite counts as zero", () => {
  const model = { ...models[0], input: 2, output: 10, cached: undefined };
  assert.equal(callCost(model, -5, -5), 0);
  assert.equal(callCost(model, Number.NaN, Number.POSITIVE_INFINITY), 0);
});

test("formatTokens abbreviates thousands and millions", () => {
  assert.equal(formatTokens(0), "0");
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(1500), "1.5K");
  assert.equal(formatTokens(128000), "128K");
  assert.equal(formatTokens(1_000_000), "1M");
  assert.equal(formatTokens(1_048_576), "1.05M");
  assert.equal(formatTokens(Number.NaN), "—");
});

test("money formats zero, tiny, and larger amounts", () => {
  assert.equal(money(0), "$0");
  assert.equal(money(0.00001), "<$0.0001");
  assert.equal(money(0.5), "$0.50");
  assert.equal(money(12.345), "$12.35");
  assert.equal(money(1234.56), "$1,235");
  assert.equal(money(Number.NaN), "—");
});
