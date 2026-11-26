import { v } from "convex/values";
import {
  query,
  internalQuery,
  internalMutation,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const MAX_TOPICS = 200;
const MAX_RUNS = 200;

const mapFields = {
  filters: v.record(v.string(), v.string()),
  facets: v.array(v.string()),
  sampleRate: v.number(),
  status: v.union(v.literal("building"), v.literal("ready"), v.literal("failed")),
  builtAt: v.number(),
};
const topicFields = {
  facet: v.string(),
  name: v.string(),
  description: v.string(),
  count: v.number(),
  share: v.number(),
  sampleRunIds: v.array(v.string()),
};
const summaryFields = {
  runId: v.string(),
  intent: v.string(),
  sentiment: v.string(),
  outcome: v.string(),
  issues: v.array(v.string()),
};
const topicRow = v.object({
  _id: v.id("topics"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  ...topicFields,
});

// True when the signed-in user owns the project or belongs to its organization.
async function canRead(ctx: QueryCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const project = await ctx.db.get(projectId);
  const org = identity.orgId ?? identity.org_id;
  return (
    !!project &&
    (project.clerkUserId === identity.subject ||
      (typeof org === "string" && !!org && project.clerkOrgId === org))
  );
}

export const getMap = query({
  args: { projectId: v.id("projects") },
  returns: v.union(
    v.object({
      _id: v.id("topicMaps"),
      _creationTime: v.number(),
      projectId: v.id("projects"),
      ...mapFields,
    }),
    v.null(),
  ),
  handler: async (ctx, { projectId }) => {
    if (!(await canRead(ctx, projectId))) return null;
    return await ctx.db
      .query("topicMaps")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .unique();
  },
});

export const listTopics = query({
  args: { projectId: v.id("projects") },
  returns: v.array(topicRow),
  handler: async (ctx, { projectId }) => {
    if (!(await canRead(ctx, projectId))) return [];
    return await ctx.db
      .query("topics")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .take(MAX_TOPICS);
  },
});

export const getSummaries = query({
  args: { projectId: v.id("projects"), runIds: v.array(v.string()) },
  returns: v.array(
    v.object({
      _id: v.id("traceSummaries"),
      _creationTime: v.number(),
      projectId: v.id("projects"),
      ...summaryFields,
    }),
  ),
  handler: async (ctx, { projectId, runIds }) => {
    if (!(await canRead(ctx, projectId))) return [];
    const rows = await Promise.all(
      runIds.slice(0, MAX_RUNS).map((runId) =>
        ctx.db
          .query("traceSummaries")
          .withIndex("by_projectId_and_runId", (q) =>
            q.eq("projectId", projectId).eq("runId", runId),
          )
          .unique(),
      ),
    );
    return rows.filter((row) => row !== null);
  },
});

// Run ids that still need a summary, so a rebuild only pays for new runs.
export const missingRunIds = internalQuery({
  args: { projectId: v.id("projects"), runIds: v.array(v.string()) },
  returns: v.array(v.string()),
  handler: async (ctx, { projectId, runIds }) => {
    const missing: string[] = [];
    for (const runId of new Set(runIds.slice(0, MAX_RUNS))) {
      const row = await ctx.db
        .query("traceSummaries")
        .withIndex("by_projectId_and_runId", (q) =>
          q.eq("projectId", projectId).eq("runId", runId),
        )
        .unique();
      if (!row) missing.push(runId);
    }
    return missing;
  },
});

export const saveMap = internalMutation({
  args: { projectId: v.id("projects"), ...mapFields },
  returns: v.id("topicMaps"),
  handler: async (ctx, { projectId, ...fields }) => {
    const existing = await ctx.db
      .query("topicMaps")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return await ctx.db.insert("topicMaps", { projectId, ...fields });
  },
});

// Swaps the project's topics for a new set. Trace summaries are left untouched.
export const replaceTopics = internalMutation({
  args: { projectId: v.id("projects"), topics: v.array(v.object(topicFields)) },
  returns: v.null(),
  handler: async (ctx, { projectId, topics }) => {
    const old = await ctx.db
      .query("topics")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .take(MAX_TOPICS);
    for (const row of old) await ctx.db.delete(row._id);
    for (const topic of topics.slice(0, MAX_TOPICS))
      await ctx.db.insert("topics", { projectId, ...topic });
    return null;
  },
});

export const upsertSummaries = internalMutation({
  args: {
    projectId: v.id("projects"),
    summaries: v.array(v.object(summaryFields)),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, summaries }) => {
    for (const summary of summaries) {
      const existing = await ctx.db
        .query("traceSummaries")
        .withIndex("by_projectId_and_runId", (q) =>
          q.eq("projectId", projectId).eq("runId", summary.runId),
        )
        .unique();
      if (existing) await ctx.db.patch(existing._id, summary);
      else await ctx.db.insert("traceSummaries", { projectId, ...summary });
    }
    return null;
  },
});
