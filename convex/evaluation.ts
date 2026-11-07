import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { checkValue } from "./scoreConfigRules";

function getOrgId(identity: unknown) {
  const value = (identity as { orgId?: unknown; org_id?: unknown }).orgId ?? (identity as { org_id?: unknown }).org_id;
  return typeof value === "string" && value ? value : undefined;
}
function canAccess(project: Doc<"projects">, identity: { subject: string; tokenIdentifier: string }) {
  const orgId = getOrgId(identity);
  return Boolean(orgId && project.clerkOrgId === orgId) || project.clerkUserId === identity.subject;
}
function canAccessDataset(dataset: Doc<"datasets">, identity: { subject: string }) {
  return dataset.access !== "restricted" || dataset.createdBy === identity.subject || Boolean(dataset.allowedUserIds?.includes(identity.subject));
}
// Convex's generated context types are intentionally shared across legacy and current functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireProject(ctx: any, projectId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const project = await ctx.db.get(projectId);
  if (!project || !canAccess(project, identity)) throw new Error("Project not found or access denied");
  return { identity, project };
}

export const listDatasets = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return [];
    const datasets = await ctx.db.query("datasets").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").collect();
    return Promise.all(datasets.filter((dataset) => canAccessDataset(dataset, identity)).map(async (dataset) => ({ ...dataset, items: await ctx.db.query("datasetItems").withIndex("by_datasetId", (q) => q.eq("datasetId", dataset._id)).order("desc").take(100) })));
  },
});

export const createDataset = mutation({
  args: { projectId: v.id("projects"), name: v.string(), description: v.optional(v.string()), access: v.optional(v.union(v.literal("project"), v.literal("restricted"))) },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const name = args.name.trim();
    if (!name) throw new Error("Dataset name is required");
    const duplicate = await ctx.db.query("datasets").withIndex("by_projectId_and_name", (q) => q.eq("projectId", args.projectId).eq("name", name)).first();
    if (duplicate) throw new Error("A dataset with this name already exists");
    const now = Date.now();
    return ctx.db.insert("datasets", { projectId: args.projectId, name, description: args.description?.trim() || undefined, access: args.access ?? "project", allowedUserIds: args.access === "restricted" ? [identity.subject] : undefined, version: 1, createdBy: identity.subject, createdAt: now, updatedAt: now });
  },
});

export const addDatasetItem = mutation({
  args: { projectId: v.id("projects"), datasetId: v.id("datasets"), input: v.string(), expectedOutput: v.optional(v.string()), metadata: v.optional(v.any()) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.projectId !== args.projectId || !canAccessDataset(dataset, (await requireProject(ctx, args.projectId)).identity)) throw new Error("Dataset not found or access denied");
    const input = args.input.trim();
    if (!input) throw new Error("Dataset input is required");
    await ctx.db.patch(args.datasetId, { updatedAt: Date.now(), version: (dataset.version ?? 1) + 1 });
    return ctx.db.insert("datasetItems", { projectId: args.projectId, datasetId: args.datasetId, input, expectedOutput: args.expectedOutput?.trim() || undefined, metadata: args.metadata, createdAt: Date.now() });
  },
});

export const promoteTraceToDataset = mutation({
  args: { projectId: v.id("projects"), datasetId: v.id("datasets"), traceId: v.string(), input: v.string(), expectedOutput: v.optional(v.string()), metadata: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.projectId !== args.projectId || !canAccessDataset(dataset, identity)) throw new Error("Dataset not found or access denied");
    if (!args.input.trim() || !args.traceId.trim()) throw new Error("Trace and input are required");
    const existing = await ctx.db.query("datasetItems").withIndex("by_datasetId", (q) => q.eq("datasetId", args.datasetId)).filter((q) => q.eq(q.field("traceId"), args.traceId.trim())).first();
    if (existing) return existing._id;
    await ctx.db.patch(args.datasetId, { updatedAt: Date.now(), version: (dataset.version ?? 1) + 1 });
    return ctx.db.insert("datasetItems", { projectId: args.projectId, datasetId: args.datasetId, traceId: args.traceId.trim(), input: args.input.trim(), expectedOutput: args.expectedOutput?.trim() || undefined, metadata: args.metadata, createdAt: Date.now() });
  },
});

