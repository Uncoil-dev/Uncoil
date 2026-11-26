import { describe, expect, it } from "vitest";
import { alignSteps, bundleErrors, errorSignature, pickWinners, totals, type DiffSpan, type GroupRow } from "./trace-diff";

let n = 0;
const span = (spanType: string, name: string, extra: Partial<DiffSpan> = {}): DiffSpan => ({
  spanId: `s${n++}`, spanType, toolName: spanType === "tool" ? name : "", modelId: spanType === "llm" ? name : "", latencyMs: 100, costUsd: 0.01,
  createdAt: `2026-10-16 10:00:${String(n).padStart(2, "0")}`, ...extra,
});

describe("alignSteps", () => {
  it("pairs identical steps and marks extras on each side", () => {
    const rows = alignSteps([span("llm", "gpt"), span("tool", "search"), span("llm", "gpt")], [span("llm", "gpt"), span("tool", "search"), span("tool", "retry"), span("llm", "gpt")]);
    expect(rows.map((r) => r.kind)).toEqual(["same", "same", "onlyB", "same"]);
  });
  it("flags a matched step that failed on one side", () => {
    const rows = alignSteps([span("tool", "search", { errorType: "Timeout" })], [span("tool", "search")]);
    expect(rows[0]!.kind).toBe("changed");
  });
});

describe("bundleErrors", () => {
  it("groups the same failure with different ids and counts per side", () => {
    const bad = (id: string) => span("tool", "db", { errorType: "NotFound", errorMessage: `row ${id} not found` });
    const bundles = bundleErrors([bad("11"), bad("22")], [bad("33"), span("tool", "x", { errorType: "Boom", errorMessage: "boom" })]);
    expect(bundles[0]).toMatchObject({ tool: "db", countA: 2, countB: 1, where: "both" });
    expect(bundles[1]).toMatchObject({ where: "onlyB" });
  });
});

describe("errorSignature", () => {
  it("replaces uuids, hex ids, paths and numbers and collapses whitespace", () => {
    const sig = errorSignature({
      toolName: "db", errorType: "NotFound",
      errorMessage: "row 3f2b8c1e-9a4d-4e7f-b1c2-0123456789ab   missing in\n /srv/app/data.json (trace deadbeefcafe01) after 30.5s",
    });
    expect(sig).toEqual({ tool: "db", type: "NotFound", message: "row <id> missing in <path> (trace <id>) after <n>s" });
  });
  it("caps the message at 120 characters", () => {
    expect(errorSignature({ errorMessage: "x".repeat(300) }).message).toBe("x".repeat(120));
  });
  it("falls back to the model id when there is no tool name", () => {
    expect(errorSignature({ toolName: "", modelId: "gpt-4o", errorMessage: "rate limited" })).toEqual({ tool: "gpt-4o", type: "", message: "rate limited" });
  });
});

describe("totals and winners", () => {
  it("sums cost and uses the root span for duration", () => {
    const root = span("agent", "run", { latencyMs: 900 });
    expect(totals([root, span("llm", "gpt", { parentSpanId: root.spanId, latencyMs: 400 })])).toMatchObject({ steps: 2, durationMs: 900, llm: 1 });
  });
  it("ignores groups with too few runs", () => {
    const row = (key: string, runs: number, failedRuns: number, avgCostUsd: number): GroupRow => ({ key, runs, failedRuns, avgCostUsd, p50DurationMs: 1, p95DurationMs: 2, avgSteps: 3 });
    expect(pickWinners([row("a", 50, 10, 0.5), row("b", 40, 2, 0.9), row("tiny", 2, 0, 0.01)])).toMatchObject({ cheapest: "a", mostReliable: "b" });
    expect(pickWinners([row("a", 50, 10, 0.5)]).cheapest).toBeNull();
  });
});
