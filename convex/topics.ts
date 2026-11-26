import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canAccessProject, canAdminProject } from "./projects";
import { isJobAuthorized } from "./retention";

const MAX_TOPICS = 200;
const MAX_RUNS = 200;

const mapFields = {
  filters: v.record(v.string(), v.string()),
  facets: v.array(v.string()),
  sampleRate: v.number(),
  status: v.union(
    v.literal("building"),
    v.literal("ready"),
    v.literal("failed"),
    v.literal("paused"),
  ),
  builtAt: v.number(),
  message: v.optional(v.string()),
  live: v.optional(v.boolean()),
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

async function canRead(ctx: QueryCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const project = await ctx.db.get(projectId);
  return !!project && canAccessProject(project, identity);
}

function findSummary(ctx: QueryCtx, projectId: Id<"projects">, runId: string) {
  return ctx.db
    .query("traceSummaries")
    .withIndex("by_projectId_and_runId", (q) =>
      q.eq("projectId", projectId).eq("runId", runId),
    )
    .unique();
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

// Refreshing a map spends the project's model budget, so it is limited to project administrators.
export const canRefresh = query({
  args: { projectId: v.id("projects") },
  returns: v.boolean(),
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const project = await ctx.db.get(projectId);
    return !!project && canAdminProject(project, identity);
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
      runIds
        .slice(0, MAX_RUNS)
        .map((runId) => findSummary(ctx, projectId, runId)),
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
      if (!(await findSummary(ctx, projectId, runId))) missing.push(runId);
    }
    return missing;
  },
});

async function writeMap(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  fields: Omit<Doc<"topicMaps">, "_id" | "_creationTime" | "projectId">,
) {
  const existing = await ctx.db
    .query("topicMaps")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .unique();
  if (existing) {
    await ctx.db.replace(existing._id, { projectId, ...fields });
    return existing._id;
  }
  return await ctx.db.insert("topicMaps", { projectId, ...fields });
}

export const saveMap = internalMutation({
  args: { projectId: v.id("projects"), ...mapFields },
  returns: v.id("topicMaps"),
  handler: async (ctx, { projectId, ...fields }) => writeMap(ctx, projectId, fields),
});

// Swaps the project's topics for a new set. Trace summaries are left untouched.
async function swapTopics(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  topics: Omit<Doc<"topics">, "_id" | "_creationTime" | "projectId">[],
) {
  const old = await ctx.db
    .query("topics")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .take(MAX_TOPICS);
  for (const row of old) await ctx.db.delete(row._id);
  for (const topic of topics.slice(0, MAX_TOPICS))
    await ctx.db.insert("topics", { projectId, ...topic });
}

export const replaceTopics = internalMutation({
  args: { projectId: v.id("projects"), topics: v.array(v.object(topicFields)) },
  returns: v.null(),
  handler: async (ctx, { projectId, topics }) => {
    await swapTopics(ctx, projectId, topics);
    return null;
  },
});

async function writeSummaries(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  summaries: Omit<Doc<"traceSummaries">, "_id" | "_creationTime" | "projectId">[],
) {
  for (const summary of summaries.slice(0, MAX_RUNS)) {
    const existing = await findSummary(ctx, projectId, summary.runId);
    if (existing) await ctx.db.patch(existing._id, summary);
    else await ctx.db.insert("traceSummaries", { projectId, ...summary });
  }
}

export const upsertSummaries = internalMutation({
  args: {
    projectId: v.id("projects"),
    summaries: v.array(v.object(summaryFields)),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, summaries }) => {
    await writeSummaries(ctx, projectId, summaries);
    return null;
  },
});

// The background build runs without a signed-in user, so these entry points are guarded by the shared job secret
// (the same one the daily retention job uses) and are meant to be called only from the web server.
function requireJob(jobSecret: string) {
  if (!isJobAuthorized(jobSecret)) throw new Error("Topic job unauthorized");
}

