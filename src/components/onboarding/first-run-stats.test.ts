import { describe, expect, it } from "vitest";
import { firstRunStats } from "./first-run-panel";

const run = { runId: "run_1", status: "completed" as const, spanCount: 3, totalCostUsd: 0.0042 };

describe("firstRunStats", () => {
  it("shows the run's cost instead of an empty model cell when no model was recorded", () => {
    expect(firstRunStats(run)).toEqual([["Spans", "3"], ["Status", "completed"], ["Cost", "$0.00420"]]);
  });

  it("shows the model when the run used one", () => {
    expect(firstRunStats({ ...run, primaryModel: "gpt-4o" })[2]).toEqual(["Model", "gpt-4o"]);
  });
});
