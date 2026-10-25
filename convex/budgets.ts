import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { canAccessProject } from "./alerts";
import { EMAIL_PATTERN, cleanSlackUrl, cleanWebhookUrl } from "./alertRules";
import { escapeHtml, postJson, sendEmail } from "./notify";
import { budgetLevel, describeBudget, periodBounds, projectSpend, spendBetween } from "./spendMetrics";

const MAX_BUDGETS_PER_PROJECT = 10;
/** A month of very busy traffic is cut off here; the screen says "at least" when this happens. */
export const MAX_RUNS_SCANNED = 5000;

const periodValidator = v.union(v.literal("week"), v.literal("month"));

export async function runsSince(ctx: QueryCtx, projectId: Id<"projects">, sinceMs: number) {
  const runs = await ctx.db.query("agentRuns").withIndex("by_projectId", (q) => q.eq("projectId", projectId).gte("_creationTime", sinceMs - 24 * 60 * 60_000)).order("desc").take(MAX_RUNS_SCANNED);
  return { runs, truncated: runs.length >= MAX_RUNS_SCANNED };
}

async function requireProject(ctx: QueryCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const project = await ctx.db.get(projectId);
  if (!project || !canAccessProject(project, identity)) throw new Error("Project not found");
  return { identity, project };
}

