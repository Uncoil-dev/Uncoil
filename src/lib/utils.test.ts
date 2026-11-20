import assert from "node:assert/strict";
import test from "node:test";
import { cn, formatCurrency, formatDuration, formatRelativeTime } from "./utils.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("cn joins class names and drops falsy values", () => {
  assert.equal(cn("a", false, null, undefined, "b"), "a b");
  assert.equal(cn("a", { b: true, c: false }), "a b");
  assert.equal(cn(["a", ["b"]], "c"), "a b c");
});

test("cn resolves conflicting tailwind classes in favor of the last one", () => {
  assert.equal(cn("p-2", "p-4"), "p-4");
  assert.equal(cn("text-sm text-red-500", "text-blue-500"), "text-sm text-blue-500");
});

test("formatCurrency always shows at least four decimal places in USD", () => {
  assert.equal(formatCurrency(0), "$0.0000");
  assert.equal(formatCurrency(1.5), "$1.5000");
  assert.equal(formatCurrency(0.00123), "$0.0012");
  assert.equal(formatCurrency(1234.56789), "$1,234.5679");
});

test("formatCurrency handles negative amounts", () => {
  assert.equal(formatCurrency(-2.5), "-$2.5000");
});

test("formatDuration uses milliseconds below one second", () => {
  assert.equal(formatDuration(0), "0ms");
  assert.equal(formatDuration(999), "999ms");
});

test("formatDuration uses seconds with one decimal from one second", () => {
  assert.equal(formatDuration(1000), "1.0s");
  assert.equal(formatDuration(1500), "1.5s");
  assert.equal(formatDuration(65_000), "65.0s");
});

test("formatRelativeTime reports recent times as just now", () => {
  assert.equal(formatRelativeTime(Date.now()), "just now");
  assert.equal(formatRelativeTime(Date.now() - 30_000), "just now");
});

test("formatRelativeTime reports minutes, hours and days", () => {
  assert.equal(formatRelativeTime(Date.now() - 5 * MINUTE - 1000), "5m ago");
  assert.equal(formatRelativeTime(Date.now() - 3 * HOUR - MINUTE), "3h ago");
  assert.equal(formatRelativeTime(Date.now() - 2 * DAY - HOUR), "2d ago");
  assert.equal(formatRelativeTime(Date.now() - 7 * DAY - HOUR), "7d ago");
});

test("formatRelativeTime accepts ISO strings", () => {
  const iso = new Date(Date.now() - 2 * HOUR - MINUTE).toISOString();
  assert.equal(formatRelativeTime(iso), "2h ago");
});

test("formatRelativeTime falls back to a locale date after a week", () => {
  const old = Date.now() - 30 * DAY;
  assert.equal(formatRelativeTime(old), new Date(old).toLocaleDateString());
});
