import { describe, expect, it } from "vitest";
import { historyBadge, historyLink, matchesHistoryFilter } from "./alert-history-view";

const base = { triggeredAt: "2026-11-20T12:00:00.000Z", silencedBy: undefined };

describe("alert history view", () => {
  it("labels muted alerts as muted and lists them only under the Muted filter", () => {
    const muted = { ...base, state: "muted" as const };
    expect(historyBadge("muted").label).toBe("MUTED");
    expect(historyBadge("resolved").label).toBe("RESOLVED");
    expect(historyBadge("active").label).toBe("OPEN");
    expect(matchesHistoryFilter(muted, "muted")).toBe(true);
    expect(matchesHistoryFilter(muted, "resolved")).toBe(false);
    expect(matchesHistoryFilter({ ...base, state: "resolved" as const }, "muted")).toBe(false);
    expect(matchesHistoryFilter(muted, "all")).toBe(true);
  });

  it("links a run alert to its trace and a rule alert to the traces in its window", () => {
    expect(historyLink("p1", { ...base, runId: "run_abc 1", type: "run_failed" })).toEqual({ label: "Open trace", href: "/dashboard/p1/tracing?trace=run_abc%201" });
    expect(historyLink("p1", { ...base, runId: "rule:r1:1", ruleId: "r1", type: "failed_runs", windowMinutes: 30 })).toEqual({
      label: "See failing traces",
      href: "/dashboard/p1/tracing?status=error&from=1795174200000&to=1795176000000",
    });
    expect(historyLink("p1", { ...base, runId: "rule:r2:1", ruleId: "r2", type: "cost_usd", windowMinutes: 60 })).toEqual({
      label: "See traces from then",
      href: "/dashboard/p1/tracing?from=1795172400000&to=1795176000000",
    });
    expect(historyLink("p1", { ...base, runId: "budget:b1:2026-11:80", type: "cost_budget" }).href).toBe("/dashboard/p1/tracing?from=1795172400000&to=1795176000000");
    expect(historyLink("p1", { ...base, runId: "manual-alert:High cost", type: "cost_usd" }).label).toBe("See traces from then");
    expect(historyLink("p1", { ...base, runId: "manual:Slow runs", type: "latency_ms" }).label).toBe("See traces from then");
  });
});
