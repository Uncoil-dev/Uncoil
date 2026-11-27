import { describe, expect, it } from "vitest";
import { traceSpans, traceSummary } from "./trace-stage-data";

describe("trace viewer replay", () => {
  it("summarises the spans it lists", () => {
    expect(traceSpans.map(([name]) => name)).toEqual([
      "agent.run",
      "llm.plan",
      "tool.search",
      "tool.search  retry",
      "llm.answer",
    ]);
    expect(traceSummary(traceSpans)).toEqual(["5 spans", "2 model calls", "1 retry"]);
  });
});
