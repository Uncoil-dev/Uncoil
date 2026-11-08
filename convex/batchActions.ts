import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { BATCH_ACTIONS, BATCH_RUN_LIMIT, BATCH_SCAN_LIMIT, checkFilter, matchesRun } from "./batchRules";
import type { BatchFilter } from "./batchRules";
import { checkValue } from "./scoreConfigRules";
import { readProject, recordAudit, requireMember } from "./settingsAccess";

const filterValidator = v.object({
  status: v.optional(v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("cancelled"))),
  environment: v.optional(v.string()),
  modelContains: v.optional(v.string()),
  olderThanHours: v.optional(v.number()),
});
const actionValidator = v.union(v.literal("cancel_stuck"), v.literal("queue_review"), v.literal("add_score"));

async function findRuns(ctx: QueryCtx, projectId: Id<"projects">, filter: BatchFilter) {
  const status = filter.status;
  const rows: Doc<"agentRuns">[] = status
    ? await ctx.db.query("agentRuns").withIndex("by_projectId_status", (q) => q.eq("projectId", projectId).eq("status", status)).order("desc").take(BATCH_SCAN_LIMIT)
    : await ctx.db.query("agentRuns").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(BATCH_SCAN_LIMIT);
  const now = Date.now();
  return { scanned: rows.length, matches: rows.filter((run) => matchesRun(run, filter, now)) };
}

/** How many runs an action would touch, before anything changes. */
export const preview = query({
  args: { projectId: v.id("projects"), action: actionValidator, filter: filterValidator },
  handler: async (ctx, { projectId, action, filter }) => {
    const found = await readProject(ctx, projectId);
    if (!found) return null;
    const problem = checkFilter(action, filter);
    if (problem) return { problem, matched: 0, scanned: 0, sample: [], capped: false };
    const { scanned, matches } = await findRuns(ctx, projectId, filter);
    return {
      problem: null,
      matched: matches.length,
      scanned,
      capped: scanned >= BATCH_SCAN_LIMIT,
      sample: matches.slice(0, 6).map((run) => ({ runId: run.runId, status: run.status, model: run.primaryModel ?? null, startedAt: run.startedAt, costUsd: run.totalCostUsd })),
    };
  },
});

export const run = mutation({
  args: {
    projectId: v.id("projects"),
    action: actionValidator,
    filter: filterValidator,
    score: v.optional(v.object({ name: v.string(), value: v.union(v.number(), v.boolean(), v.string()) })),
  },
  handler: async (ctx, { projectId, action, filter, score }) => {
    const { identity } = await requireMember(ctx, projectId);
    const problem = checkFilter(action, filter);
    if (problem) throw new Error(problem);
    const { matches } = await findRuns(ctx, projectId, filter);
    const batch = matches.slice(0, BATCH_RUN_LIMIT);
    let affected = 0;
    let skipped = 0;

    let config: Doc<"scoreConfigs"> | null = null;
    if (action === "add_score") {
      const name = score?.name.trim();
      if (!score || !name) throw new Error("Pick a score and a value.");
      config = await ctx.db.query("scoreConfigs").withIndex("by_projectId_and_name", (q) => q.eq("projectId", projectId).eq("name", name)).unique();
      if (!config) throw new Error("Define this score in Scores Configs first.");
      const bad = checkValue(config, config.dataType, score.value);
      if (bad) throw new Error(bad);
    }

    for (const item of batch) {
      if (action === "cancel_stuck") {
        await ctx.db.patch(item._id, { status: "cancelled", finishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        affected += 1;
      } else if (action === "queue_review") {
        const existing = await ctx.db.query("annotations").withIndex("by_projectId_and_traceId", (q) => q.eq("projectId", projectId).eq("traceId", item.runId)).first();
        if (existing) { skipped += 1; continue; }
        await ctx.db.insert("annotations", { projectId, traceId: item.runId, status: "queued", label: "batch", createdBy: identity.subject, createdAt: Date.now() });
        affected += 1;
      } else if (config && score) {
        const existing = await ctx.db.query("scores").withIndex("by_projectId_and_traceId", (q) => q.eq("projectId", projectId).eq("traceId", item.runId)).filter((q) => q.eq(q.field("name"), config.name)).first();
        if (existing) { skipped += 1; continue; }
        await ctx.db.insert("scores", { projectId, traceId: item.runId, name: config.name, value: score.value, dataType: config.dataType, source: "human", comment: "Added by a bulk action", createdBy: identity.subject, createdAt: Date.now() });
        affected += 1;
      }
    }
    await recordAudit(ctx, projectId, identity, `batch.${action}`, "runs", `${BATCH_ACTIONS[action].title}: ${affected} run${affected === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped` : ""}`, {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.environment ? { environment: filter.environment } : {}),
      ...(filter.modelContains ? { model: filter.modelContains } : {}),
      ...(filter.olderThanHours !== undefined ? { olderThanHours: String(filter.olderThanHours) } : {}),
    });
    // Runs that were skipped still match next time, so the count left only shrinks for runs we changed.
    return { affected, skipped, remaining: Math.max(0, matches.length - batch.length) };
  },
});
