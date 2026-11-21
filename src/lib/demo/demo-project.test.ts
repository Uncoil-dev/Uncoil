import { describe, expect, it } from "vitest";

import { demoFilter, demoList, demoStats, demoSummary } from "./demo-queries";
import { demoRuns, demoSpans } from "./demo-project";

const NOW = Date.UTC(2026, 9, 16, 12, 0, 0);

describe("public demo project", () => {
  it("builds the same history every time", () => {
    const first = demoRuns(NOW).slice(-5).map((run) => run.runId);
    const second = demoRuns(NOW).slice(-5).map((run) => run.runId);
    expect(first).toEqual(second);
    expect(demoRuns(NOW).length).toBeGreaterThan(10_000);
  });

  it("rebuilds a trace's steps so they match its row in the list", () => {
    const run = demoRuns(NOW).filter((item) => item.errorCount > 0).at(-1)!;
    const { spans } = demoSpans(run.runId, NOW)!;
    expect(spans).toHaveLength(run.spanCount);
    expect(spans.filter((span) => span.errorType).length).toBe(run.errorCount);
    expect(spans[0]!.parentSpanId).toBe("");
    expect(spans[0]!.latencyMs).toBe(run.durationMs);
    expect(spans.every((span) => span.runId === run.runId)).toBe(true);
  });

  it("filters, pages and totals like the real Tracing queries", () => {
    const filters = { fromMs: NOW - 7 * 86_400_000, toMs: NOW, status: "error" as const, facets: { traceName: ["refund-agent"] } };
    const runs = demoFilter(filters, undefined, NOW);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((run) => run.traceName === "refund-agent" && run.errorCount > 0)).toBe(true);
    const page = demoList(runs, { ...filters, pageSize: 10 });
    expect(page.total).toBe(runs.length);
    expect(page.rows).toHaveLength(Math.min(10, runs.length));
    expect(demoStats(runs).errors).toBe(runs.length);
  });

  it("shows the v1.14.0 refund regression and its fix", () => {
    const summary = demoSummary(30, NOW);
    const rate = (release: string) => { const row = summary.releases.find((item) => item.release === release)!; return row.errors / row.traces; };
    expect(rate("v1.14.0")).toBeGreaterThan(rate("v1.14.1") * 1.5);
    expect(summary.errorGroups.groups.some((group) => group.tool === "issue_refund" && group.errorType === "ToolTimeout")).toBe(true);
  });

  it("points every error group at an example trace that contains that error", () => {
    const { groups } = demoSummary(30, NOW).errorGroups;
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) expect(group.sampleRunId).toMatch(/\S/);
  });
});
