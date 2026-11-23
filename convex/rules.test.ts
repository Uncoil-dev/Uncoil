import assert from "node:assert/strict";
import test from "node:test";
import { BATCH_ACTIONS, checkFilter, matchesRun, type BatchAction, type RunLike } from "./batchRules.ts";
import { MAX_CATEGORIES, checkConfig, checkValue, isPass, summarize, type ScoreConfigShape } from "./scoreConfigRules.ts";

const NOW = Date.parse("2026-01-02T00:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const run = (over: Partial<RunLike> = {}): RunLike => ({ runId: "r1", status: "running", startedAt: hoursAgo(10), ...over });

test("checkFilter rejects unknown actions", () => {
  assert.equal(checkFilter("nope" as BatchAction, {}), "Pick an action.");
});

test("checkFilter enforces cancel_stuck guard rails", () => {
  assert.match(checkFilter("cancel_stuck", { olderThanHours: 2 }) ?? "", /still running/);
  assert.match(checkFilter("cancel_stuck", { status: "running" }) ?? "", /at least 1 hour/);
  assert.match(checkFilter("cancel_stuck", { status: "running", olderThanHours: 0.5 }) ?? "", /at least 1 hour/);
  assert.equal(checkFilter("cancel_stuck", { status: "running", olderThanHours: 1 }), null);
});

test("checkFilter validates age and string lengths", () => {
  assert.equal(checkFilter("queue_review", {}), null);
  assert.equal(checkFilter("add_score", { olderThanHours: 0 }), null);
  for (const bad of [-1, Number.NaN, 24 * 365 + 1]) assert.match(checkFilter("queue_review", { olderThanHours: bad }) ?? "", /Age must be/);
  assert.match(checkFilter("queue_review", { modelContains: "x".repeat(81) }) ?? "", /80 characters/);
  assert.match(checkFilter("queue_review", { environment: "x".repeat(81) }) ?? "", /80 characters/);
  assert.equal(checkFilter("queue_review", { environment: "x".repeat(80) }), null);
});

test("every batch action has a title", () => {
  for (const rule of Object.values(BATCH_ACTIONS)) assert.ok(rule.title);
});

test("matchesRun with an empty filter matches everything", () => {
  assert.equal(matchesRun(run(), {}, NOW), true);
});

test("matchesRun filters by status, environment and model", () => {
  assert.equal(matchesRun(run(), { status: "failed" }, NOW), false);
  assert.equal(matchesRun(run({ environment: "prod" }), { environment: " prod " }, NOW), true);
  assert.equal(matchesRun(run(), { environment: "prod" }, NOW), false);
  assert.equal(matchesRun(run({ primaryModel: "GPT-4o" }), { modelContains: " gpt" }, NOW), true);
  assert.equal(matchesRun(run(), { modelContains: "gpt" }, NOW), false);
  assert.equal(matchesRun(run(), { environment: "  ", modelContains: " " }, NOW), true);
});

test("matchesRun age counts from last activity", () => {
  assert.equal(matchesRun(run({ lastSpanAt: hoursAgo(1) }), { olderThanHours: 5 }, NOW), false);
  assert.equal(matchesRun(run(), { olderThanHours: 5 }, NOW), true);
  assert.equal(matchesRun(run({ startedAt: "garbage" }), { olderThanHours: 1 }, NOW), false);
});

const numeric: ScoreConfigShape = { dataType: "numeric", min: 0, max: 10, passThreshold: 7 };
const categorical: ScoreConfigShape = { dataType: "categorical", categories: ["good", "bad"], passCategories: ["good"] };

test("checkConfig validates names and description", () => {
  assert.equal(checkConfig({ name: "  ", dataType: "boolean" }), "A score needs a name.");
  assert.match(checkConfig({ name: "x".repeat(101), dataType: "boolean" }) ?? "", /100/);
  assert.match(checkConfig({ name: "a", dataType: "boolean", description: "x".repeat(501) }) ?? "", /500/);
  assert.equal(checkConfig({ name: "a", dataType: "boolean" }), null);
});

test("checkConfig validates numeric ranges", () => {
  assert.equal(checkConfig({ name: "a", ...numeric }), null);
  assert.equal(checkConfig({ name: "a", dataType: "numeric" }), null);
  assert.match(checkConfig({ name: "a", dataType: "numeric", min: Number.NaN }) ?? "", /must be numbers/);
  assert.match(checkConfig({ name: "a", dataType: "numeric", min: 5, max: 5 }) ?? "", /lower than/);
  assert.match(checkConfig({ name: "a", dataType: "numeric", min: 0, max: 10, passThreshold: 11 }) ?? "", /inside the range/);
  assert.match(checkConfig({ name: "a", dataType: "numeric", min: 0, passThreshold: -1 }) ?? "", /inside the range/);
});

test("checkConfig validates categories", () => {
  assert.equal(checkConfig({ name: "a", ...categorical }), null);
  assert.match(checkConfig({ name: "a", dataType: "categorical" }) ?? "", /at least two/);
  assert.match(checkConfig({ name: "a", dataType: "categorical", categories: ["only"] }) ?? "", /at least two/);
  const many = Array.from({ length: MAX_CATEGORIES + 1 }, (_, i) => `c${i}`);
  assert.match(checkConfig({ name: "a", dataType: "categorical", categories: many }) ?? "", /at most/);
  assert.match(checkConfig({ name: "a", dataType: "categorical", categories: ["a", " "] }) ?? "", /1 to 60/);
  assert.match(checkConfig({ name: "a", dataType: "categorical", categories: ["a", "x".repeat(61)] }) ?? "", /1 to 60/);
  assert.match(checkConfig({ name: "a", dataType: "categorical", categories: ["Yes", "yes"] }) ?? "", /different/);
  assert.match(checkConfig({ name: "a", dataType: "categorical", categories: ["a", "b"], passCategories: ["c"] }) ?? "", /"c" is marked/);
});

test("checkValue validates by data type", () => {
  const named = (c: ScoreConfigShape) => ({ ...c, name: "q" });
  assert.match(checkValue(named(numeric), "boolean", true) ?? "", /is a numeric score/);
  assert.equal(checkValue(named(numeric), "numeric", 5), null);
  assert.match(checkValue(named(numeric), "numeric", "5") ?? "", /needs a number/);
  assert.match(checkValue(named(numeric), "numeric", Number.POSITIVE_INFINITY) ?? "", /needs a number/);
  assert.match(checkValue(named(numeric), "numeric", -1) ?? "", /below 0/);
  assert.match(checkValue(named(numeric), "numeric", 11) ?? "", /above 10/);
  assert.equal(checkValue(named({ dataType: "boolean" }), "boolean", false), null);
  assert.match(checkValue(named({ dataType: "boolean" }), "boolean", "yes") ?? "", /true or false/);
  assert.equal(checkValue(named(categorical), "categorical", "good"), null);
  assert.match(checkValue(named(categorical), "categorical", "meh") ?? "", /one of: good, bad/);
  assert.match(checkValue(named({ dataType: "categorical" }), "categorical", "x") ?? "", /one of: \./);
});

test("isPass handles each type and missing rules", () => {
  assert.equal(isPass(numeric, 7), true);
  assert.equal(isPass(numeric, 6), false);
  assert.equal(isPass(numeric, "7"), null);
  assert.equal(isPass({ dataType: "numeric" }, 7), null);
  assert.equal(isPass({ dataType: "boolean" }, false), false);
  assert.equal(isPass({ dataType: "boolean" }, 1), null);
  assert.equal(isPass(categorical, "good"), true);
  assert.equal(isPass(categorical, "bad"), false);
  assert.equal(isPass(categorical, 3), null);
  assert.equal(isPass({ dataType: "categorical", categories: ["a", "b"] }, "a"), null);
});

test("summarize handles empty and populated lists", () => {
  assert.deepEqual(summarize(numeric, []), { count: 0, passCount: 0, judged: 0, average: null, lastAt: null });
  const result = summarize(numeric, [
    { value: 8, createdAt: 10 },
    { value: 4, createdAt: 30 },
    { value: 9, createdAt: 20 },
  ]);
  assert.deepEqual(result, { count: 3, passCount: 2, judged: 3, average: 7, lastAt: 30 });
  const cat = summarize(categorical, [{ value: "good", createdAt: 1 }, { value: "bad", createdAt: 2 }]);
  assert.deepEqual(cat, { count: 2, passCount: 1, judged: 2, average: null, lastAt: 2 });
  assert.equal(summarize({ dataType: "numeric" }, [{ value: 2, createdAt: 1 }]).judged, 0);
});
