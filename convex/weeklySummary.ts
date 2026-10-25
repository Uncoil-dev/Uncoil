import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { canAccessProject } from "./alerts";
import { EMAIL_PATTERN, cleanSlackUrl } from "./alertRules";
import { MAX_RUNS_SCANNED, runsSince } from "./budgets";
import { postJson, sendEmail } from "./notify";
import { buildWeeklySummary, periodBounds, renderSummaryEmail, spendBetween, summaryLines } from "./spendMetrics";
import type { BudgetLine } from "./spendMetrics";

const DAY = 24 * 60 * 60_000;
const SITE = process.env.SITE_URL || "https://www.tracify.tech";

async function requireProject(ctx: QueryCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const project = await ctx.db.get(projectId);
  if (!project || !canAccessProject(project, identity)) throw new Error("Project not found");
  return { identity, project };
}

async function build(ctx: QueryCtx, projectId: Id<"projects">, now: number) {
  const project = await ctx.db.get(projectId);
  const { runs, truncated } = await runsSince(ctx, projectId, now - 14 * DAY);
  const summary = buildWeeklySummary(runs, now);
  const budgets = await ctx.db.query("costBudgets").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(10);
  const lines: BudgetLine[] = budgets.filter((budget) => budget.enabled).map((budget) => {
    const bounds = periodBounds(budget.period, now);
    const scoped = budget.environment ? runs.filter((run) => run.environment === budget.environment) : runs;
    return { name: budget.name, period: budget.period, limitUsd: budget.limitUsd, spent: spendBetween(scoped, bounds.start, bounds.end) };
  });
  return { projectName: project?.name ?? "Your project", summary, budgets: lines, truncated, dashboardUrl: `${SITE}/dashboard/${projectId}` };
}

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;
    const now = Date.now();
    const settings = await ctx.db.query("weeklySummaries").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).unique();
    const built = await build(ctx, projectId, now);
    return {
      enabled: settings?.enabled ?? false,
      emailTo: settings?.emailTo ?? [],
      hasSlack: Boolean(settings?.slackUrl),
      lastSentWeek: settings?.lastSentWeek ?? null,
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      truncated: built.truncated || false,
      preview: { ...summaryLines(built.projectName, built.summary, built.budgets), totals: built.summary.current },
      scanLimit: MAX_RUNS_SCANNED,
    };
  },
});

export const save = mutation({
  args: { projectId: v.id("projects"), enabled: v.boolean(), emailTo: v.array(v.string()), slackUrl: v.optional(v.string()), clearSlack: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireProject(ctx, args.projectId);
    const emailTo = [...new Set(args.emailTo.map((email) => email.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
    if (emailTo.some((email) => !EMAIL_PATTERN.test(email))) throw new Error("One of the email addresses isn't valid");
    const existing = await ctx.db.query("weeklySummaries").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).unique();
    const slackUrl = args.clearSlack ? undefined : cleanSlackUrl(args.slackUrl) ?? existing?.slackUrl;
    if (args.enabled && emailTo.length === 0 && !slackUrl) throw new Error("Add an email address or a Slack link first");
    const next = { enabled: args.enabled, emailTo, slackUrl, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, next);
    else await ctx.db.insert("weeklySummaries", { projectId: args.projectId, ...next });
  },
});

/** Sends this week's summary now, at most once a minute, so people can see what they will get. */
export const sendTest = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    await requireProject(ctx, projectId);
    const settings = await ctx.db.query("weeklySummaries").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).unique();
    if (!settings || (settings.emailTo.length === 0 && !settings.slackUrl)) throw new Error("Save an email address or a Slack link first");
    const now = Date.now();
    if (settings.lastTestAt && now - settings.lastTestAt < 60_000) throw new Error("Give it a minute before sending another test");
    await ctx.db.patch(settings._id, { lastTestAt: now });
    await ctx.scheduler.runAfter(0, internal.weeklySummary.deliver, { summaryId: settings._id, weekKey: `test-${now}` });
  },
});

export const enabledIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("weeklySummaries").withIndex("by_enabled", (q) => q.eq("enabled", true)).take(500)).map((doc) => doc._id),
});

/** Marks the week as sent before sending, so a retry can never email the same week twice. */
export const claimWeek = internalMutation({
  args: { summaryId: v.id("weeklySummaries"), weekKey: v.string() },
  handler: async (ctx, { summaryId, weekKey }) => {
    const settings = await ctx.db.get(summaryId);
    if (!settings || !settings.enabled || settings.lastSentWeek === weekKey) return false;
    await ctx.db.patch(summaryId, { lastSentWeek: weekKey });
    return true;
  },
});

export const content = internalQuery({
  args: { summaryId: v.id("weeklySummaries") },
  handler: async (ctx, { summaryId }) => {
    const settings = await ctx.db.get(summaryId);
    if (!settings) return null;
    const built = await build(ctx, settings.projectId, Date.now());
    return { settings: { emailTo: settings.emailTo, slackUrl: settings.slackUrl }, ...built };
  },
});

export const deliver = internalAction({
  args: { summaryId: v.id("weeklySummaries"), weekKey: v.string() },
  handler: async (ctx, { summaryId, weekKey }) => {
    const data = await ctx.runQuery(internal.weeklySummary.content, { summaryId });
    if (!data) return;
    const sends: Promise<unknown>[] = [];
    if (data.settings.emailTo.length > 0) {
      const email = renderSummaryEmail(data.projectName, data.summary, data.budgets, data.dashboardUrl);
      sends.push(sendEmail({ to: data.settings.emailTo, ...email, idempotencyKey: `weekly-${summaryId}-${weekKey}` }));
    }
    if (data.settings.slackUrl) {
      const { title, lines } = summaryLines(data.projectName, data.summary, data.budgets);
      sends.push(postJson("slack", data.settings.slackUrl, { text: `*Your Tracify week: ${title}*\n${lines.map((line) => `• ${line}`).join("\n")}\n<${data.dashboardUrl}|See the details>` }));
    }
    await Promise.all(sends);
  },
});

/** Monday morning run. The week key is the Monday it fires on. */
export const sendAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const weekKey = periodBounds("week", Date.now()).key;
    const ids: Id<"weeklySummaries">[] = await ctx.runQuery(internal.weeklySummary.enabledIds, {});
    for (const summaryId of ids) {
      try {
        const claimed: boolean = await ctx.runMutation(internal.weeklySummary.claimWeek, { summaryId, weekKey });
        if (claimed) await ctx.runAction(internal.weeklySummary.deliver, { summaryId, weekKey });
      } catch (error) {
        console.error("[weekly-summary] failed", summaryId, error);
      }
    }
  },
});
