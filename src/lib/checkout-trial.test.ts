import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, checkoutPanelCopy, trialDaysFor, trialLine } from "./checkout-trial";

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

describe("checkoutPanelCopy", () => {
  const base = "/dashboard/p1";
  it("announces the trial with plan, day count and first charge date, and has no receipt line", () => {
    const copy = checkoutPanelCopy({ status: "trialing", planTier: "pro", periodEnd: Date.UTC(2026, 11, 4) }, base);
    expect(copy.heading).toBe("Your 7-day Pro trial is on");
    expect(copy.detail).toBe("Your first charge is on Dec 4, 2026. Cancel before then and you pay nothing.");
    expect([copy.heading, copy.detail, ...copy.steps.map((s) => s.body)].join(" ")).not.toMatch(/receipt|Payment received/i);
  });
  it("omits the charge date when it is unknown", () => {
    const copy = checkoutPanelCopy({ status: "trialing", planTier: "team", periodEnd: null }, base);
    expect(copy.heading).toBe("Your 7-day Team trial is on");
    expect(copy.detail).toBe("Cancel before the trial ends and you pay nothing.");
  });
  it("keeps the payment wording for an active paid subscription", () => {
    const copy = checkoutPanelCopy({ status: "active", planTier: "pro", periodEnd: null }, base);
    expect(copy.heading).toBe("Thank you. You're all set.");
    expect(copy.detail).toContain("receipt");
  });
  it("links next steps to alerts, runs (where Ask AI lives) and evaluation for the project", () => {
    for (const status of ["trialing", "active"]) {
      const copy = checkoutPanelCopy({ status, planTier: "pro", periodEnd: null }, base);
      expect(copy.steps.map((s) => s.href)).toEqual([`${base}/alerts`, `${base}/runs`, `${base}/evaluation`]);
    }
  });
});
