import assert from "node:assert/strict";
import test from "node:test";
import { trimOversizedSpan, dailySpanLimit, FREE_MAX_PROJECTS, ingestLimitPerMinute, secondsUntilNextDay, enforcedSpanLimit, usageLevel, monthKey, planLimitMessage, secondsUntilNextMonth, shouldWarnAboutUsage } from "./plan-limits.ts";

test("free stops at its limit, Pro and Team at their limit plus 10%", () => {
  assert.equal(enforcedSpanLimit("free"), 10_000);
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
  assert.equal(usageLevel(10_000, "free"), "blocked");
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
  assert.match(planLimitMessage(10_000), /10,000 free spans/);
  assert.match(planLimitMessage(550_000, "pro"), /all 550,000 spans/);
});

test("free is held to 2 projects, 300 requests a minute and a daily cap of 2,000 spans", () => {
  assert.equal(FREE_MAX_PROJECTS, 2);
  assert.equal(ingestLimitPerMinute("free", 6_000), 300);
  assert.equal(ingestLimitPerMinute(undefined, 6_000), 300);
  assert.equal(ingestLimitPerMinute("pro", 6_000), 6_000);
  assert.equal(dailySpanLimit("free"), 2_000);
  assert.equal(dailySpanLimit("pro"), null);
});

test("seconds until the next day count to UTC midnight", () => {
  assert.equal(secondsUntilNextDay(new Date("2026-10-31T23:59:00Z")), 60);
});

test("oversized Free spans are trimmed, not refused", () => {
  const big = "x".repeat(300_000);
  const { span, trimmed } = trimOversizedSpan<Record<string, unknown>>({ spanId: "s1", input: big, output: { text: big }, metadata: { a: 1 } });
  assert.equal(trimmed, true);
  assert.ok((span.input as string).length < 70_000);
  assert.match(span.output as string, /trimmed by Uncoil/);
  assert.equal((span.metadata as Record<string, unknown>).uncoilTrimmed, true);
  assert.equal((span.metadata as Record<string, unknown>).a, 1);
  const small = { spanId: "s2", input: "hi" };
  assert.equal(trimOversizedSpan(small).span, small);
});

test("usage warning is sent once a month, for Free only, from 80%", () => {
  assert.equal(shouldWarnAboutUsage(7_999, "free", undefined, "2026-11"), false);
  assert.equal(shouldWarnAboutUsage(8_000, "free", undefined, "2026-11"), true);
  assert.equal(shouldWarnAboutUsage(12_000, undefined, undefined, "2026-11"), true);
  assert.equal(shouldWarnAboutUsage(9_000, "free", "2026-11", "2026-11"), false);
  assert.equal(shouldWarnAboutUsage(9_000, "free", "2026-10", "2026-11"), true);
  assert.equal(shouldWarnAboutUsage(450_000, "pro", undefined, "2026-11"), false);
});

test("limit messages and responses point to the pricing page", () => {
  assert.match(planLimitMessage(10_000), /uncoil\.dev\/pricing/);
  assert.match(planLimitMessage(550_000, "pro"), /uncoil\.dev\/pricing/);
});
