import { mutation } from "./_generated/server";
import { authComponent } from "./betterAuth/auth";

/** Only accounts created in the last two hours get a welcome, so signing in later never triggers one. */
export const WELCOME_WINDOW_MS = 2 * 60 * 60_000;

export function isNewAccount(createdAt: number, now: number) {
  return now - createdAt >= 0 && now - createdAt < WELCOME_WINDOW_MS;
}

/** Called by the signed-in browser after sign-up. Returns who to welcome, once per email address, or null. */
export const claim = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email?.trim().toLowerCase();
    if (!identity || !email) return null;
    const user = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!user || !isNewAccount(user.createdAt, Date.now())) return null;
    const existing = await ctx.db.query("welcomeEmails").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (existing) return null;
    await ctx.db.insert("welcomeEmails", { email, sentAt: Date.now() });
    return { email, name: identity.name ?? user.name ?? "" };
  },
});

/** Frees the claim when the send failed, so the next sign-in page load can try again. */
export const release = mutation({
  args: {},
  handler: async (ctx) => {
    const email = (await ctx.auth.getUserIdentity())?.email?.trim().toLowerCase();
    if (!email) return;
    const existing = await ctx.db.query("welcomeEmails").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
