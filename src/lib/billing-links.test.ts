import assert from "node:assert/strict";
import test from "node:test";
import {
  pricingCheckoutHref,
  type BillingInterval,
  type PaidPlan,
} from "./billing-links.ts";

test("builds checkout links for each plan and interval", () => {
  assert.equal(
    pricingCheckoutHref("pro", "monthly"),
    "/pricing/checkout?plan=pro&interval=monthly",
  );
  assert.equal(
    pricingCheckoutHref("pro", "annual"),
    "/pricing/checkout?plan=pro&interval=annual",
  );
  assert.equal(
    pricingCheckoutHref("team", "monthly"),
    "/pricing/checkout?plan=team&interval=monthly",
  );
  assert.equal(
    pricingCheckoutHref("team", "annual"),
    "/pricing/checkout?plan=team&interval=annual",
  );
});

test("links are relative and round-trip through URLSearchParams", () => {
  const plans: PaidPlan[] = ["pro", "team"];
  const intervals: BillingInterval[] = ["monthly", "annual"];
  for (const plan of plans) {
    for (const interval of intervals) {
      const href = pricingCheckoutHref(plan, interval);
      assert.ok(href.startsWith("/pricing/checkout?"));
      const url = new URL(href, "https://example.test");
      assert.equal(url.pathname, "/pricing/checkout");
      assert.equal(url.searchParams.get("plan"), plan);
      assert.equal(url.searchParams.get("interval"), interval);
    }
  }
});
