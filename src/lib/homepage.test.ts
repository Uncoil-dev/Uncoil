import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLASSIC_HOME_PATH, HOME_DESIGN, usesOverlayNav } from "./homepage";

describe("homepage nav layout", () => {
  it("puts the current homepage under the solid nav and keeps the classic one under the see-through nav", () => {
    expect(usesOverlayNav("/", "current")).toBe(false);
    expect(usesOverlayNav(CLASSIC_HOME_PATH, "current")).toBe(true);
    expect(usesOverlayNav("/pricing", "current")).toBe(false);
  });

  it("moves the see-through nav back to the site root when the classic design is switched back on", () => {
    expect(usesOverlayNav("/", "classic")).toBe(true);
    expect(usesOverlayNav(CLASSIC_HOME_PATH, "classic")).toBe(true);
  });
});

describe("homepage switch", () => {
  it("renders the design HOME_DESIGN names at the site root, so the nav matches the page", () => {
    const page = readFileSync(new URL("../app/(frontend)/page.tsx", import.meta.url), "utf8");
    const imports = [...page.matchAll(/^import .* from "@\/components\/marketing\/(home\/home-page|landing\/landing-page)";$/gm)].map((m) => m[1]);
    expect(imports).toEqual([HOME_DESIGN === "classic" ? "landing/landing-page" : "home/home-page"]);
  });
});
