import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildDiscordAlertPayload } from "./discordAlert";

const SITE = process.env.SITE_URL || "https://www.uncoil.dev";

/** The Discord address and project name for an alert; kept internal so the address never reaches a client. */
export const webhookForProject = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db.get(projectId);
    if (!project?.discordWebhookUrl) return null;
    return { url: project.discordWebhookUrl, name: project.name };
  },
});

/** Posts one alert to the project's Discord channel. A failed post is logged, never retried or thrown. */
export const deliver = internalAction({
  args: {
    projectId: v.id("projects"),
    runId: v.string(),
    type: v.string(),
    message: v.string(),
    failingStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(internal.discordAlerts.webhookForProject, { projectId: args.projectId });
    if (!target) return null;
    try {
      const response = await fetch(target.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildDiscordAlertPayload({
          projectName: target.name,
          ruleLabel: args.type.replace(/_/g, " "),
          message: args.message,
          failingStep: args.failingStep,
          runUrl: `${SITE}/dashboard/${args.projectId}/runs/${args.runId}`,
        })),
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error("Discord alert failed", { status: response.status });
    } catch (error) {
      console.error("Discord alert failed", { error: error instanceof Error ? error.name : "unknown" });
    }
    return null;
  },
});
