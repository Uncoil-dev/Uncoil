import { v } from "convex/values";
import { mutation } from "./_generated/server";

const MAX_LENGTH = 500;

/** Saves the optional "What do you want to fix with Uncoil?" answer. One answer per person; the first one stays. */
export const submit = mutation({
  args: { answer: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in first");
    const answer = args.answer.trim().slice(0, MAX_LENGTH);
    if (!answer) return null;
    const existing = await ctx.db
      .query("onboardingAnswers")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("onboardingAnswers", {
      userId: identity.subject,
      email: identity.email?.toLowerCase(),
      name: identity.name ?? undefined,
      answer,
      createdAt: Date.now(),
    });
  },
});
