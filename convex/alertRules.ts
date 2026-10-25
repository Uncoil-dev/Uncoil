import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { canAccessProject } from "./alerts";
import { escapeHtml, postJson, sendEmail, type DeliveryResult } from "./notify";
import { slackPayload, webhookPayload, type AlertEvent } from "./alertMessages";
import { describeBreach, metricAt, metricSeries } from "./alertMetrics";

const metricValidator = v.union(
  v.literal("failed_runs"),
  v.literal("cost_usd"),
  v.literal("slow_p95_seconds"),
  v.literal("minutes_without_runs"),
);

const SITE = process.env.SITE_URL || "https://www.tracify.tech";
const MAX_DELIVERIES_PER_RULE = 20;
const MAX_RULES_PER_PROJECT = 25;
const MAX_RUNS_SCANNED = 2000;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Slack incoming webhooks only live on hooks.slack.com. */
export function cleanSlackUrl(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("That Slack link doesn't look right"); }
  if (url.protocol !== "https:" || url.hostname !== "hooks.slack.com" || !url.pathname.startsWith("/services/")) throw new Error("Paste a Slack incoming webhook link (starts with https://hooks.slack.com/services/)");
  return url.toString();
}

/** Any public https address. Local and private addresses are refused so a rule cannot poke at internal services. */
export function cleanWebhookUrl(raw: string | undefined) {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("That webhook link doesn't look right"); }
  const host = url.hostname.toLowerCase();
  const privateHost = host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes(".");
  if (url.protocol !== "https:" || privateHost || url.username || url.password) throw new Error("Webhook links must be public https addresses");
  return url.toString();
}

async function requireProject(ctx: QueryCtx, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const project = await ctx.db.get(projectId);
  if (!project || !canAccessProject(project, identity)) throw new Error("Project not found");
  return { identity, project };
}

/** Newest runs first, capped so one noisy project cannot blow the read limit. */
async function recentRuns(ctx: QueryCtx, projectId: Id<"projects">, sinceMs: number) {
  const runs = await ctx.db.query("agentRuns").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(MAX_RUNS_SCANNED);
  return runs.filter((run) => Date.parse(run.startedAt) >= sinceMs);
}

export const overview = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(projectId);
    if (!project || !canAccessProject(project, identity)) return null;
    const now = Date.now();
    const rules = await ctx.db.query("alertRules").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).take(MAX_RULES_PER_PROJECT);
    const runs = await recentRuns(ctx, projectId, now - 2 * 24 * 60 * 60_000 - 24 * 60 * 60_000);
    const history = await ctx.db.query("alerts").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(30);
    const deliveries = await ctx.db.query("alertDeliveries").withIndex("by_projectId", (q) => q.eq("projectId", projectId)).order("desc").take(200);
    const latest = (ruleId: Id<"alertRules">, channel: "slack" | "webhook") => {
      const found = deliveries.find((item) => item.ruleId === ruleId && item.channel === channel);
      return found ? { ok: found.ok, kind: found.kind, error: found.error, at: found.at } : undefined;
    };
    return {
      now,
      rules: rules.map(({ slackUrl, webhookUrl, ...rule }) => ({
        ...rule,
        slackDelivery: latest(rule._id, "slack"),
        webhookDelivery: latest(rule._id, "webhook"),
        hasSlack: Boolean(slackUrl),
        webhookHost: webhookUrl ? new URL(webhookUrl).hostname : undefined,
        value: metricAt(runs, rule.metric, rule.windowMinutes, now, rule.environment),
        series: metricSeries(runs, rule.metric, rule.windowMinutes, now, rule.environment),
      })),
      history: history.map((alert) => ({ _id: alert._id, message: alert.message, triggeredAt: alert.triggeredAt, state: alert.state ?? "active", ruleId: alert.ruleId })),
    };
  },
});

