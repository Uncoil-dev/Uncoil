import { describe, expect, it } from "vitest";
import { stepViewedProperties } from "./onboarding-step-viewed";

describe("stepViewedProperties", () => {
  it("reports the step id with its position in the flow", () => {
    expect(stepViewedProperties("project")).toEqual({ step: "project", step_number: 1, total_steps: 3 });
    expect(stepViewedProperties("install")).toEqual({ step: "install", step_number: 3, total_steps: 3 });
  });

  it("places the legacy waiting and success pages on and after the last step", () => {
    expect(stepViewedProperties("waiting").step_number).toBe(3);
    expect(stepViewedProperties("success").step_number).toBe(4);
  });
});
