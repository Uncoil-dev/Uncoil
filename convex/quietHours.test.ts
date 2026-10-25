import { expect, test } from "vitest";
import { inQuietHours, isValidTimezone } from "./quietHours";

const night = { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60, timezone: "UTC" };
const at = (iso: string) => Date.parse(iso);

test("a window that crosses midnight is quiet late evening and early morning only", () => {
  expect(inQuietHours(night, at("2026-10-25T23:30:00Z"))).toBe(true);
  expect(inQuietHours(night, at("2026-10-26T06:59:00Z"))).toBe(true);
  expect(inQuietHours(night, at("2026-10-26T07:00:00Z"))).toBe(false);
  expect(inQuietHours(night, at("2026-10-26T12:00:00Z"))).toBe(false);
  expect(inQuietHours(night, at("2026-10-25T22:00:00Z"))).toBe(true);
});

test("a same-day window and the off switch", () => {
  const lunch = { enabled: true, startMinute: 12 * 60, endMinute: 13 * 60, timezone: "UTC" };
  expect(inQuietHours(lunch, at("2026-10-25T12:30:00Z"))).toBe(true);
  expect(inQuietHours(lunch, at("2026-10-25T13:00:00Z"))).toBe(false);
  expect(inQuietHours({ ...night, enabled: false }, at("2026-10-25T23:30:00Z"))).toBe(false);
  expect(inQuietHours(null, Date.now())).toBe(false);
});

test("the window follows the project's time zone", () => {
  const berlin = { ...night, timezone: "Europe/Berlin" };
  // 21:30 UTC is 23:30 in Berlin in late October (CET, UTC+1 after the 25th, CEST before).
  expect(inQuietHours(berlin, at("2026-10-20T21:30:00Z"))).toBe(true);
  expect(inQuietHours(berlin, at("2026-10-20T19:30:00Z"))).toBe(false);
  expect(isValidTimezone("Europe/Berlin")).toBe(true);
  expect(isValidTimezone("Nowhere/Land")).toBe(false);
});