export const overview = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;
    const now = Date.now();
    const budgets = await ctx.db.query("costBudgets").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_BUDGETS_PER_PROJECT);
    const monthStart = periodBounds("month", now).start;
    const weekStart = periodBounds("week", now).start;
    const { runs, truncated } = await runsSince(ctx, projectId, Math.min(monthStart, weekStart));
    return {
      now,
      truncated,
      budgets: budgets.map(({ slackUrl, webhookUrl, ...budget }) => {
        const bounds = periodBounds(budget.period, now);
        const scoped = budget.environment ? runs.filter((run) => run.environment === budget.environment) : runs;
        const spent = spendBetween(scoped, bounds.start, bounds.end);
        return {
          ...budget,
          hasSlack: Boolean(slackUrl),
          hasWebhook: Boolean(webhookUrl),
          spent,
          level: budgetLevel(spent, budget.limitUsd, budget.warnAtPercent),
          projected: projectSpend(spent, bounds, now),
          periodEnd: bounds.end,
        };
      }),
    };
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    period: periodValidator,
    limitUsd: v.number(),
    warnAtPercent: v.number(),
    environment: v.optional(v.string()),
    emailTo: v.array(v.string()),
    slackUrl: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new Error("Give the budget a name");
    if (!Number.isFinite(args.limitUsd) || args.limitUsd <= 0) throw new Error("The budget must be more than $0");
    const warnAtPercent = Math.round(args.warnAtPercent);
    if (!Number.isFinite(warnAtPercent) || warnAtPercent < 1 || warnAtPercent > 99) throw new Error("Warn me at a percentage between 1 and 99");
    const emailTo = [...new Set(args.emailTo.map((email) => email.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
    if (emailTo.some((email) => !EMAIL_PATTERN.test(email))) throw new Error("One of the email addresses isn't valid");
    const slackUrl = cleanSlackUrl(args.slackUrl);
    const webhookUrl = cleanWebhookUrl(args.webhookUrl);
    if (emailTo.length === 0 && !slackUrl && !webhookUrl) throw new Error("Choose at least one way to be told: email, Slack or a webhook");
    const existing = await ctx.db.query("costBudgets").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).take(MAX_BUDGETS_PER_PROJECT + 1);
    if (existing.length >= MAX_BUDGETS_PER_PROJECT) throw new Error(`A project can have up to ${MAX_BUDGETS_PER_PROJECT} budgets`);
    const now = Date.now();
    return await ctx.db.insert("costBudgets", {
      projectId: args.projectId,
      name,
      period: args.period,
      limitUsd: Math.round(args.limitUsd * 100) / 100,
      warnAtPercent,
      environment: args.environment?.trim().slice(0, 80) || undefined,
      emailTo,
      slackUrl,
      webhookUrl,
      enabled: true,
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setEnabled = mutation({
  args: { budgetId: v.id("costBudgets"), enabled: v.boolean() },
  handler: async (ctx, { budgetId, enabled }) => {
    const budget = await ctx.db.get(budgetId);
    if (!budget) throw new Error("Budget not found");
    await requireProject(ctx, budget.projectId);
    await ctx.db.patch(budgetId, { enabled, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { budgetId: v.id("costBudgets") },
  handler: async (ctx, { budgetId }) => {
    const budget = await ctx.db.get(budgetId);
    if (!budget) return;
    await requireProject(ctx, budget.projectId);
    await ctx.db.delete(budgetId);
  },
});

export const enabledBudgetIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("costBudgets").withIndex("by_enabled", (q) => q.eq("enabled", true)).take(500)).map((budget) => budget._id),
});

type Notice = { message: string; level: "warning" | "over"; name: string; emailTo: string[]; slackUrl?: string; webhookUrl?: string; projectId: string; spent: number; limitUsd: number; period: "week" | "month"; periodKey: string };

/** Checks one budget. Each level is announced once per week or month, then stays quiet until the next period. */
export const evaluate = internalMutation({
  args: { budgetId: v.id("costBudgets") },
  handler: async (ctx, { budgetId }): Promise<Notice | null> => {
    const budget = await ctx.db.get(budgetId);
    if (!budget || !budget.enabled) return null;
    const now = Date.now();
    const bounds = periodBounds(budget.period, now);
    const { runs } = await runsSince(ctx, budget.projectId, bounds.start);
    const scoped = budget.environment ? runs.filter((run) => run.environment === budget.environment) : runs;
    const spent = spendBetween(scoped, bounds.start, bounds.end);
    const level = budgetLevel(spent, budget.limitUsd, budget.warnAtPercent);
    await ctx.db.patch(budgetId, { lastSpend: spent, lastCheckedAt: now });
    if (level === "ok") return null;
    const alreadyTold = level === "over" ? budget.overPeriod === bounds.key : budget.warnedPeriod === bounds.key || budget.overPeriod === bounds.key;
    if (alreadyTold) return null;
    // Jumping straight past the limit counts as both, so a late "80% warning" never follows an "over" message.
    await ctx.db.patch(budgetId, level === "over" ? { overPeriod: bounds.key, warnedPeriod: bounds.key } : { warnedPeriod: bounds.key });
    const message = describeBudget(budget.name, level, spent, budget.limitUsd, budget.period);
    await ctx.db.insert("alerts", { projectId: budget.projectId, runId: `budget:${budgetId}:${bounds.key}:${level}`, type: "cost_budget", message, triggeredAt: new Date(now).toISOString(), state: "active" });
    return { message, level, name: budget.name, emailTo: budget.emailTo, slackUrl: budget.slackUrl, webhookUrl: budget.webhookUrl, projectId: budget.projectId, spent, limitUsd: budget.limitUsd, period: budget.period, periodKey: bounds.key };
  },
});

export const checkAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const ids: Id<"costBudgets">[] = await ctx.runQuery(internal.budgets.enabledBudgetIds, {});
    for (const budgetId of ids) {
      try {
        const notice: Notice | null = await ctx.runMutation(internal.budgets.evaluate, { budgetId });
        if (!notice) continue;
        const sends: Promise<unknown>[] = [];
        const heading = notice.level === "over" ? "Budget passed" : "Budget warning";
        if (notice.emailTo.length > 0) {
          sends.push(sendEmail({
            to: notice.emailTo,
            subject: `Tracify ${heading.toLowerCase()}: ${notice.name}`,
            text: `${notice.message}\n\nOpen your Tracify dashboard to see where the spend is coming from.`,
            html: `<p>${escapeHtml(notice.message)}</p><p>Open your Tracify dashboard to see where the spend is coming from.</p>`,
            idempotencyKey: `budget-${budgetId}-${notice.periodKey}-${notice.level}`,
          }));
        }
        if (notice.slackUrl) sends.push(postJson("slack", notice.slackUrl, { text: `${notice.level === "over" ? ":rotating_light:" : ":warning:"} *${heading}*\n${notice.message}` }));
        if (notice.webhookUrl) {
          sends.push(postJson("webhook", notice.webhookUrl, {
            event: notice.level === "over" ? "budget.exceeded" : "budget.warning",
            budget: { id: budgetId, name: notice.name, period: notice.period, limitUsd: notice.limitUsd },
            spentUsd: notice.spent,
            message: notice.message,
            projectId: notice.projectId,
            firedAt: new Date().toISOString(),
          }));
        }
        await Promise.all(sends);
        await ctx.runAction(internal.automationRuntime.dispatch, { projectId: notice.projectId as Id<"projects">, source: "cost.threshold", title: `${heading}: ${notice.name}`, message: notice.message, data: { budgetId, level: notice.level, spentUsd: notice.spent, limitUsd: notice.limitUsd } });
      } catch (error) {
        console.error("[budgets] check failed", budgetId, error);
      }
    }
  },
});
