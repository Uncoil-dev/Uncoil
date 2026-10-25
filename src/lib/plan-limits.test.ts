import assert from "node:assert/strict";
import test from "node:test";
import { enforcedSpanLimit, usageLevel, monthKey, planLimitMessage, secondsUntilNextMonth } from "./plan-limits.ts";

test("free stops at its limit, Pro and Team at their limit plus 10%", () => {
  assert.equal(enforcedSpanLimit("free"), 25_000);
  assert.equal(enforcedSpanLimit("pro"), 550_000);
  assert.equal(enforcedSpanLimit("team"), 2_200_000);
  for (const tier of ["enterprise", undefined, "unknown"]) assert.equal(enforcedSpanLimit(tier), null);
});

test("usage level walks ok, warn, over, blocked", () => {
  assert.equal(usageLevel(399_999, "pro"), "ok");
  assert.equal(usageLevel(400_000, "pro"), "warn");
  assert.equal(usageLevel(500_000, "pro"), "over");
  assert.equal(usageLevel(549_999, "pro"), "over");
  assert.equal(usageLevel(550_000, "pro"), "blocked");
  assert.equal(usageLevel(25_000, "free"), "blocked");
  assert.equal(usageLevel(9e9, "enterprise"), "ok");
});

test("month key uses UTC and pads the month", () => {
  assert.equal(monthKey(new Date("2026-01-31T23:59:59Z")), "2026-01");
  assert.equal(monthKey(new Date("2026-12-01T00:00:00Z")), "2026-12");
});

test("seconds until reset count to the first of next month, across year end", () => {
  assert.equal(secondsUntilNextMonth(new Date("2026-10-31T23:59:00Z")), 60);
  assert.equal(secondsUntilNextMonth(new Date("2026-12-31T23:00:00Z")), 3600);
  assert.equal(secondsUntilNextMonth(new Date("2026-10-01T00:00:00Z")), 31 * 86400);
});

test("message names the limit", () => {
  assert.match(planLimitMessage(25_000), /25,000 free spans/);
  assert.match(planLimitMessage(550_000, "pro"), /all 550,000 spans/);
});
