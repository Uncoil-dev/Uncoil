import assert from "node:assert/strict";
import test from "node:test";
import {
  initialCheckoutProjectId,
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

test("adds the current project to the checkout link", () => {
  assert.equal(
    pricingCheckoutHref("pro", "monthly", "abc123"),
    "/pricing/checkout?plan=pro&interval=monthly&project=abc123",
  );
  assert.equal(
    pricingCheckoutHref("team", "annual", "a b&c"),
    "/pricing/checkout?plan=team&interval=annual&project=a%20b%26c",
  );
  assert.equal(
    pricingCheckoutHref("pro", "monthly", ""),
    "/pricing/checkout?plan=pro&interval=monthly",
  );
});

test("preselects the requested project only when the user owns it", () => {
  const projects = [{ _id: "p1" }, { _id: "p2" }];
  assert.equal(initialCheckoutProjectId("p2", projects), "p2");
  assert.equal(initialCheckoutProjectId("other", projects), "p1");
  assert.equal(initialCheckoutProjectId(null, projects), "p1");
  assert.equal(initialCheckoutProjectId("p2", undefined), "");
  assert.equal(initialCheckoutProjectId("p2", []), "");
});
