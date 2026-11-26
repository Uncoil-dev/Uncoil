import { describe, expect, it } from "vitest";
import { criticalPath, slowestStep, type CriticalPathSpan } from "./trace-critical-path";

const span = (spanId: string, startMs: number, latencyMs: number, parentSpanId = ""): CriticalPathSpan => ({
  spanId, parentSpanId, spanType: "tool_call", label: spanId, startMs, latencyMs, costUsd: 0,
});

describe("criticalPath", () => {
  it("returns an empty result for no spans", () => {
    expect(criticalPath([])).toMatchObject({ wallClockMs: 0, path: [], parallelism: 0 });
  });

  it("follows a serial chain and reports waiting time between steps", () => {
    const result = criticalPath([span("a", 0, 100), span("b", 150, 200), span("c", 400, 100)]);
    expect(result.path.map((s) => s.spanId)).toEqual(["a", "b", "c"]);
    expect(result.wallClockMs).toBe(500);
    expect(result.busyMs).toBe(400);
    expect(result.idleMs).toBe(100);
  });

  it("skips the shorter of two parallel spans", () => {
    const result = criticalPath([span("start", 0, 50), span("slow", 50, 300), span("fast", 50, 100), span("end", 350, 50)]);
    expect(result.path.map((s) => s.spanId)).toEqual(["start", "slow", "end"]);
    expect(result.pathSpanIds.has("fast")).toBe(false);
    expect(result.parallelism).toBeGreaterThan(1);
  });

  it("ignores spans that only wrap other spans", () => {
    const result = criticalPath([span("root", 0, 500), span("a", 0, 200, "root"), span("b", 200, 300, "root")]);
    expect(result.path.map((s) => s.spanId)).toEqual(["a", "b"]);
  });

  it("ranks bottlenecks by duration with their share of the run", () => {
    const result = criticalPath([span("a", 0, 100), span("b", 100, 300), span("c", 400, 100)]);
    expect(result.bottlenecks[0]).toMatchObject({ spanId: "b", share: 0.6 });
  });
});

describe("slowestStep", () => {
  const step = (spanId: string, createdAt: string, latencyMs: number, parentSpanId = "") => ({ spanId, parentSpanId, spanType: "tool_call", createdAt, latencyMs, costUsd: 0 });

  it("picks the longest step on the critical path from stored timestamps, never the wrapping root", () => {
    const result = slowestStep([
      step("root", "2026-11-26 10:00:00", 9000),
      step("plan", "2026-11-26 10:00:00", 1000, "root"),
      step("search", "2026-11-26 10:00:01", 6500, "root"),
      step("answer", "2026-11-26T10:00:07.500Z", 1500, "root"),
    ]);
    expect(result).toEqual({ spanId: "search", latencyMs: 6500 });
  });

  it("returns null when there is nothing to compare", () => {
    expect(slowestStep([])).toBeNull();
    expect(slowestStep([step("only", "2026-11-26 10:00:00", 400)])).toBeNull();
  });
});