/** What a rule would have done over the last 7 days, for the new-rule preview. */
export const preview = query({
  args: { projectId: v.id("projects"), metric: metricValidator, threshold: v.number(), windowMinutes: v.number(), environment: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project || !canAccessProject(project, identity)) return null;
    const now = Date.now();
    const windowMinutes = Math.min(Math.max(Math.round(args.windowMinutes), 5), 1440);
    const runs = await recentRuns(ctx, args.projectId, now - 8 * 24 * 60 * 60_000);
    const series = metricSeries(runs, args.metric, windowMinutes, now, args.environment || undefined, 70, 7 * 24 * 60);
    let fires = 0;
    let previous = false;
    for (const value of series) {
      const over = value > args.threshold;
      if (over && !previous) fires += 1;
      previous = over;
    }
    return { series, fires, truncated: runs.length >= MAX_RUNS_SCANNED };
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    metric: metricValidator,
    threshold: v.number(),
    windowMinutes: v.number(),
    environment: v.optional(v.string()),
    emailTo: v.array(v.string()),
    slackUrl: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireProject(ctx, args.projectId);
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new Error("Give the rule a name");
    if (!Number.isFinite(args.threshold) || args.threshold < 0) throw new Error("Limit must be zero or more");
    const emailTo = [...new Set(args.emailTo.map((email) => email.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
    if (emailTo.some((email) => !EMAIL_PATTERN.test(email))) throw new Error("One of the email addresses isn't valid");
    const slackUrl = cleanSlackUrl(args.slackUrl);
    const webhookUrl = cleanWebhookUrl(args.webhookUrl);
    if (emailTo.length === 0 && !slackUrl && !webhookUrl) throw new Error("Choose at least one way to be told: email, Slack or a webhook");
    const existing = await ctx.db.query("alertRules").withIndex("by_projectId", (q) => q.eq("projectId", args.projectId)).take(MAX_RULES_PER_PROJECT + 1);
    if (existing.length >= MAX_RULES_PER_PROJECT) throw new Error(`A project can have up to ${MAX_RULES_PER_PROJECT} rules`);
    const now = Date.now();
    return await ctx.db.insert("alertRules", {
      projectId: args.projectId,
      name,
      metric: args.metric,
      threshold: args.threshold,
      windowMinutes: Math.min(Math.max(Math.round(args.windowMinutes), 5), 1440),
      environment: args.environment?.trim().slice(0, 80) || undefined,
      emailTo,
      slackUrl,
      webhookUrl,
      enabled: true,
      state: "ok",
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setEnabled = mutation({
  args: { ruleId: v.id("alertRules"), enabled: v.boolean() },
  handler: async (ctx, { ruleId, enabled }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) throw new Error("Rule not found");
    await requireProject(ctx, rule.projectId);
    await ctx.db.patch(ruleId, { enabled, ...(enabled ? {} : { state: "ok" as const }), updatedAt: Date.now() });
  },
});

/** Short labels used to group and filter rules: lowercase, no spaces, up to 8 tags of 24 characters. */
export function cleanTags(raw: string[]) {
  const tags = raw.map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24)).filter(Boolean);
  return [...new Set(tags)].slice(0, 8);
}

export const setTags = mutation({
  args: { ruleId: v.id("alertRules"), tags: v.array(v.string()) },
  handler: async (ctx, { ruleId, tags }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) throw new Error("Rule not found");
    await requireProject(ctx, rule.projectId);
    const clean = cleanTags(tags);
    await ctx.db.patch(ruleId, { tags: clean, updatedAt: Date.now() });
    return clean;
  },
});

export const remove = mutation({
  args: { ruleId: v.id("alertRules") },
  handler: async (ctx, { ruleId }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) return;
    await requireProject(ctx, rule.projectId);
    await ctx.db.delete(ruleId);
  },
});

export const enabledRuleIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("alertRules").withIndex("by_enabled", (q) => q.eq("enabled", true)).take(500)).map((rule) => rule._id),
});

