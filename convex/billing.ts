import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canAccessProject } from "./projects";
import { trialDaysFor } from "../src/lib/checkout-trial";

function requireSyncSecret(value: string) {
  const expected = process.env.STRIPE_SYNC_SECRET;
  if (!expected || value !== expected) throw new Error("Invalid billing sync secret");
}

export const attachCustomer = mutation({
  args: { projectId: v.id("projects"), stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    const orgId = (identity as { orgId?: string; org_id?: string }).orgId ?? (identity as { org_id?: string }).org_id;
    if (!project || (project.clerkUserId !== identity.subject && project.clerkOrgId !== orgId)) {
      throw new Error("Project not found or access denied");
    }
    await ctx.db.patch(args.projectId, { stripeCustomerId: args.stripeCustomerId, updatedAt: Date.now() });
  },
});

export const syncSubscription = mutation({
  args: {
    syncSecret: v.string(),
    projectId: v.optional(v.id("projects")),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    planTier: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("team"))),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireSyncSecret(args.syncSecret);
    let project = args.projectId ? await ctx.db.get(args.projectId) : null;
    if (!project && args.stripeSubscriptionId) {
      project = await ctx.db.query("projects").withIndex("by_stripeSubscriptionId", q => q.eq("stripeSubscriptionId", args.stripeSubscriptionId)).unique();
    }
    if (!project) {
      project = await ctx.db.query("projects").withIndex("by_stripeCustomerId", q => q.eq("stripeCustomerId", args.stripeCustomerId)).unique();
    }
    if (!project) throw new Error("Billing project not found");

    const active = args.status && ["active", "trialing", "past_due"].includes(args.status);
    await ctx.db.patch(project._id, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeSubscriptionStatus: args.status,
      stripePriceId: args.stripePriceId,
      planTier: active ? (args.planTier ?? project.planTier ?? "free") : "free",
      subscriptionCurrentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      updatedAt: Date.now(),
    });
  },
});

const USAGE_RUN_SCAN_LIMIT = 20_000;

/** Spans saved this calendar month (UTC), used for plan-limit meters and upgrade prompts. */
export const getMonthlyUsage = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const runs = await ctx.db
      .query("agentRuns")
      .withIndex("by_projectId_createdAt", (q) => q.eq("projectId", projectId).gte("createdAt", monthStart))
      .take(USAGE_RUN_SCAN_LIMIT + 1);
    const truncated = runs.length > USAGE_RUN_SCAN_LIMIT;
    const spans = runs.slice(0, USAGE_RUN_SCAN_LIMIT).reduce((sum, run) => sum + run.spanCount, 0);
    return { spans, truncated, planTier: project.planTier ?? "free", trialAvailable: trialDaysFor(project) > 0 };
  },
});
