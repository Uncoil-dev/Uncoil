import { describe, expect, it } from "vitest";
import { CLASSIC_HOME_PATH, usesOverlayNav } from "./homepage";

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
