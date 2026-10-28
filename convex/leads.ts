import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const status = v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("closed"));

export const submit = mutation({
  args: {
    name: v.string(), email: v.string(), company: v.optional(v.string()), intent: v.string(),
    role: v.optional(v.string()), useCase: v.optional(v.string()), stack: v.optional(v.string()),
    message: v.optional(v.string()), preferredTime: v.optional(v.string()), marketingConsent: v.boolean(),
    sourcePath: v.string(), campaign: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.dedupeKey) {
      const existing = await ctx.db.query("leadIdempotency").withIndex("by_key", (q) => q.eq("key", args.dedupeKey!)).unique();
      if (existing && Date.now() - existing.createdAt < 10 * 60 * 1000) return existing.leadId;
    }
    const leadId = await ctx.db.insert("leadSubmissions", { ...args, status: "new", internalEmailStatus: "pending", acknowledgementEmailStatus: "pending", createdAt: Date.now() });
    if (args.dedupeKey) await ctx.db.insert("leadIdempotency", { key: args.dedupeKey, leadId, createdAt: Date.now() });
    return leadId;
  },
});

function isLeadAdmin(identity: { email?: string | null; subject: string }) {
  const emails = ((process.env.UNCOIL_LIBRARY_ADMIN_EMAILS ?? process.env.TRACIFY_LIBRARY_ADMIN_EMAILS) ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const ids = ((process.env.UNCOIL_ADMIN_USER_IDS ?? process.env.TRACIFY_ADMIN_USER_IDS) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return ids.includes(identity.subject) || (!!identity.email && emails.includes(identity.email.toLowerCase()));
}

export const list = query({
  args: { status: v.optional(status) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isLeadAdmin(identity)) throw new Error("Admin access required");
    const rows = args.status
      ? await ctx.db.query("leadSubmissions").withIndex("by_status", (q) => q.eq("status", args.status!)).order("desc").take(100)
      : await ctx.db.query("leadSubmissions").withIndex("by_createdAt").order("desc").take(100);
    return rows;
  },
});

export const updateStatus = mutation({
  args: { leadId: v.id("leadSubmissions"), status, assignedTo: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isLeadAdmin(identity)) throw new Error("Admin access required");
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    await ctx.db.patch(args.leadId, { status: args.status, assignedTo: args.assignedTo?.trim() || undefined });
  },
});

export const addNote = mutation({
  args: { leadId: v.id("leadSubmissions"), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isLeadAdmin(identity)) throw new Error("Admin access required");
    const body = args.body.trim();
    if (!body || body.length > 4000) throw new Error("Note must contain 1-4000 characters");
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    return ctx.db.insert("leadNotes", { leadId: args.leadId, author: identity.email ?? identity.subject, body, createdAt: Date.now() });
  },
});

export const recordDelivery = mutation({
  args: {
    deliverySecret: v.string(),
    leadId: v.id("leadSubmissions"),
    internalEmailStatus: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    acknowledgementEmailStatus: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    emailError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(process.env.UNCOIL_LEAD_DELIVERY_SECRET ?? process.env.TRACIFY_LEAD_DELIVERY_SECRET) || args.deliverySecret !== (process.env.UNCOIL_LEAD_DELIVERY_SECRET ?? process.env.TRACIFY_LEAD_DELIVERY_SECRET)) throw new Error("Invalid delivery secret");
    const { deliverySecret: _deliverySecret, leadId, ...delivery } = args;
    await ctx.db.patch(leadId, delivery);
  },
});

export const listNotes = query({
  args: { leadId: v.id("leadSubmissions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isLeadAdmin(identity)) throw new Error("Admin access required");
    return ctx.db.query("leadNotes").withIndex("by_leadId", (q) => q.eq("leadId", args.leadId)).order("desc").take(50);
  },
});
