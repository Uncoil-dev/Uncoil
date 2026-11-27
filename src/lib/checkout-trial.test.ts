import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, trialDaysFor, trialLine } from "./checkout-trial";

describe("trialDaysFor", () => {
  it("gives the trial to guest checkouts and projects that never subscribed", () => {
    expect(trialDaysFor(null)).toBe(TRIAL_DAYS);
    expect(trialDaysFor({ stripeSubscriptionId: undefined })).toBe(TRIAL_DAYS);
  });
  it("gives no second trial after a cancelled subscription", () => {
    expect(trialDaysFor({ stripeSubscriptionId: "sub_old" })).toBe(0);
  });
});

describe("trialLine", () => {
  it("states the trial length from TRIAL_DAYS and that it is once per project", () => {
    expect(trialLine()).toBe(`${TRIAL_DAYS} days free, once per project`);
  });
});
