import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { escapeHtml, sendEmail } from "./notify";
import { monthKey, shouldWarnAboutUsage } from "../src/lib/plan-limits";
import { planById } from "../src/lib/pricing-plans";

const RUN_SCAN_LIMIT = 20_000;

type Due = { projectId: Id<"projects">; name: string; ownerId: string; spans: number };
type Page = { due: Due[]; month: string; continueCursor: string | null };

/** One page of projects; returns the Free ones that passed 80% of the month's spans and were not warned yet. */
export const pageToCheck = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }): Promise<Page> => {
    const now = new Date();
    const month = monthKey(now);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const page = await ctx.db.query("projects").paginate({ numItems: 50, cursor });
    const due: Due[] = [];
    for (const project of page.page) {
      const ownerId = project.ownerId ?? project.clerkUserId;
      if (!ownerId || (project.planTier ?? "free") !== "free" || project.usageWarnedMonth === month) continue;
      const runs = await ctx.db
        .query("agentRuns")
        .withIndex("by_projectId_createdAt", (q) => q.eq("projectId", project._id).gte("createdAt", monthStart))
        .take(RUN_SCAN_LIMIT);
      const spans = runs.reduce((sum, run) => sum + run.spanCount, 0);
      if (shouldWarnAboutUsage(spans, project.planTier, project.usageWarnedMonth, month)) due.push({ projectId: project._id, name: project.name, ownerId, spans });
    }
    return { due, month, continueCursor: page.isDone ? null : page.continueCursor };
  },
});

/** Marks the month as warned before sending, so a retry never emails the same project twice. */
export const markWarned = internalMutation({
  args: { projectId: v.id("projects"), month: v.string() },
  handler: async (ctx, { projectId, month }) => {
    const project = await ctx.db.get(projectId);
    if (!project || project.usageWarnedMonth === month) return false;
    await ctx.db.patch(projectId, { usageWarnedMonth: month });
    return true;
  },
});

const SITE = process.env.SITE_URL || "https://www.uncoil.dev";

/** The 80% email. Upgrade links go to the project's billing page, so the upgrade lands on the right project. */
export function usageWarningEmail(item: { name: string; projectId: string; spans: number }) {
  const free = planById("free");
  const pro = planById("pro");
  const billingUrl = `${SITE}/dashboard/${item.projectId}/billing`;
  const percent = Math.min(999, Math.round((item.spans / free.spanLimit) * 100));
  const headline = `"${item.name}" has used ${percent}% of this month's ${free.spans} free spans.`;
  const detail = `When it reaches 100%, new data is not saved until the month resets. Pro is $${pro.monthly} a month for ${pro.spans} spans.`;
  return {
    subject: `Your Uncoil project "${item.name}" is at ${percent}% of the free limit`,
    text: `${headline}\n\n${detail}\n${billingUrl}\n\nNothing to do if you are fine with the limit.`,
    html: `<p>${escapeHtml(headline)}</p><p>${escapeHtml(detail)} <a href="${billingUrl}">See plans for this project</a>.</p><p>Nothing to do if you are fine with the limit.</p>`,
  };
}

/** Emails the owner of each Free project that has used 80% of its monthly spans. Once per project per month. */
export const checkAll = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    do {
      const result: Page = await ctx.runQuery(internal.usageNotices.pageToCheck, { cursor });
      for (const item of result.due) {
        try {
          const owner = (await ctx.runQuery(components.betterAuth.adapter.findOne, { model: "user", where: [{ field: "id", value: item.ownerId }] })) as { email?: string } | null;
          if (!owner?.email) continue;
          if (!(await ctx.runMutation(internal.usageNotices.markWarned, { projectId: item.projectId, month: result.month }))) continue;
          await sendEmail({ to: [owner.email], ...usageWarningEmail(item), idempotencyKey: `usage-warn-${item.projectId}-${result.month}` });
        } catch (error) {
          console.error("[usage-notices] failed", item.projectId, error);
        }
      }
      cursor = result.continueCursor;
    } while (cursor);
  },
});
