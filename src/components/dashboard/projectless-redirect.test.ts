import { describe, expect, it } from "vitest";
import { projectlessHref } from "./projectless-redirect";

const storage = (value: string | null) => ({ getItem: (key: string) => (key === "uncoil.lastProjectId" ? value : null) });

describe("projectlessHref", () => {
  it("opens the same page of the last project", () => {
    expect(projectlessHref("costs", storage("proj_last"))).toBe("/dashboard/proj_last/costs");
  });

  it("opens the last project's home for pages without a project version", () => {
    expect(projectlessHref("", storage("proj_last"))).toBe("/dashboard/proj_last");
  });

  it("falls back to the project picker with no usable last project", () => {
    expect(projectlessHref("costs", storage(null))).toBe("/dashboard");
    expect(projectlessHref("costs", storage("no-project"))).toBe("/dashboard");
  });
});
