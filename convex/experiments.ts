import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

function orgId(identity: unknown) {
  const value = (identity as { orgId?: unknown; org_id?: unknown }).orgId ?? (identity as { org_id?: unknown }).org_id;
  return typeof value === "string" && value ? value : undefined;
}
function canAccess(project: Doc<"projects">, identity: { subject: string; tokenIdentifier: string }) {
  const id = orgId(identity);
  return Boolean(id && project.clerkOrgId === id) || project.clerkUserId === identity.subject;
}
function canAccessDataset(dataset: Doc<"datasets">, identity: { subject: string }) {
  return dataset.access !== "restricted" || dataset.createdBy === identity.subject || Boolean(dataset.allowedUserIds?.includes(identity.subject));
}
// Convex's generated context types are shared with the legacy experiment functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireProject(ctx: any, projectId: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const project = await ctx.db.get(projectId);
  if (!project || !canAccess(project, identity)) throw new Error("Project not found or access denied");
  return { identity, project };
}

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const project = await ctx.db.get(projectId);
    if (!project || !canAccess(project, identity)) return [];
    const experiments = await ctx.db.query("experiments").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(100);
    const visible = [];
    for (const experiment of experiments) {
      const dataset = await ctx.db.get(experiment.datasetId);
      if (dataset && canAccessDataset(dataset, identity)) visible.push(experiment);
    }
    const summaries = await Promise.all(visible.map(async (experiment) => {
      const results = await ctx.db.query("experimentResults").withIndex("by_experimentId", (q) => q.eq("experimentId", experiment._id)).take(1000);
      const scored = results.filter((result) => typeof result.score === "number");
      return { ...experiment, results, resultCount: results.length, avgScore: scored.length ? scored.reduce((sum, result) => sum + (result.score ?? 0), 0) / scored.length : null, totalCostUsd: results.reduce((sum, result) => sum + (result.costUsd ?? 0), 0), avgLatencyMs: results.length ? results.reduce((sum, result) => sum + (result.latencyMs ?? 0), 0) / results.length : null };
    }));
    return summaries.map((summary, index) => {
      const previous = summaries.slice(index + 1).find((candidate) => candidate.datasetId === summary.datasetId);
      const scoreDelta = summary.avgScore !== null && previous?.avgScore !== null && previous?.avgScore !== undefined ? summary.avgScore - previous.avgScore : null;
      return { ...summary, scoreDelta, comparisonExperimentId: previous?._id ?? null, comparisonName: previous?.name ?? null };
    });
  },
});

export const get = query({
  args: { projectId: v.id("projects"), experimentId: v.id("experiments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccess(project, identity)) return null;
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment || experiment.projectId !== args.projectId) return null;
    const dataset = await ctx.db.get(experiment.datasetId);
    if (!dataset || !canAccessDataset(dataset, identity)) return null;
    const items = await ctx.db.query("datasetItems").withIndex("by_datasetId", (q) => q.eq("datasetId", experiment.datasetId)).order("asc").take(1000);
    const promptVersion = experiment.promptVersionId ? await ctx.db.get(experiment.promptVersionId) : null;
    return { experiment, items, promptVersion };
  },
});

export const create = mutation({
  args: { projectId: v.id("projects"), datasetId: v.id("datasets"), promptId: v.optional(v.id("prompts")), promptVersionId: v.optional(v.id("promptVersions")), suiteId: v.optional(v.id("evaluationSuites")), name: v.string(), model: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.projectId !== args.projectId || !canAccessDataset(dataset, identity)) throw new Error("Dataset not found or access denied");
    if (args.suiteId) {
      const suite = await ctx.db.get(args.suiteId);
      if (!suite || suite.projectId !== args.projectId || suite.datasetId !== args.datasetId) throw new Error("Evaluation suite does not match the selected dataset");
    }
    if (!args.name.trim()) throw new Error("Experiment name is required");
    const now = Date.now();
    return ctx.db.insert("experiments", { projectId: args.projectId, datasetId: args.datasetId, promptId: args.promptId, promptVersionId: args.promptVersionId, suiteId: args.suiteId, name: args.name.trim(), model: args.model?.trim() || undefined, status: "draft", createdBy: identity.subject, createdAt: now });
  },
});

export const setStatus = mutation({
  args: { projectId: v.id("projects"), experimentId: v.id("experiments"), status: v.union(v.literal("draft"), v.literal("running"), v.literal("completed"), v.literal("failed")) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment || experiment.projectId !== args.projectId) throw new Error("Experiment not found");
    await ctx.db.patch(args.experimentId, { status: args.status, completedAt: args.status === "completed" || args.status === "failed" ? Date.now() : undefined });
  },
});

export const recordResult = mutation({
  args: { projectId: v.id("projects"), experimentId: v.id("experiments"), datasetItemId: v.id("datasetItems"), output: v.string(), traceId: v.optional(v.string()), latencyMs: v.optional(v.number()), costUsd: v.optional(v.number()), score: v.optional(v.number()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const experiment = await ctx.db.get(args.experimentId);
    const item = await ctx.db.get(args.datasetItemId);
    const dataset = experiment ? await ctx.db.get(experiment.datasetId) : null;
    if (!experiment || experiment.projectId !== args.projectId || !item || item.projectId !== args.projectId || item.datasetId !== experiment.datasetId || !dataset || !canAccessDataset(dataset, identity)) throw new Error("Experiment or dataset item not found");
    return ctx.db.insert("experimentResults", { ...args, createdAt: Date.now() });
  },
});