/** Checks one rule. Opens an alert when it first goes over its limit and closes it when it recovers. */
export const evaluate = internalMutation({
  args: { ruleId: v.id("alertRules") },
  handler: async (ctx, { ruleId }): Promise<{ fired: true; message: string; emailTo: string[]; slackUrl?: string; webhookUrl?: string; name: string; metric: string; value: number; threshold: number; projectId: string } | { fired: false; resolved?: { message: string; slackUrl?: string; webhookUrl?: string; name: string; metric: string; value: number; threshold: number; projectId: string } }> => {
    const rule = await ctx.db.get(ruleId);
    if (!rule || !rule.enabled) return { fired: false };
    const now = Date.now();
    const runs = await recentRuns(ctx, rule.projectId, now - rule.windowMinutes * 60_000 - 60_000);
    const value = metricAt(runs, rule.metric, rule.windowMinutes, now, rule.environment);
    const over = value > rule.threshold;
    await ctx.db.patch(ruleId, { lastValue: value, lastCheckedAt: now });
    if (over && rule.state === "ok") {
      const message = describeBreach(rule, value);
      await ctx.db.patch(ruleId, { state: "firing", lastFiredAt: now });
      await ctx.db.insert("alerts", { projectId: rule.projectId, ruleId, runId: `rule:${ruleId}:${now}`, type: rule.metric, message, triggeredAt: new Date(now).toISOString(), state: "active" });
      return { fired: true, message, emailTo: rule.emailTo, slackUrl: rule.slackUrl, webhookUrl: rule.webhookUrl, name: rule.name, metric: rule.metric, value, threshold: rule.threshold, projectId: rule.projectId };
    }
    if (!over && rule.state === "firing") {
      await ctx.db.patch(ruleId, { state: "ok" });
      const open = await ctx.db.query("alerts").withIndex("by_ruleId", (q) => q.eq("ruleId", ruleId)).order("desc").take(20);
      for (const alert of open) if ((alert.state ?? "active") === "active") await ctx.db.patch(alert._id, { state: "resolved" });
      return { fired: false, resolved: { message: `Back under its limit. ${describeBreach(rule, value)}`, slackUrl: rule.slackUrl, webhookUrl: rule.webhookUrl, name: rule.name, metric: rule.metric, value, threshold: rule.threshold, projectId: rule.projectId } };
    }
    return { fired: false };
  },
});

function dashboardUrl(projectId: string) {
  return `${SITE}/dashboard/${projectId}/alerts`;
}

/** Writes one delivery row and keeps only the newest few per rule. */
export const recordDelivery = internalMutation({
  args: { projectId: v.id("projects"), ruleId: v.id("alertRules"), channel: v.union(v.literal("slack"), v.literal("webhook")), kind: v.union(v.literal("fired"), v.literal("resolved"), v.literal("test")), ok: v.boolean(), status: v.optional(v.number()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.ruleId))) return;
    await ctx.db.insert("alertDeliveries", { ...args, at: Date.now() });
    const all = await ctx.db.query("alertDeliveries").withIndex("by_ruleId", (q) => q.eq("ruleId", args.ruleId)).order("desc").take(MAX_DELIVERIES_PER_RULE + 10);
    for (const old of all.slice(MAX_DELIVERIES_PER_RULE)) await ctx.db.delete(old._id);
  },
});

type Targets = { slackUrl?: string; webhookUrl?: string; name: string; metric: string; threshold: number; projectId: string };

/** Sends the Slack and webhook messages for one event and records how each one went. */
async function sendToDestinations(ctx: { runMutation: (ref: typeof internal.alertRules.recordDelivery, args: never) => Promise<unknown> }, ruleId: Id<"alertRules">, kind: "fired" | "resolved" | "test", target: Targets, message: string, value: number | undefined, urls: { slack?: string; webhook?: string }): Promise<{ slack?: DeliveryResult; webhook?: DeliveryResult }> {
  const event: AlertEvent = kind === "fired" ? "alert.fired" : kind === "resolved" ? "alert.resolved" : "alert.test";
  const info = { event, ruleId, ruleName: target.name, metric: target.metric, threshold: target.threshold, value, message, projectId: target.projectId, dashboardUrl: dashboardUrl(target.projectId), at: new Date().toISOString() };
  const [slack, webhook] = await Promise.all([
    urls.slack ? postJson("slack", urls.slack, slackPayload(info)) : undefined,
    urls.webhook ? postJson("webhook", urls.webhook, webhookPayload(info)) : undefined,
  ]);
  for (const [channel, result] of [["slack", slack], ["webhook", webhook]] as const) {
    if (!result) continue;
    await ctx.runMutation(internal.alertRules.recordDelivery, { projectId: target.projectId as Id<"projects">, ruleId, channel, kind, ok: result.ok, status: result.status, error: result.error } as never);
  }
  return { slack, webhook };
}

