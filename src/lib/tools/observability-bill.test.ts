import assert from "node:assert/strict";
import test from "node:test";
import { allBills, defaultBill, heliconeBill, langfuseOverage, langfuseBill, langsmithBill, spansFor, uncoilBill } from "./observability-bill.ts";

test("langfuse overage is graduated", () => {
  assert.equal(langfuseOverage(100_000), 0);
  assert.equal(langfuseOverage(200_000), 8);
  assert.equal(langfuseOverage(1_000_000), 72);
  assert.equal(langfuseOverage(2_000_000), 72 + 70);
  assert.equal(langfuseOverage(60_000_000), 72 + 630 + 2_600 + 600);
});

test("spans count the root plus every step", () => {
  assert.equal(spansFor({ ...defaultBill, runsPerMonth: 10, modelCallsPerRun: 2, toolCallsPerRun: 1 }), 40);
});

test("default traffic: Uncoil picks Pro, Langfuse adds units", () => {
  const u = uncoilBill(defaultBill);
  assert.equal(u.plan, "Pro");
  assert.equal(u.amount, 19);
  const l = langfuseBill(defaultBill); // 20k runs x 9 units = 180k units
  assert.equal(l.amount, 29 + 6.4);
});

test("members push Uncoil to the plan with enough seats", () => {
  assert.equal(uncoilBill({ ...defaultBill, members: 8 }).plan, "Team");
  assert.equal(uncoilBill({ ...defaultBill, members: 30 }).kind, "contact");
});

test("tiny traffic is free everywhere it should be", () => {
  const tiny = { ...defaultBill, runsPerMonth: 1_000, members: 1 };
  for (const row of allBills(tiny)) assert.equal(row.amount, 0, row.tool);
});

test("unpublished overage is never invented", () => {
  assert.equal(langsmithBill(defaultBill).kind, "from");
  assert.equal(langsmithBill(defaultBill).amount, 39 * 3);
  assert.equal(heliconeBill(defaultBill).kind, "from");
  assert.equal(heliconeBill(defaultBill).amount, 79);
});

test("junk input does not crash", () => {
  const rows = allBills({ runsPerMonth: NaN, modelCallsPerRun: -3, toolCallsPerRun: Infinity, members: 0, scoresPerRun: NaN });
  assert.equal(rows.length, 4);
});
