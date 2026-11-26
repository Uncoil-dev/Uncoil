import { describe, expect, it } from "vitest";
import { isSetupCheckRun, latestAgentRun } from "./onboarding-runs.ts";

describe("isSetupCheckRun", () => {
  it.each([
    ["onboarding-3f2a9c1e-8b7d-4e21-9a0f-1c2d3e4f5a6b", true],
    ["doctor_9f8e7d6c5b4a3210", true],
    ["run_9f8e7d6c5b4a3210", false],
    ["support-agent-42", false],
    ["my-doctor_run", false],
  ])("treats %s as a setup check: %s", (runId, expected) => {
    expect(isSetupCheckRun(runId)).toBe(expected);
  });
});

describe("latestAgentRun", () => {
  it("finds no agent run when only setup checks arrived", () => {
    expect(latestAgentRun([{ runId: "onboarding-abc" }, { runId: "doctor_123" }])).toBeNull();
  });

  it("returns the last run the agent sent", () => {
    const runs = [{ runId: "run_a" }, { runId: "doctor_123" }, { runId: "run_b" }, { runId: "onboarding-abc" }];
    expect(latestAgentRun(runs)).toEqual({ runId: "run_b" });
  });
});
