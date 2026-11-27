import { describe, expect, it } from "vitest";
import { landingPriceLabels } from "./pricing-section";

describe("landing pricing section", () => {
  it("shows the same whole-dollar prices as the pricing page", () => {
    expect(landingPriceLabels("monthly")).toEqual(["$0", "$19", "$39"]);
    expect(landingPriceLabels("annual")).toEqual(["$0", "$15", "$31"]);
  });
});