export const checkAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const ids: Id<"alertRules">[] = await ctx.runQuery(internal.alertRules.enabledRuleIds, {});
    for (const ruleId of ids) {
      try {
        const result = await ctx.runMutation(internal.alertRules.evaluate, { ruleId });
        if (!result.fired) {
          const back = result.resolved;
          if (back && (back.slackUrl || back.webhookUrl)) await sendToDestinations(ctx, ruleId, "resolved", back, back.message, back.value, { slack: back.slackUrl, webhook: back.webhookUrl });
          continue;
        }
        const sends: Promise<unknown>[] = [];
        if (result.emailTo.length > 0) {
          sends.push(sendEmail({
            to: result.emailTo,
            subject: `Tracify alert: ${result.name}`,
            text: `${result.message}\n\nOpen your Tracify dashboard to see what happened.`,
            html: `<p>${escapeHtml(result.message)}</p><p>Open your Tracify dashboard to see what happened.</p>`,
            idempotencyKey: `alert-${ruleId}-${Date.now()}`,
          }));
        }
        if (result.slackUrl || result.webhookUrl) sends.push(sendToDestinations(ctx, ruleId, "fired", result, result.message, result.value, { slack: result.slackUrl, webhook: result.webhookUrl }));
        await Promise.all(sends);
        const data = { ruleId, metric: result.metric, value: result.value, threshold: result.threshold };
        await ctx.runAction(internal.automationRuntime.dispatch, { projectId: result.projectId as Id<"projects">, source: "alert.created", title: result.name, message: result.message, data });
        if (result.metric === "cost_usd") await ctx.runAction(internal.automationRuntime.dispatch, { projectId: result.projectId as Id<"projects">, source: "cost.threshold", title: result.name, message: result.message, data });
      } catch (error) {
        console.error("[alerts] rule check failed", ruleId, error);
      }
    }
  },
});

/** Loads a saved rule's links for a test. Checks the signed-in person can open the project. */
export const loadForTest = internalQuery({
  args: { ruleId: v.id("alertRules") },
  handler: async (ctx, { ruleId }) => {
    const rule = await ctx.db.get(ruleId);
    if (!rule) throw new Error("Rule not found");
    await requireProject(ctx, rule.projectId);
    const recent = await ctx.db.query("alertDeliveries").withIndex("by_ruleId", (q) => q.eq("ruleId", ruleId)).order("desc").take(4);
    const justTested = recent.some((item) => item.kind === "test" && Date.now() - item.at < 5_000);
    return { name: rule.name, metric: rule.metric, threshold: rule.threshold, projectId: rule.projectId as string, slackUrl: rule.slackUrl, webhookUrl: rule.webhookUrl, justTested };
  },
});

export const projectForTest = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => { await requireProject(ctx, projectId); return true; },
});

type TestOutcome = { slack?: DeliveryResult; webhook?: DeliveryResult };

/** "Send a test" on a saved rule: posts a clearly-labelled test message to its Slack and webhook and records the result. */
export const sendTest = action({
  args: { ruleId: v.id("alertRules") },
  handler: async (ctx, { ruleId }): Promise<TestOutcome> => {
    const rule: { name: string; metric: string; threshold: number; projectId: string; slackUrl?: string; webhookUrl?: string; justTested: boolean } = await ctx.runQuery(internal.alertRules.loadForTest, { ruleId });
    if (!rule.slackUrl && !rule.webhookUrl) throw new Error("This rule has no Slack or webhook link to test");
    if (rule.justTested) throw new Error("A test was just sent. Wait a few seconds and try again.");
    return await sendToDestinations(ctx, ruleId, "test", rule, `This is a test from Tracify for "${rule.name}". Real alerts will look like this.`, undefined, { slack: rule.slackUrl, webhook: rule.webhookUrl });
  },
});

/** "Send a test" from the new-rule form, before anything is saved. Nothing is stored. */
export const testLink = action({
  args: { projectId: v.id("projects"), slackUrl: v.optional(v.string()), webhookUrl: v.optional(v.string()) },
  handler: async (ctx, args): Promise<TestOutcome> => {
    await ctx.runQuery(internal.alertRules.projectForTest, { projectId: args.projectId });
    const slack = cleanSlackUrl(args.slackUrl);
    const webhook = cleanWebhookUrl(args.webhookUrl);
    if (!slack && !webhook) throw new Error("Paste a link first");
    const info = { event: "alert.test" as const, ruleName: "Test", metric: "failed_runs", threshold: 0, message: "This is a test from Tracify. Real alerts will look like this.", projectId: args.projectId as string, dashboardUrl: dashboardUrl(args.projectId), at: new Date().toISOString() };
    const [slackResult, webhookResult] = await Promise.all([slack ? postJson("slack", slack, slackPayload(info)) : undefined, webhook ? postJson("webhook", webhook, webhookPayload(info)) : undefined]);
    return { slack: slackResult, webhook: webhookResult };
  },
});

export type AlertRuleDoc = Doc<"alertRules">;
