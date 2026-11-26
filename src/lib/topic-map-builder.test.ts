import { describe, expect, it } from "vitest";
import { refreshTopicMaps } from "./topic-map-function";
import { buildTopicMap, MIN_TRACES_PER_FACET, type TopicMapDeps } from "./topic-map-builder";

type Summary = { runId: string; intent: string; sentiment: string; outcome: string; issues: string[] };

function setup(options: { runs?: number; stored?: Summary[]; modelFails?: boolean; modelText?: string } = {}) {
  const runIds = Array.from({ length: options.runs ?? 12 }, (_, i) => `run-${i}`);
  const stored = new Map((options.stored ?? []).map((s) => [s.runId, s]));
  const calls = { model: 0, spans: [] as string[], map: [] as Array<{ status: string }>, topics: [] as Array<{ facet: string; name: string }>, finishedBefore: 0 };
  const deps: TopicMapDeps = {
    now: () => 1_000_000_000,
    listFinishedRuns: async (_job, finishedBeforeMs) => { calls.finishedBefore = finishedBeforeMs; return runIds; },
    missingRunIds: async (ids) => ids.filter((id) => !stored.has(id)),
    loadSpans: async (runId) => { calls.spans.push(runId); return [{ spanId: "s", input: `refund order ${runId}` }]; },
    callModel: async () => {
      calls.model++;
      if (options.modelFails) throw new Error("provider down");
      return JSON.stringify({ intent: "Refund an order", sentiment: "Neutral", outcome: "Completed", issue: "none" });
    },
    saveSummaries: async (rows) => { for (const row of rows) stored.set(row.runId, row); },
    loadSummaries: async (ids) => ids.flatMap((id) => (stored.has(id) ? [stored.get(id)!] : [])),
    saveTopics: async (topics) => { calls.topics.push(...topics); },
    saveMap: async (map) => { calls.map.push(map); },
  };
  return { deps, calls, stored };
}
const job = { projectId: "p1", filters: {}, facets: ["intent"], sampleRate: 1 };

describe("buildTopicMap", () => {
  it("summarizes only missing traces, groups them per facet and marks the map ready", async () => {
    const existing: Summary = { runId: "run-0", intent: "Refund an order", sentiment: "Neutral", outcome: "Completed", issues: [] };
    const { deps, calls, stored } = setup({ stored: [existing] });
    const result = await buildTopicMap(job, deps);
    expect(calls.spans).not.toContain("run-0");
    expect(calls.spans).toHaveLength(11);
    expect(calls.finishedBefore).toBe(1_000_000_000 - 5 * 60_000);
    expect(calls.topics.length).toBeGreaterThan(0);
    expect(calls.topics.every((t) => t.facet === "intent")).toBe(true);
    expect(calls.map.at(-1)?.status).toBe("ready");
    expect(result.status).toBe("ready");
    expect(stored.get("run-5")).toEqual({ runId: "run-5", intent: "Refund an order", sentiment: "Neutral", outcome: "Completed", issues: [] });
  });

  it("keeps a facet without topics and reports how many more traces it needs", async () => {
    const { deps, calls } = setup({ runs: 4 });
    const result = await buildTopicMap(job, deps);
    expect(calls.topics).toEqual([]);
    expect(result).toMatchObject({ status: "ready" });
    expect(result.status === "ready" && result.shortfall).toEqual({ intent: MIN_TRACES_PER_FACET - 4 });
  });

  it("counts only traces that have a value for the facet", async () => {
    const { deps, calls } = setup({ runs: 12 });
    const result = await buildTopicMap({ ...job, facets: ["issues"] }, deps);
    expect(calls.topics).toEqual([]);
    expect(result.status === "ready" && result.shortfall).toEqual({ issues: MIN_TRACES_PER_FACET });
  });

  it("samples a share of the matching traces", async () => {
    const { deps, calls } = setup({ runs: 400 });
    await buildTopicMap({ ...job, sampleRate: 0.25 }, deps);
    expect(calls.spans.length).toBeGreaterThan(50);
    expect(calls.spans.length).toBeLessThan(150);
  });

  it("pauses the map on a provider error without saving topics or retrying", async () => {
    const { deps, calls } = setup({ modelFails: true });
    const result = await buildTopicMap(job, deps);
    expect(calls.model).toBe(1);
    expect(calls.topics).toEqual([]);
    expect(calls.map.at(-1)?.status).toBe("failed");
    expect(result).toMatchObject({ status: "failed", message: expect.stringContaining("model connection") });
  });
});

describe("refreshTopicMaps", () => {
  it("builds one project on a refresh request and every live map on the daily run", async () => {
    const built: string[] = [];
    const source = {
      mapFor: async (id: string) => (id === "none" ? null : { ...job, projectId: id }),
      liveMaps: async () => [{ ...job, projectId: "a" }, { ...job, projectId: "b" }],
      depsFor: (j: typeof job) => ({ ...setup({ runs: 0 }).deps, saveMap: async () => { built.push(j.projectId); } }),
    };
    expect((await refreshTopicMaps(source, "x")).map((r) => r.projectId)).toEqual(["x"]);
    expect(await refreshTopicMaps(source, "none")).toEqual([]);
    expect((await refreshTopicMaps(source)).map((r) => r.projectId)).toEqual(["a", "b"]);
  });
});