export const updateDataset = mutation({
  args: { projectId: v.id("projects"), datasetId: v.id("datasets"), name: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.projectId !== args.projectId || !canAccessDataset(dataset, (await requireProject(ctx, args.projectId)).identity)) throw new Error("Dataset not found or access denied");
    const name = args.name?.trim();
      await ctx.db.patch(args.datasetId, { name: name || dataset.name, description: args.description?.trim() || dataset.description, updatedAt: Date.now(), version: (dataset.version ?? 1) + 1 });
  },
});

export const importItems = mutation({
  args: { projectId: v.id("projects"), datasetId: v.id("datasets"), items: v.array(v.object({ input: v.string(), expectedOutput: v.optional(v.string()), metadata: v.optional(v.any()) })) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.projectId !== args.projectId || !canAccessDataset(dataset, (await requireProject(ctx, args.projectId)).identity)) throw new Error("Dataset not found or access denied");
    const validItems = args.items.filter((item) => item.input.trim());
    for (const item of validItems) await ctx.db.insert("datasetItems", { projectId: args.projectId, datasetId: args.datasetId, input: item.input.trim(), expectedOutput: item.expectedOutput?.trim() || undefined, metadata: item.metadata, createdAt: Date.now() });
    await ctx.db.patch(args.datasetId, { updatedAt: Date.now(), version: (dataset.version ?? 1) + 1 });
    return { imported: validItems.length, skipped: args.items.length - validItems.length };
  },
});

export const setDatasetAccess = mutation({
  args: { projectId: v.id("projects"), datasetId: v.id("datasets"), access: v.union(v.literal("project"), v.literal("restricted")), allowedUserIds: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.projectId !== args.projectId || dataset.createdBy !== identity.subject) throw new Error("Only the dataset owner can change access");
    const allowed = [...new Set([identity.subject, ...(args.allowedUserIds ?? [])].map((id) => id.trim()).filter(Boolean))];
    await ctx.db.patch(args.datasetId, { access: args.access, allowedUserIds: args.access === "restricted" ? allowed : undefined, updatedAt: Date.now(), version: (dataset.version ?? 1) + 1 });
  },
});

const MAX_SCORES_SHOWN = 1000;

export const listScores = query({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, { projectId, limit }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return [];
    const count = Math.min(Math.max(Math.floor(limit ?? 100), 1), MAX_SCORES_SHOWN);
    return ctx.db.query("scores").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(count);
  },
});

export const scoreMetrics = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return [];

    const scores = await ctx.db
      .query("scores")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(1000);
    const grouped = new Map<string, { name: string; count: number; numericTotal: number; numericCount: number; booleanTrue: number; booleanCount: number; latestAt: number; sources: Set<string> }>();
    for (const score of scores) {
      const current = grouped.get(score.name) ?? { name: score.name, count: 0, numericTotal: 0, numericCount: 0, booleanTrue: 0, booleanCount: 0, latestAt: score.createdAt, sources: new Set<string>() };
      current.count += 1;
      current.latestAt = Math.max(current.latestAt, score.createdAt);
      current.sources.add(score.source);
      if (score.dataType === "numeric" && typeof score.value === "number") {
        current.numericTotal += score.value;
        current.numericCount += 1;
      }
      if (score.dataType === "boolean" && typeof score.value === "boolean") {
        current.booleanCount += 1;
        if (score.value) current.booleanTrue += 1;
      }
      grouped.set(score.name, current);
    }
    return [...grouped.values()]
      .map((metric) => ({
        name: metric.name,
        count: metric.count,
        average: metric.numericCount ? metric.numericTotal / metric.numericCount : null,
        passRate: metric.booleanCount ? metric.booleanTrue / metric.booleanCount : null,
        latestAt: metric.latestAt,
        sources: [...metric.sources].sort(),
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  },
});

