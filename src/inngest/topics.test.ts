import assert from "node:assert/strict";
import test from "node:test";
import { buildTopicRows, estimateBuildCost, inSample, providerMessage, ProviderError, runTopicBuild, MIN_TRACES, type BuildDeps, type MapFields, type Summary, type TopicRow } from "./topic-build.ts";

const span = (input: string) => [{ spanId: "s1", spanType: "user", input, output: "Done", createdAt: "2026-01-01T00:00:00Z" }];

function setup(runCount: number, overrides: Partial<BuildDeps> = {}) {
  const ids = Array.from({ length: runCount }, (_, i) => `r${i}`);
  const store = new Map<string, Summary>();
  const maps: MapFields[] = [];
  const topics: TopicRow[][] = [];
  const modelCalls: string[] = [];
  const deps: BuildDeps = {
    map: { filters: {}, facets: ["intent", "outcome"], sampleRate: 1, live: true },
    finishedRunIds: async () => ids,
    missingRunIds: async (list) => list.filter((id) => !store.has(id)),
    spans: async (id) => span(`Refund order ${id} please`),
    saveSummaries: async (rows) => { for (const row of rows) store.set(row.runId, row); },
    getSummaries: async (list) => list.flatMap((id) => (store.has(id) ? [store.get(id)!] : [])),
    replaceTopics: async (rows) => { topics.push(rows); },
    saveMap: async (fields) => { maps.push(fields); },
    now: () => 1000,
    ...overrides,
  };
  return { deps, store, maps, topics, modelCalls };
}

test("saves topics once at least 10 traces are summarized", async () => {
  const { deps, maps, topics } = setup(12);
  const result = await runTopicBuild(deps);
  assert.equal(result.status, "ready");
  assert.equal(topics.length, 1);
  assert.ok(topics[0].some((t) => t.facet === "outcome"));
  assert.equal(maps.at(-1)?.status, "ready");
});

test("says how many more traces are needed below the minimum", async () => {
  const { deps, maps, topics } = setup(7);
  const result = await runTopicBuild(deps);
  assert.equal(result.status, "waiting");
  assert.equal(topics.length, 0);
  assert.match(maps.at(-1)?.message ?? "", new RegExp(`Needs ${MIN_TRACES - 7} more`));
});

test("only summarizes traces that have no summary yet", async () => {
  const { deps, store } = setup(12);
  store.set("r0", { runId: "r0", intent: "kept", sentiment: "Neutral", outcome: "Completed", issues: [] });
  let read = 0;
  await runTopicBuild({ ...deps, spans: async (id) => { read++; return span(id); } });
  assert.equal(read, 11);
  assert.equal(store.get("r0")?.intent, "kept");
});

test("a provider error pauses the map and stops calling the model", async () => {
  let calls = 0;
  const { deps, maps, topics } = setup(12, {
    callModel: async () => { calls++; throw new ProviderError(providerMessage(401)); },
  });
  const result = await runTopicBuild(deps);
  assert.equal(result.status, "paused");
  assert.equal(calls, 1);
  assert.equal(topics.length, 0);
  assert.equal(maps.at(-1)?.status, "paused");
  assert.match(maps.at(-1)?.message ?? "", /key was rejected/);
});

test("an error that is not from the provider marks the map failed", async () => {
  const { deps, maps } = setup(12, { spans: async () => { throw new Error("db down"); } });
  await assert.rejects(runTopicBuild(deps), /db down/);
  assert.equal(maps.at(-1)?.status, "failed");
});

test("sampling is stable and follows the rate", () => {
  assert.equal(inSample("abc", 1), true);
  assert.equal(inSample("abc", 0.5), inSample("abc", 0.5));
  const kept = Array.from({ length: 1000 }, (_, i) => inSample(`run-${i}`, 0.3)).filter(Boolean).length;
  assert.ok(kept > 220 && kept < 380, `kept ${kept}`);
});

test("cost estimate uses the connection model price and caps the trace count", () => {
  const prices = [{ pattern: "gpt-4o-mini", inputPerM: 0.15, outputPerM: 0.6 }];
  const small = estimateBuildCost({ traces: 100, model: "gpt-4o-mini", prices });
  assert.equal(small.inputTokens, 200_000);
  assert.ok(Math.abs(small.costUsd! - (200_000 * 0.15 + 10_000 * 0.6) / 1e6) < 1e-9);
  assert.equal(estimateBuildCost({ traces: 99999, model: "gpt-4o-mini", prices }).traces, 400);
  assert.equal(estimateBuildCost({ traces: 10, model: "unknown", prices }).costUsd, null);
});

test("categorical facets group by value with shares of all summarized traces", () => {
  const summaries = Array.from({ length: 10 }, (_, i): Summary => ({ runId: `r${i}`, intent: "x", sentiment: "Neutral", outcome: i < 7 ? "Completed" : "Failed", issues: [] }));
  const rows = buildTopicRows(summaries, ["outcome"]);
  assert.deepEqual(rows.map((r) => [r.name, r.count, r.share]), [["Completed", 7, 0.7], ["Failed", 3, 0.3]]);
});
