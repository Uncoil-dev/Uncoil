import { describe, expect, it } from "vitest";

import { topbarControlsFor } from "./dashboard-topbar-controls";

describe("topbarControlsFor", () => {
  it("shows range, environment and filters on the project overview", () => {
    expect(topbarControlsFor("/dashboard/abc")).toEqual({ range: true, environment: true, filters: true });
  });

  it("shows range and environment, not filters, on data pages", () => {
    expect(topbarControlsFor("/dashboard/abc/tracing")).toEqual({ range: true, environment: true, filters: false });
    expect(topbarControlsFor("/dashboard/abc/runs/xyz")).toEqual({ range: true, environment: true, filters: false });
  });

  it("hides all controls on setup and settings pages", () => {
    for (const page of ["quickstart", "billing", "api-keys", "settings", "manage", "docs"]) {
      expect(topbarControlsFor(`/dashboard/abc/${page}`)).toEqual({ range: false, environment: false, filters: false });
    }
  });
});
