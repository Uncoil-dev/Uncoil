import { describe, expect, it } from "vitest";
import { currentHref, groupOf, menus, mobileMenu, mobileMenuHrefs } from "./nav-links";

describe("phone menu links", () => {
  it("keeps every desktop destination and pricing reachable", () => {
    const desktop = new Set([...Object.values(menus).flatMap((m) => m.links.map(([, , href]) => href)), "/pricing"]);
    expect(new Set(mobileMenuHrefs())).toEqual(desktop);
  });

  it("has five rows with docs and pricing one tap away", () => {
    expect(mobileMenu.map((e) => e.label)).toEqual(["Product", "Solutions", "Docs", "Pricing", "More"]);
    expect(mobileMenu.filter((e) => e.kind === "link").map((e) => e.label)).toEqual(["Docs", "Pricing"]);
  });

  it("marks the deepest link that contains the current page", () => {
    expect(currentHref("/docs/typescript")).toBe("/docs/typescript");
    expect(currentHref("/docs/getting-started")).toBe("/docs");
    expect(currentHref("/blog/some-post")).toBe("/blog");
    expect(currentHref("/docsearch")).toBeNull();
    expect(currentHref("/")).toBeNull();
  });

  it("finds the group that holds a link", () => {
    expect(groupOf("/changelog")).toBe("More");
    expect(groupOf("/use-cases/research")).toBe("Solutions");
    expect(groupOf("/pricing")).toBeNull();
  });
});
