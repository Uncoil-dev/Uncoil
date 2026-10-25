import assert from "node:assert/strict";
import test from "node:test";

import { plans } from "./pricing-plans.ts";
import { effectiveRetentionDays, groupProjectsByRetention, planRetentionDays } from "./retention.ts";

test("retention days match the pricing page", () => {
  for (const plan of plans) {
    assert.equal(`${planRetentionDays(plan.id)} days`, plan.retention);
  }
});

test("a missing tier counts as free, enterprise and unknown tiers have no plan limit", () => {
  assert.equal(planRetentionDays(undefined), 7);
  assert.equal(planRetentionDays("enterprise"), null);
  assert.equal(planRetentionDays("something-new"), null);
});

test("a project keeps the shorter of its plan and its own setting", () => {
  assert.equal(effectiveRetentionDays("free", 365), 7);
  assert.equal(effectiveRetentionDays("pro", undefined), 30);
  assert.equal(effectiveRetentionDays("team", 14), 14);
  assert.equal(effectiveRetentionDays("enterprise", undefined), null);
  assert.equal(effectiveRetentionDays("enterprise", 400), 400);
  assert.equal(effectiveRetentionDays("pro", 0), 30);
});

test("projects are grouped by days and unlimited ones are left out", () => {
  const groups = groupProjectsByRetention([
    { projectId: "a", planTier: "free" },
    { projectId: "b", planTier: "free", retentionDays: 365 },
    { projectId: "c", planTier: "pro" },
    { projectId: "d", planTier: "enterprise" },
  ]);
  assert.deepEqual([...groups.entries()], [[7, ["a", "b"]], [30, ["c"]]]);
});
