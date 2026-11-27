import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { canAccessProject, canAdminProject } from "./projects";

/** Every table that stores rows for one project, with the index that starts with projectId. */
const PROJECT_TABLES = {
  agentRuns: "by_projectId",
  sessions: "by_projectId_and_sessionId",
  alerts: "by_projectId",
  alertRules: "by_projectId",
  automations: "by_projectId",
  dashboardConfigs: "by_projectId",
  dashboardWidgets: "by_projectId",
  comments: "by_projectId",
  savedViews: "by_projectId_and_ownerId",
  prompts: "by_projectId",
  promptVersions: "by_projectId",
  promptTraceLinks: "by_projectId",
  datasets: "by_projectId",
  datasetItems: "by_projectId",
  scores: "by_projectId",
  annotations: "by_projectId",
  annotationReviews: "by_projectId",
  evaluators: "by_projectId",
  evaluatorVersions: "by_projectId",
  evaluationSuites: "by_projectId",
  evaluationJobs: "by_projectId",
  evaluationResults: "by_projectId",
  evaluationMonitors: "by_projectId",
  evaluationMonitorState: "by_projectId",
  evaluationFeedback: "by_projectId",
  experiments: "by_projectId",
  experimentResults: "by_projectId",
  resilienceRuns: "by_projectId",
  resilienceIterations: "by_projectId",
  auditLogs: "by_projectId",
  // Derived caches: removed on delete, left out of exports.
  analyticsStatsCache: "by_projectId_and_rangeDays",
  runSpanCache: "by_projectId_and_runId",
  costCounters: "by_projectId_and_period",
} as const;

type ProjectTable = keyof typeof PROJECT_TABLES;
const TABLE_NAMES = Object.keys(PROJECT_TABLES) as ProjectTable[];
const EXPORT_TABLES = TABLE_NAMES.filter(
  (name) => name !== "analyticsStatsCache" && name !== "runSpanCache",
);

/** Which tables a data export contains, in order. */
export const exportTables = query({
  args: {},
  handler: async () => EXPORT_TABLES,
});

// The table name is dynamic, so the query builder is typed loosely here.
/* eslint-disable @typescript-eslint/no-explicit-any */
function projectRows(ctx: { db: any }, table: ProjectTable, projectId: string) {
  return ctx.db
    .query(table)
    .withIndex(PROJECT_TABLES[table], (q: any) => q.eq("projectId", projectId));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** One page of one table for the data export. Admins only. */
export const exportPage = query({
  args: {
    projectId: v.id("projects"),
    table: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { projectId, table, cursor }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) throw new Error("Project not found or access denied");
    if (!canAdminProject(project, identity)) throw new Error("Admin access required");
    if (!(EXPORT_TABLES as string[]).includes(table)) throw new Error("Unknown table");
    const result = await projectRows(ctx, table as ProjectTable, projectId).paginate({ numItems: 200, cursor });
    return { rows: result.page as unknown[], isDone: result.isDone as boolean, cursor: result.continueCursor as string };
  },
});

const SECRET_FIELDS = ["apiKeyHash", "stripeCustomerId", "stripeSubscriptionId", "stripePriceId", "slackWebhookUrl", "teamsWebhookUrl", "discordWebhookUrl"];

/** The project record without secrets (key hash, billing ids, webhook addresses). */
export const exportProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) throw new Error("Project not found or access denied");
    if (!canAdminProject(project, identity)) throw new Error("Admin access required");
    const safe: Record<string, unknown> = { ...project };
    for (const secret of SECRET_FIELDS) delete safe[secret];
    return safe;
  },
});

const WRITE_BUDGET = 4000;

/** Deletes up to a fixed number of rows across the project tables, then schedules itself until everything is gone. */
export const purgeBatch = internalMutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    let budget = WRITE_BUDGET;
    for (const table of TABLE_NAMES) {
      if (budget <= 0) break;
      const rows = await projectRows(ctx, table, projectId).take(budget);
      for (const row of rows) await ctx.db.delete(row._id);
      budget -= rows.length;
    }
    if (budget <= 0) await ctx.scheduler.runAfter(0, internal.projectData.purgeBatch, { projectId });
  },
});
