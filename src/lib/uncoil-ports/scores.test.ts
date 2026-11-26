import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// mergeScoresWithCache imports "./aggregateScores" without an extension, which
// plain Node cannot resolve. A resolve hook maps it to the .ts file.
const hooks = `
  export async function resolve(specifier, context, next) {
    if (specifier.startsWith("./") && !/\\.[a-z]+$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const agg = await import("./aggregateScores.ts");
const cache = await import("./mergeScoresWithCache.ts");
const { aggregateScores, composeAggregateScoreKey, decomposeAggregateScoreKey, normalizeScoreName, toBooleanScoreValue } = agg;
const { mergeScoresWithCache, mergeAggregatesWithCache } = cache;

const score = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  name: "quality",
  source: "human",
  dataType: "numeric",
  value: 1,
  ...over,
});

test("aggregateScores returns an empty object for empty input", () => {
  assert.deepEqual(aggregateScores([]), {});
});

test("key helpers normalize names and round-trip", () => {
  assert.equal(normalizeScoreName("a-b.c"), "a_b_c");
  const key = composeAggregateScoreKey({ name: "a-b", source: "llm", dataType: "boolean" });
  assert.equal(key, "a_b-llm-boolean");
  assert.deepEqual(decomposeAggregateScoreKey(key), { name: "a_b", source: "llm", dataType: "boolean" });
});

test("toBooleanScoreValue accepts true, 1 and 'true' only", () => {
  assert.equal(toBooleanScoreValue({ value: true }), "true");
  assert.equal(toBooleanScoreValue({ value: 1 }), "true");
  assert.equal(toBooleanScoreValue({ value: "true" }), "true");
  assert.equal(toBooleanScoreValue({ value: false }), "false");
  assert.equal(toBooleanScoreValue({ value: 0 }), "false");
  assert.equal(toBooleanScoreValue({ value: "yes" }), "false");
});

test("aggregateScores averages numeric scores and keeps metadata for a single score", () => {
  const single = aggregateScores([score({ comment: "ok", createdAt: 5 })] as never);
  assert.deepEqual(single["quality-human-numeric"], {
    type: "NUMERIC", values: [1], average: 1, comment: "ok", id: "s1", timestamp: 5,
  });

  const many = aggregateScores([score({ value: 2 }), score({ id: "s2", value: 4, comment: "x" })] as never);
  const entry = many["quality-human-numeric"]!;
  assert.equal(entry.type, "NUMERIC");
  assert.equal((entry as { average: number }).average, 3);
  assert.equal(entry.comment, undefined);
  assert.equal(entry.id, undefined);
});

test("aggregateScores treats non-number values on numeric scores as 0", () => {
  const out = aggregateScores([score({ value: "n/a" })] as never);
  assert.deepEqual((out["quality-human-numeric"] as { values: number[] }).values, [0]);
});

test("aggregateScores groups mixed types, sources and names separately", () => {
  const out = aggregateScores([
    score({ id: "a", value: 3 }),
    score({ id: "b", name: "safe", dataType: "boolean", value: true }),
    score({ id: "c", name: "safe", dataType: "boolean", value: false }),
    score({ id: "d", name: "safe", dataType: "boolean", value: true }),
    score({ id: "e", name: "tone", dataType: "categorical", value: "warm" }),
    score({ id: "f", name: "tone", dataType: "categorical", value: "cold" }),
    score({ id: "g", name: "tone", dataType: "categorical", value: "warm" }),
    score({ id: "h", name: "note", dataType: "text", value: "hi", source: "llm" }),
  ] as never);
  assert.deepEqual(Object.keys(out).sort(), [
    "note-llm-text", "quality-human-numeric", "safe-human-boolean", "tone-human-categorical",
  ]);
  assert.deepEqual(out["safe-human-boolean"], {
    type: "CATEGORICAL",
    values: ["false", "true", "true"],
    valueCounts: [{ value: "false", count: 1 }, { value: "true", count: 2 }],
    comment: undefined, id: undefined, timestamp: undefined,
  });
  assert.deepEqual((out["tone-human-categorical"] as { valueCounts: unknown }).valueCounts, [
    { value: "cold", count: 1 }, { value: "warm", count: 2 },
  ]);
  assert.equal(out["note-llm-text"]!.type, "CATEGORICAL");
  assert.equal(out["note-llm-text"]!.id, "h");
});

test("mergeScoresWithCache handles empty inputs", () => {
  assert.deepEqual(mergeScoresWithCache([], [], new Set()), []);
  const server = [score()] as never[];
  assert.deepEqual(mergeScoresWithCache(server, [], new Set()), server);
});

test("mergeScoresWithCache overlays value and comment, adds cache-only and drops deleted", () => {
  const server = [score({ id: "a", value: 1, comment: "old", name: "keep" }), score({ id: "b" })] as never[];
  const cached = [score({ id: "a", value: 9, comment: "new", name: "ignored" }), score({ id: "c", value: 7 })] as never[];
  const out = mergeScoresWithCache(server, cached, new Set(["b"])) as Array<Record<string, unknown>>;
  assert.deepEqual(out.map((s) => s.id), ["a", "c"]);
  assert.equal(out[0]!.value, 9);
  assert.equal(out[0]!.comment, "new");
  assert.equal(out[0]!.name, "keep");
  assert.equal(out[1]!.value, 7);
});

test("mergeAggregatesWithCache removes deleted aggregates and overlays cached scores", () => {
  const server = aggregateScores([
    score({ id: "a", name: "gone" }),
    score({ id: "b", name: "stay", value: 2 }),
  ] as never);
  const cached = [
    score({ id: "c", name: "stay", value: 8, comment: "fresh" }),
    score({ id: "d", name: "flag", dataType: "boolean", value: true }),
  ] as never[];
  const out = mergeAggregatesWithCache(server, cached, new Set(["a"]));
  assert.deepEqual(Object.keys(out).sort(), ["flag-human-boolean", "stay-human-numeric"]);
  assert.deepEqual(out["stay-human-numeric"], { type: "NUMERIC", values: [8], average: 8, comment: "fresh", id: "c" });
  assert.deepEqual(out["flag-human-boolean"]!.values, ["true"]);
  assert.deepEqual(mergeAggregatesWithCache({}, [], new Set()), {});
  // input is not mutated
  assert.ok(server["gone-human-numeric"]);
});
