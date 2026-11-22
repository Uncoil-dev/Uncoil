import { describe, expect, it } from "vitest";
import { sampleSpans } from "./health-report-sample";

describe("sampleSpans", () => {
  it("is deterministic across calls", () => {
    expect(sampleSpans()).toEqual(sampleSpans());
  });

  it("covers 360 runs with unique span ids", () => {
    const spans = sampleSpans();
    expect(new Set(spans.map((s) => s.runId)).size).toBe(360);
    expect(new Set(spans.map((s) => s.spanId)).size).toBe(spans.length);
  });

  it("produces valid timestamps within the sample week", () => {
    const start = Date.UTC(2026, 10, 9, 6);
    for (const s of sampleSpans()) {
      const t = Date.parse(s.createdAt);
      expect(Number.isNaN(t)).toBe(false);
      expect(t).toBeGreaterThanOrEqual(start);
      expect(t).toBeLessThan(start + 9 * 86_400_000);
      expect(s.latencyMs).toBeGreaterThan(0);
    }
  });

  it("includes both agents, llm and tool spans", () => {
    const spans = sampleSpans();
    expect(new Set(spans.map((s) => s.traceName))).toEqual(new Set(["support-agent", "refund-agent"]));
    expect(spans.some((s) => s.spanType === "llm" && s.modelId)).toBe(true);
    expect(spans.some((s) => s.spanType === "tool" && s.toolName === "search_orders")).toBe(true);
  });

  it("includes timeouts, errors and retries", () => {
    const spans = sampleSpans();
    const timeouts = spans.filter((s) => s.timedOut);
    expect(timeouts.length).toBeGreaterThan(0);
    for (const s of timeouts) {
      expect(s.errorType).toBe("TimeoutError");
      expect(s.toolName).toBe("refund_api");
    }
    expect(spans.some((s) => s.errorType === "ToolFailed")).toBe(true);
    expect(spans.some((s) => (s.retryCount ?? 0) > 0)).toBe(true);
  });

  it("only attaches costs to llm spans", () => {
    for (const s of sampleSpans()) {
      if (s.costUsd !== undefined) {
        expect(s.spanType).toBe("llm");
        expect(s.costUsd).toBeGreaterThan(0);
      }
    }
  });
});
