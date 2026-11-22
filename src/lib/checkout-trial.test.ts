import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, trialDaysFor } from "./checkout-trial";

describe("trialDaysFor", () => {
  it("gives the trial to guest checkouts and projects that never subscribed", () => {
    expect(trialDaysFor(null)).toBe(TRIAL_DAYS);
    expect(trialDaysFor({ stripeSubscriptionId: undefined })).toBe(TRIAL_DAYS);
  });
  it("gives no second trial after a cancelled subscription", () => {
    expect(trialDaysFor({ stripeSubscriptionId: "sub_old" })).toBe(0);
  });
});