// Maps that rebuild every day. Paused maps stay paused until someone refreshes them.
export const jobListLiveMaps = query({
  args: { jobSecret: v.string() },
  returns: v.array(v.object({ projectId: v.id("projects"), filters: v.record(v.string(), v.string()) })),
  handler: async (ctx, { jobSecret }) => {
    requireJob(jobSecret);
    const maps = await ctx.db.query("topicMaps").take(500);
    return maps
      .filter((map) => map.live === true && map.status !== "paused")
      .map((map) => ({ projectId: map.projectId, filters: map.filters }));
  },
});

export const jobGetMap = query({
  args: { jobSecret: v.string(), projectId: v.id("projects") },
  returns: v.union(v.object({ _id: v.id("topicMaps"), _creationTime: v.number(), projectId: v.id("projects"), ...mapFields }), v.null()),
  handler: async (ctx, { jobSecret, projectId }) => {
    requireJob(jobSecret);
    return await ctx.db
      .query("topicMaps")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .unique();
  },
});

// The encrypted default model connection. Only the web server holds the key that opens it.
export const jobGetConnection = query({
  args: { jobSecret: v.string(), projectId: v.id("projects") },
  returns: v.union(
    v.object({ ciphertext: v.string(), baseUrl: v.string(), defaultModel: v.union(v.string(), v.null()), provider: v.string() }),
    v.null(),
  ),
  handler: async (ctx, { jobSecret, projectId }) => {
    requireJob(jobSecret);
    const rows = await ctx.db
      .query("llmConnections")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .take(10);
    const chosen = rows.find((row) => row.isDefault) ?? rows[0];
    return chosen
      ? { ciphertext: chosen.ciphertext, baseUrl: chosen.baseUrl, defaultModel: chosen.defaultModel ?? null, provider: chosen.provider }
      : null;
  },
});

export const jobMissingRunIds = query({
  args: { jobSecret: v.string(), projectId: v.id("projects"), runIds: v.array(v.string()) },
  returns: v.array(v.string()),
  handler: async (ctx, { jobSecret, projectId, runIds }) => {
    requireJob(jobSecret);
    const missing: string[] = [];
    for (const runId of new Set(runIds.slice(0, MAX_RUNS))) {
      if (!(await findSummary(ctx, projectId, runId))) missing.push(runId);
    }
    return missing;
  },
});

export const jobGetSummaries = query({
  args: { jobSecret: v.string(), projectId: v.id("projects"), runIds: v.array(v.string()) },
  returns: v.array(v.object(summaryFields)),
  handler: async (ctx, { jobSecret, projectId, runIds }) => {
    requireJob(jobSecret);
    const rows = await Promise.all(runIds.slice(0, MAX_RUNS).map((runId) => findSummary(ctx, projectId, runId)));
    return rows.filter((row) => row !== null).map(({ runId, intent, sentiment, outcome, issues }) => ({ runId, intent, sentiment, outcome, issues }));
  },
});

export const jobSaveSummaries = mutation({
  args: { jobSecret: v.string(), projectId: v.id("projects"), summaries: v.array(v.object(summaryFields)) },
  returns: v.null(),
  handler: async (ctx, { jobSecret, projectId, summaries }) => {
    requireJob(jobSecret);
    await writeSummaries(ctx, projectId, summaries);
    return null;
  },
});

export const jobSaveMap = mutation({
  args: { jobSecret: v.string(), projectId: v.id("projects"), ...mapFields },
  returns: v.null(),
  handler: async (ctx, { jobSecret, projectId, ...fields }) => {
    requireJob(jobSecret);
    await writeMap(ctx, projectId, fields);
    return null;
  },
});

export const jobReplaceTopics = mutation({
  args: { jobSecret: v.string(), projectId: v.id("projects"), topics: v.array(v.object(topicFields)) },
  returns: v.null(),
  handler: async (ctx, { jobSecret, projectId, topics }) => {
    requireJob(jobSecret);
    await swapTopics(ctx, projectId, topics);
    return null;
  },
});
