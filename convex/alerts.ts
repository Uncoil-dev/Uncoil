import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

function getOrgId(identity: unknown) {
  const orgId = (identity as { orgId?: unknown; org_id?: unknown }).orgId ??
    (identity as { org_id?: unknown }).org_id;
  return typeof orgId === "string" && orgId.length > 0
    ? orgId
    : undefined;
}

export function canAccessProject(
  project: Doc<"projects">,
  identity: { subject: string; tokenIdentifier: string },
) {
  const clerkOrgId = getOrgId(identity);
  if (clerkOrgId && project.clerkOrgId === clerkOrgId) return true;
  return project.clerkUserId === identity.subject;
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    runId: v.string(),
    type: v.string(),
    message: v.string(),
    triggeredAt: v.string(),
    state: v.optional(v.union(v.literal("active"), v.literal("resolved"), v.literal("muted"))),
    // Only used for the Discord message; not stored on the alert.
    failingStep: v.optional(v.string()),
  },
  handler: async (ctx, { failingStep, ...args }) => {
    const existing = await ctx.db
      .query("alerts")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(100);

    const duplicate = existing.find(
      (alert) => alert.runId === args.runId && alert.type === args.type,
    );

    if (duplicate) {
      return duplicate._id;
    }

    const alertId = await ctx.db.insert("alerts", { ...args, state: args.state ?? "active" });

    // Only a newly recorded alert is delivered, so a run that raises several error spans posts once.
    const project = await ctx.db.get(args.projectId);
    if (project?.discordWebhookUrl) {
      await ctx.scheduler.runAfter(0, internal.discordAlerts.deliver, {
        projectId: args.projectId,
        runId: args.runId,
        type: args.type,
        message: args.message,
        failingStep,
      });
    }
    return alertId;
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return [];

    return await ctx.db
      .query("alerts")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(50);
  },
});

export const markAllRead = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { updated: 0 };

    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) {
      return { updated: 0 };
    }

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(200);

    const now = Date.now();
    let updated = 0;

    for (const alert of alerts) {
      if (alert.readAt === undefined) {
        await ctx.db.patch(alert._id, { readAt: now });
        updated += 1;
      }
    }

    return { updated };
  },
});

export const markRead = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, { alertId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { updated: false };

    const alert = await ctx.db.get(alertId);
    if (!alert) return { updated: false };

    const project = await ctx.db.get(alert.projectId);
    if (!project || !canAccessProject(project, identity)) {
      return { updated: false };
    }

    if (alert.readAt === undefined) {
      await ctx.db.patch(alertId, { readAt: Date.now() });
      return { updated: true };
    }

    return { updated: false };
  },
});

export const updateState = mutation({
  args: {
    alertId: v.id("alerts"),
    state: v.union(v.literal("active"), v.literal("resolved"), v.literal("muted")),
  },
  handler: async (ctx, { alertId, state }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { updated: false };
    const alert = await ctx.db.get(alertId);
    if (!alert) return { updated: false };
    const project = await ctx.db.get(alert.projectId);
    if (!project || !canAccessProject(project, identity)) return { updated: false };
    await ctx.db.patch(alertId, { state });
    return { updated: true };
  },
});
