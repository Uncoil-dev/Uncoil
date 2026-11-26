import assert from "node:assert/strict";
import test from "node:test";

import { applyFilters, totalDurationMs } from "./types.ts";
import type { ExploreFilter, ExploreSpan, ExploreTrace, FilterField } from "./types.ts";

function span(id: string, startOffsetMs: number, durationMs: number, children: ExploreSpan[] = []): ExploreSpan {
  return { id, parentId: null, name: id, kind: "chain", startOffsetMs, durationMs, status: "ok", children };
}

function trace(overrides: Partial<ExploreTrace> & { id: string }): ExploreTrace {
  return {
    name: "Trace",
    status: "success",
    startedAt: "2026-06-10T12:00:00.000Z",
    durationMs: 2000,
    costUsd: 0.05,
    inputTokens: 10,
    outputTokens: 20,
    model: "gpt-4o",
    user: "alice",
    tags: [],
    spans: [],
    ...overrides,
  };
}

function filter(field: FilterField, value: string, value2?: string): ExploreFilter {
  return { id: `f-${field}`, field, label: field, operator: "eq", value, value2 };
}

const ids = (list: ExploreTrace[]) => list.map((t) => t.id);

const traces: ExploreTrace[] = [
  trace({ id: "a", name: "Checkout Agent", status: "success", model: "gpt-4o", tags: ["prod", "billing"], costUsd: 0.01, durationMs: 500, startedAt: "2026-06-01T00:00:00.000Z", user: "alice" }),
  trace({ id: "b", name: "Search", status: "error", model: "claude-sonnet", tags: ["prod"], costUsd: 0.5, durationMs: 5000, startedAt: "2026-06-10T00:00:00.000Z", user: "Bob" }),
  trace({ id: "c", name: "Summarize", status: "running", model: "gpt-4o", tags: [], costUsd: 1.5, durationMs: 12000, startedAt: "2026-06-20T00:00:00.000Z", user: "carol" }),
];

test("totalDurationMs returns 0 for an empty list", () => {
  assert.equal(totalDurationMs([]), 0);
});

test("totalDurationMs uses the latest end across top-level spans", () => {
  assert.equal(totalDurationMs([span("x", 0, 100), span("y", 50, 300), span("z", 10, 20)]), 350);
});

test("totalDurationMs descends into nested children", () => {
  const nested = span("root", 0, 100, [span("child", 80, 50, [span("leaf", 120, 400)])]);
  assert.equal(totalDurationMs([nested]), 520);
});

test("applyFilters returns every trace when there are no filters", () => {
  assert.deepEqual(ids(applyFilters(traces, [])), ["a", "b", "c"]);
});

test("applyFilters handles an empty trace list", () => {
  assert.deepEqual(applyFilters([], [filter("status", "error")]), []);
});

test("applyFilters does not mutate the input list", () => {
  const copy = [...traces];
  applyFilters(traces, [filter("status", "error")]);
  assert.deepEqual(traces, copy);
});

test("status and model filters match exactly", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("status", "error")])), ["b"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("model", "gpt-4o")])), ["a", "c"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("model", "gpt")])), []);
});

test("tag filter matches traces containing the tag", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("tag", "prod")])), ["a", "b"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("tag", "billing")])), ["a"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("tag", "missing")])), []);
});

test("search filter is case-insensitive across name, id, user and model", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("search", "checkout")])), ["a"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("search", "BOB")])), ["b"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("search", "sonnet")])), ["b"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("search", "summ")])), ["c"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("search", "nomatch")])), []);
});

test("blank search matches everything", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("search", "   ")])), ["a", "b", "c"]);
});

test("cost filter supports min, max and both bounds inclusively", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("cost", "0.5")])), ["b", "c"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("cost", "", "0.5")])), ["a", "b"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("cost", "0.1", "1")])), ["b"]);
});

test("latency filter compares in seconds", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("latency", "5")])), ["b", "c"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("latency", "1", "6")])), ["b"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("latency", "", "0.5")])), ["a"]);
});

test("dateRange filter bounds startedAt", () => {
  assert.deepEqual(ids(applyFilters(traces, [filter("dateRange", "2026-06-05T00:00:00.000Z")])), ["b", "c"]);
  assert.deepEqual(ids(applyFilters(traces, [filter("dateRange", "", "2026-06-10T00:00:00.000Z")])), ["a", "b"]);
  assert.deepEqual(
    ids(applyFilters(traces, [filter("dateRange", "2026-06-05T00:00:00.000Z", "2026-06-15T00:00:00.000Z")])),
    ["b"],
  );
});

test("multiple filters are combined with AND", () => {
  const result = applyFilters(traces, [filter("model", "gpt-4o"), filter("tag", "prod")]);
  assert.deepEqual(ids(result), ["a"]);
});

test("unknown filter fields do not exclude traces", () => {
  const unknown = filter("bogus" as unknown as FilterField, "x");
  assert.deepEqual(ids(applyFilters(traces, [unknown])), ["a", "b", "c"]);
});
