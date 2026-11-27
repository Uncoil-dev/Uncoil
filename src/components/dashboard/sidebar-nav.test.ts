import { describe, expect, it } from "vitest";
import { observeLeaves } from "./sidebar-nav";

const href = (view: string) => `/dashboard/p1/${view}`;

describe("observeLeaves", () => {
  it("lists Costs for a live project, pointing at its costs page", () => {
    const leaves = observeLeaves({ liveProject: true, demo: false, synthetic: false, showSessions: true, href });
    expect(leaves).toContainEqual({ title: "Costs", href: "/dashboard/p1/costs" });
  });

  it("leaves Costs out of the playground, which has no costs page", () => {
    const leaves = observeLeaves({ liveProject: false, demo: false, synthetic: true, showSessions: true, href });
    expect(leaves.map((leaf) => leaf.title)).not.toContain("Costs");
  });
});
