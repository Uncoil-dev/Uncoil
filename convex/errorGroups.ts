import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

function orgOf(identity: unknown) {
  const id = identity as { orgId?: unknown; org_id?: unknown };
  const orgId = id.orgId ?? id.org_id;
  return typeof orgId === "string" && orgId.length > 0 ? orgId : undefined;
}

function roleOf(identity: unknown) {
  const id = identity as { orgRole?: unknown; org_role?: unknown };
  const role = id.orgRole ?? id.org_role;
  return typeof role === "string" ? role : undefined;
}

function isMember(project: Doc<"projects">, identity: { subject: string }) {
  const orgId = orgOf(identity);
  return (orgId !== undefined && project.clerkOrgId === orgId) || project.clerkUserId === identity.subject;
}

/** Viewers can read but not change; owners and non-viewer org members can resolve. */
function canResolve(project: Doc<"projects">, identity: { subject: string }) {
  if (project.clerkUserId === identity.subject) return true;
  const role = roleOf(identity);
  return isMember(project, identity) && role !== "viewer" && role !== "org:viewer";
}

/** Resolve time in ms for every resolved error group signature of a project; empty for non-members. */
export const listResolved = query({
  args: { projectId: v.id("projects") },
  returns: v.record(v.string(), v.number()),
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const project = identity ? await ctx.db.get(projectId) : null;
    if (!identity || !project || !isMember(project, identity)) return {};
    const rows = await ctx.db
      .query("resolvedErrorGroups")
      .withIndex("by_projectId_and_signature", (q) => q.eq("projectId", projectId))
      // Bounded read; only this many resolved groups per project are honored.
      .take(1000);
    return Object.fromEntries(rows.map((row) => [row.signature, row.resolvedAt]));
  },
});

/** Marks a group resolved now. Resolving again moves the time forward. Nothing is deleted. */
export const resolve = mutation({
  args: { projectId: v.id("projects"), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, { projectId, signature }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const project = await ctx.db.get(projectId);
    if (!project || !isMember(project, identity)) throw new Error("Project not found or access denied");
    if (!canResolve(project, identity)) throw new Error("Developer access required");
    if (signature.length === 0 || signature.length > 64) throw new Error("Invalid error group");
    const existing = await ctx.db
      .query("resolvedErrorGroups")
      .withIndex("by_projectId_and_signature", (q) => q.eq("projectId", projectId).eq("signature", signature))
      .unique();
    const fields = { resolvedAt: Date.now(), resolvedBy: identity.subject };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("resolvedErrorGroups", { projectId, signature, ...fields });
    return null;
  },
});
