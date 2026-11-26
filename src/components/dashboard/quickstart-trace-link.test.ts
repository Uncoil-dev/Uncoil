import { describe, expect, it } from "vitest";
import { lastStepHref } from "./quickstart-guide";

describe("quickstart last step link", () => {
  it("opens the arrived run, with its id encoded for the URL", () => {
    expect(lastStepHref("p1", "run/42 a")).toBe("/dashboard/p1/runs/run%2F42%20a");
  });

  it("opens tracing while no run has arrived", () => {
    expect(lastStepHref("p1")).toBe("/dashboard/p1/tracing");
  });
});
