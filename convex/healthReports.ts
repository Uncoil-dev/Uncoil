import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireSyncSecret(value: string) {
  const expected = process.env.STRIPE_SYNC_SECRET;
  if (!expected || value !== expected) throw new Error("Invalid billing sync secret");
}

/** Called by the Next.js server after it checked the Stripe payment. A second upload for the same payment replaces the report and keeps the link. */
export const saveReport = mutation({
  args: { syncSecret: v.string(), stripeSessionId: v.string(), token: v.string(), email: v.optional(v.string()), reportJson: v.string() },
  handler: async (ctx, args) => {
    requireSyncSecret(args.syncSecret);
    const now = Date.now();
    const existing = await ctx.db.query("healthReports").withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { reportJson: args.reportJson, email: args.email ?? existing.email, updatedAt: now });
      return { token: existing.token };
    }
    await ctx.db.insert("healthReports", { token: args.token, stripeSessionId: args.stripeSessionId, email: args.email, reportJson: args.reportJson, createdAt: now, updatedAt: now });
    return { token: args.token };
  },
});

/** The link is the key: the token is long and random, and the report holds only totals, never prompts or outputs. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("healthReports").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    return row ? { reportJson: row.reportJson, createdAt: row.createdAt } : null;
  },
});
