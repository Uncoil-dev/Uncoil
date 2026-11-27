import { v } from "convex/values";
import {
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { savedViewQuery, savedViewColumns } from "../src/lib/saved-view-state";
const target = v.union(v.literal("traces"), v.literal("steps"));
const state = {
  name: v.string(),
  target,
  shared: v.boolean(),
  query: v.record(v.string(), v.string()),
  columns: v.array(v.string()),
};
const result = v.object({
  _id: v.id("savedViews"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  ownerId: v.string(),
  updatedAt: v.number(),
  editable: v.boolean(),
  ...state,
});
async function access(ctx: QueryCtx | MutationCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw Error("Unauthorized");
  const project = await ctx.db.get(projectId);
  const org = identity.orgId ?? identity.org_id;
  if (
    !project ||
    (project.clerkUserId !== identity.subject &&
      !(typeof org === "string" && org && project.clerkOrgId === org))
  )
    throw Error("Project not found or access denied");
  return identity.subject;
}
/** Like access, but for reads: returns null instead of throwing, so a query mounted on every dashboard page can't crash it. */
async function readAccess(ctx: QueryCtx, projectId: Id<"projects">) {
  try {
    return await access(ctx, projectId);
  } catch {
    return null;
  }
}
export const list = query({
  args: { projectId: v.id("projects") },
  returns: v.array(result),
  handler: async (ctx, { projectId }) => {
    const ownerId = await readAccess(ctx, projectId);
    if (!ownerId) return [];
    const [own, team] = await Promise.all([
      ctx.db
        .query("savedViews")
        .withIndex("by_projectId_and_ownerId", (q) =>
          q.eq("projectId", projectId).eq("ownerId", ownerId),
        )
        .take(100),
      ctx.db
        .query("savedViews")
        .withIndex("by_projectId_and_shared", (q) =>
          q.eq("projectId", projectId).eq("shared", true),
        )
        .take(200),
    ]);
    return [...new Map([...own, ...team].map((row) => [row._id, row])).values()]
      .map((row) => ({ ...row, editable: row.ownerId === ownerId }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
export const save = mutation({
  args: {
    projectId: v.id("projects"),
    id: v.optional(v.id("savedViews")),
    ...state,
  },
  returns: v.id("savedViews"),
  handler: async (ctx, args) => {
    const ownerId = await access(ctx, args.projectId);
    const name = args.name.trim();
    if (!name || name.length > 80)
      throw Error("Use a view name between 1 and 80 characters");
    if (Object.keys(args.query).length > 64 || JSON.stringify(args.query).length > 16000 || args.columns.length > 64)
      throw Error("View is too large");
    const value = {
      projectId: args.projectId,
      ownerId,
      name,
      target: args.target,
      shared: args.shared,
      query: savedViewQuery(args.query),
      columns: savedViewColumns(args.columns),
      updatedAt: Date.now(),
    };
    if (args.id) {
      const old = await ctx.db.get(args.id);
      if (!old || old.projectId !== args.projectId || old.ownerId !== ownerId)
        throw Error("Only the owner can update this view");
      await ctx.db.patch(args.id, value);
      return args.id;
    }
    const existing = await ctx.db
      .query("savedViews")
      .withIndex("by_projectId_and_ownerId", (q) =>
        q.eq("projectId", args.projectId).eq("ownerId", ownerId),
      )
      .take(100);
    if (existing.length >= 100)
      throw Error("You can save up to 100 views per project");
    return ctx.db.insert("savedViews", value);
  },
});
export const remove = mutation({
  args: { projectId: v.id("projects"), id: v.id("savedViews") },
  returns: v.null(),
  handler: async (ctx, { projectId, id }) => {
    const ownerId = await access(ctx, projectId);
    const row = await ctx.db.get(id);
    if (!row || row.projectId !== projectId || row.ownerId !== ownerId)
      throw Error("Only the owner can delete this view");
    await ctx.db.delete(id);
    return null;
  },
});
export const get = query({
  args: { projectId: v.id("projects"), id: v.id("savedViews") },
  returns: v.union(result, v.null()),
  handler: async (ctx, { projectId, id }) => {
    const ownerId = await readAccess(ctx, projectId);
    if (!ownerId) return null;
    const row = await ctx.db.get(id);
    if (
      !row ||
      row.projectId !== projectId ||
      (!row.shared && row.ownerId !== ownerId)
    )
      return null;
    return { ...row, editable: row.ownerId === ownerId };
  },
});
