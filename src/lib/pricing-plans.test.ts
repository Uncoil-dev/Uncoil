import assert from "node:assert/strict";
import test from "node:test";

import {
  ANNUAL_DISCOUNT,
  formatPrice,
  monthlyPrice,
  planById,
  planForSpans,
  plans,
} from "./pricing-plans.ts";

test("plan ids are unique and free comes first at zero cost", () => {
  const ids = plans.map((plan) => plan.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ["free", "pro", "team"]);
  assert.equal(plans[0].monthly, 0);
});

test("prices and span limits increase with each tier", () => {
  for (let i = 1; i < plans.length; i++) {
    assert.ok(plans[i].monthly > plans[i - 1].monthly);
    assert.ok(plans[i].spanLimit > plans[i - 1].spanLimit);
  }
});

test("every plan has display text and features", () => {
  for (const plan of plans) {
    assert.ok(plan.name && plan.line && plan.retention);
    assert.ok(plan.features.length > 0);
    assert.ok(plan.spanLimit > 0);
  }
});

test("span label matches the numeric limit", () => {
  const expected: Record<string, number> = { "10k": 10_000, "500k": 500_000, "2m": 2_000_000 };
  for (const plan of plans) {
    assert.equal(expected[plan.spans], plan.spanLimit);
  }
});

test("monthlyPrice returns list price for monthly billing", () => {
  for (const plan of plans) {
    assert.equal(monthlyPrice(plan, "monthly"), plan.monthly);
  }
});

test("monthlyPrice applies the annual discount rounded down", () => {
  assert.equal(ANNUAL_DISCOUNT, 0.2);
  assert.equal(monthlyPrice(planById("free"), "annual"), 0);
  assert.equal(monthlyPrice(planById("pro"), "annual"), 15);
  assert.equal(monthlyPrice(planById("team"), "annual"), 31);
  for (const plan of plans) {
    assert.ok(monthlyPrice(plan, "annual") <= plan.monthly);
  }
});

test("formatPrice renders whole and fractional values", () => {
  assert.equal(formatPrice(0), "$0");
  assert.equal(formatPrice(19), "$19");
  assert.equal(formatPrice(15.5), "$15.50");
});

test("planById finds plans and falls back to pro", () => {
  assert.equal(planById("free").id, "free");
  assert.equal(planById("team").id, "team");
  assert.equal(planById("nope" as never).id, "pro");
});

test("planForSpans picks the smallest covering plan", () => {
  assert.equal(planForSpans(0)?.id, "free");
  assert.equal(planForSpans(10_000)?.id, "free");
  assert.equal(planForSpans(10_001)?.id, "pro");
  assert.equal(planForSpans(500_000)?.id, "pro");
  assert.equal(planForSpans(2_000_000)?.id, "team");
});

test("planForSpans returns null above the largest plan", () => {
  assert.equal(planForSpans(2_000_001), null);
});

test("example bills are priced from the plan list and each plan is the smallest that covers the usage", async () => {
  const { exampleBills } = await import("./pricing-examples.ts");
  const bills = exampleBills();
  assert.equal(bills.length, 3);
  for (const bill of bills) {
    assert.equal(bill.spans, bill.runs * bill.steps);
    assert.equal(bill.plan.id, planForSpans(bill.spans)?.id);
    assert.equal(bill.monthly, bill.plan.monthly);
    assert.equal(bill.annual, monthlyPrice(bill.plan, "annual"));
  }
  assert.deepEqual(bills.map((bill) => bill.plan.id), ["free", "pro", "team"]);
});

test("limit rows match what ingest enforces and how long the retention job keeps data", async () => {
  const { limitRows } = await import("./pricing-examples.ts");
  const { enforcedSpanLimit, dailySpanLimit } = await import("./plan-limits.ts");
  const { planRetentionDays } = await import("./retention.ts");
  const rows = limitRows();
  assert.deepEqual(rows.map((row) => row.plan.id), plans.map((plan) => plan.id));
  for (const row of rows) {
    assert.equal(row.included, row.plan.spanLimit);
    assert.equal(row.stopsAt, enforcedSpanLimit(row.plan.id));
    assert.equal(row.daily, dailySpanLimit(row.plan.id));
    assert.equal(row.retentionDays, planRetentionDays(row.plan.id));
    assert.equal(`${row.retentionDays} days`, row.plan.retention);
  }
});
