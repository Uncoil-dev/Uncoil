import { describe, expect, it } from "vitest";
import { spendDetail } from "./overview-metrics";

describe("spendDetail", () => {
  it("names the window the spend covers instead of claiming a saving", () => {
    expect(spendDetail(30, false)).toBe("Last 30 days");
    expect(spendDetail(7, false)).not.toMatch(/save/i);
  });

  it("says when the figure comes from the saved summary", () => {
    expect(spendDetail(30, true)).toBe("Saved summary");
  });
});
