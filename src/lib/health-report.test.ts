import { describe, expect, it } from "vitest";
import { buildHealthReport, errorLabel, formatMs, formatUsd, parseSpans, percentile } from "./health-report";
import { sampleSpans } from "./health-report-sample";

describe("parseSpans", () => {
  it("reads a JSON array, JSON lines and CSV", () => {
    const row = { spanId: "a", runId: "r1", spanType: "llm", createdAt: "2026-11-01T10:00:00Z", latencyMs: 120, costUsd: 0.01 };
    expect(parseSpans(JSON.stringify([row])).spans).toHaveLength(1);
    expect(parseSpans(JSON.stringify({ spans: [row, row] })).spans).toHaveLength(2);
    expect(parseSpans(`${JSON.stringify(row)}\n${JSON.stringify(row)}`).spans).toHaveLength(2);
    const csv = "run_id,created_at,latency_ms,cost_usd,model\nr1,2026-11-01T10:00:00Z,120,0.01,gpt-4.1\nr1,bad,1,1,x";
    const parsed = parseSpans(csv);
    expect(parsed.spans).toHaveLength(1);
    expect(parsed.skipped).toBe(1);
    expect(parsed.spans[0]).toMatchObject({ runId: "r1", latencyMs: 120, modelId: "gpt-4.1" });
  });
  it("skips rows without a run or a date", () => {
    expect(parseSpans(JSON.stringify([{ foo: 1 }, "x"]))).toEqual({ spans: [], skipped: 2 });
  });
});

describe("helpers", () => {
  it("takes percentiles", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
  });
  it("groups errors that only differ by numbers", () => {
    const base = { spanId: "a", runId: "r", spanType: "tool", createdAt: "2026-11-01T10:00:00Z", latencyMs: 1 };
    expect(errorLabel({ ...base, errorType: "Timeout", errorMessage: "after 30012ms on order 8841" })).toBe(errorLabel({ ...base, errorType: "Timeout", errorMessage: "after 29977ms on order 9120" }));
  });
  it("formats money with more precision for small amounts", () => {
    expect(formatUsd(0.0042)).toBe("$0.0042");
    expect(formatUsd(0.01)).toBe("$0.010");
    expect(formatUsd(0.999)).toBe("$0.999");
    expect(formatUsd(1)).toBe("$1.00");
    expect(formatUsd(99.99)).toBe("$99.99");
    expect(formatUsd(100)).toBe("$100");
    expect(formatUsd(1234.5)).toBe("$1,235");
  });
  it("formats durations as ms, seconds or minutes", () => {
    expect(formatMs(999.4)).toBe("999 ms");
    expect(formatMs(1000)).toBe("1.0 s");
    expect(formatMs(59_900)).toBe("59.9 s");
    expect(formatMs(60_000)).toBe("1.0 min");
    expect(formatMs(90_000)).toBe("1.5 min");
  });
});

describe("buildHealthReport", () => {
  const report = buildHealthReport(sampleSpans(), { now: new Date("2026-11-16T00:00:00Z") });
  it("adds up cost and runs", () => {
    expect(report.totals.runs).toBe(360);
    expect(report.totals.costUsd).toBeGreaterThan(1);
    expect(report.costByModel[0].model).toBe("gpt-4.1");
    expect(report.costByModel.reduce((s, m) => s + m.share, 0)).toBeCloseTo(1, 1);
  });
  it("finds the planted problems", () => {
    expect(report.errors[0].step).toBe("refund_api");
    expect(report.findings.length).toBeGreaterThan(1);
    expect(report.findings.some((f) => /same tool/.test(f.title))).toBe(true);
    expect(report.steps[0].p95Ms).toBeGreaterThan(report.steps[0].p50Ms);
  });
  it("counts a run as failed only when its last step errors", () => {
    const span = (n: number, error?: string) => ({ spanId: `s${n}`, runId: "r", spanType: "tool", createdAt: `2026-11-01T10:00:0${n}Z`, latencyMs: 10, errorType: error });
    const r = buildHealthReport([span(1, "Boom"), span(2)]);
    expect(r.totals.failedRuns).toBe(0);
    expect(r.totals.recoveredRuns).toBe(1);
  });
});
