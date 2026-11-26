import { describe, expect, it } from "vitest";
import { tracingHref } from "./tracing-href";

describe("tracingHref", () => {
  it("opens Tracing on the errors-only filter for the chosen window", () => {
    expect(tracingHref("p1", 7, { status: "error" })).toBe("/dashboard/p1/tracing?status=error&range=7d");
  });

  it("sorts slowest first for the latency tile", () => {
    expect(tracingHref("p1", 30, { sort: "latency", dir: "desc" })).toBe("/dashboard/p1/tracing?sort=latency&dir=desc&range=30d");
  });

  it("uses the 24-hour range for a one-day window", () => {
    expect(tracingHref("p1", 1)).toBe("/dashboard/p1/tracing?range=24h");
  });
});
