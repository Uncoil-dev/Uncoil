import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");

test("getMonthlyUsage only reports a trial for projects that never subscribed", async () => {
  const t = convexTest(schema, modules);
  const fresh = await t.run((ctx) => ctx.db.insert("projects", { name: "Fresh", clerkOrgId: "org", clerkUserId: "owner" }));
  const cancelled = await t.run((ctx) =>
    ctx.db.insert("projects", { name: "Cancelled", clerkOrgId: "org", clerkUserId: "owner", planTier: "free", stripeSubscriptionId: "sub_old" }),
  );
  const owner = t.withIdentity({ subject: "owner", orgId: "org" });
  expect((await owner.query(api.billing.getMonthlyUsage, { projectId: fresh }))?.trialAvailable).toBe(true);
  expect((await owner.query(api.billing.getMonthlyUsage, { projectId: cancelled }))?.trialAvailable).toBe(false);
});