export const createScore = mutation({
  args: {
    projectId: v.id("projects"),
    traceId: v.optional(v.string()),
    spanId: v.optional(v.string()),
    name: v.string(),
    value: v.union(v.number(), v.boolean(), v.string()),
    dataType: v.union(v.literal("numeric"), v.literal("boolean"), v.literal("categorical"), v.literal("text")),
    source: v.union(v.literal("human"), v.literal("llm"), v.literal("code"), v.literal("user")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const name = args.name.trim();
    const traceId = args.traceId?.trim() || undefined;
    const spanId = args.spanId?.trim() || undefined;
    if (!traceId && !spanId) throw new Error("Attach the score to a trace or span");
    if (!name) throw new Error("Score name is required");
    if (name.length > 100) throw new Error("A score name can be at most 100 characters");
    if ((traceId?.length ?? 0) > 200 || (spanId?.length ?? 0) > 200) throw new Error("That trace or span id is too long");
    if ((args.comment?.length ?? 0) > 4000) throw new Error("The comment is too long");
    if (args.dataType === "numeric" && (typeof args.value !== "number" || !Number.isFinite(args.value))) throw new Error("A numeric score needs a number");
    if (args.dataType === "boolean" && typeof args.value !== "boolean") throw new Error("A boolean score is true or false");
    if ((args.dataType === "categorical" || args.dataType === "text") && (typeof args.value !== "string" || !args.value.trim() || args.value.length > 1000)) throw new Error("A text or category score needs a value of up to 1,000 characters");
    const definition = await ctx.db.query("scoreConfigs").withIndex("by_projectId_and_name", (q) => q.eq("projectId", args.projectId).eq("name", name)).unique();
    if (definition) {
      const problem = checkValue(definition, args.dataType, args.value);
      if (problem) throw new Error(problem);
    }
    return ctx.db.insert("scores", { ...args, name, traceId, spanId, comment: args.comment?.trim() || undefined, createdBy: identity.subject, createdAt: Date.now() });
  },
});

const FEEDBACK_SCORE = "feedback";
const MAX_FEEDBACK_TRACES = 200;

/** The signed-in person's thumbs up (true) or down (false) for each of the given traces. */
export const myFeedback = query({
  args: { projectId: v.id("projects"), traceIds: v.array(v.string()) },
  handler: async (ctx, { projectId, traceIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return {};
    const result: Record<string, boolean> = {};
    for (const traceId of traceIds.slice(0, MAX_FEEDBACK_TRACES)) {
      const scores = await ctx.db
        .query("scores")
        .withIndex("by_projectId_and_traceId", (q) => q.eq("projectId", projectId).eq("traceId", traceId))
        .order("desc")
        .take(50);
      const mine = scores.find((score) => score.name === FEEDBACK_SCORE && !score.spanId && score.createdBy === identity.subject && typeof score.value === "boolean");
      if (mine) result[traceId] = mine.value as boolean;
    }
    return result;
  },
});

/** One tap: save a yes/no score on a run. The value `null` removes the person's score again (undo). */
export const setFeedback = mutation({
  args: { projectId: v.id("projects"), traceId: v.string(), value: v.union(v.boolean(), v.null()) },
  handler: async (ctx, { projectId, traceId, value }) => {
    const { identity } = await requireProject(ctx, projectId);
    const id = traceId.trim();
    if (!id || id.length > 200) throw new Error("That trace id is not valid");
    const existing = (
      await ctx.db
        .query("scores")
        .withIndex("by_projectId_and_traceId", (q) => q.eq("projectId", projectId).eq("traceId", id))
        .take(200)
    ).filter((score) => score.name === FEEDBACK_SCORE && !score.spanId && score.createdBy === identity.subject);
    for (const score of existing) await ctx.db.delete(score._id);
    if (value === null) return null;
    return ctx.db.insert("scores", {
      projectId, traceId: id, name: FEEDBACK_SCORE, value, dataType: "boolean", source: "human", createdBy: identity.subject, createdAt: Date.now(),
    });
  },
});
