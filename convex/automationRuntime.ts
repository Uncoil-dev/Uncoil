import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

export type AutomationEvent = { source: string; title: string; message: string; data?: Record<string, unknown> };

const THROTTLE_MS: Record<string, number> = { "run.failed": 60_000 };

/** Turns a rule and an event into the request to send. Pure, so it is tested without the network. */
export function buildDelivery(actionType: string, destination: string, event: AutomationEvent, projectId: string, at: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "Uncoil-Automations/1.0" };
  if (actionType === "slack") {
    return { url: destination, headers, body: { text: `:zap: *${event.title}*\n${event.message}` } };
  }
  if (actionType === "github_dispatch") {
    const token = process.env.AUTOMATIONS_GITHUB_TOKEN;
    if (!token) throw new Error("No GitHub token is set up on the server yet (AUTOMATIONS_GITHUB_TOKEN)");
    return {
      url: `https://api.github.com/repos/${destination}/dispatches`,
      headers: { ...headers, Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: { event_type: `uncoil.${event.source}`, client_payload: { title: event.title, message: event.message, projectId, firedAt: at, ...event.data } },
    };
  }
  return { url: destination, headers, body: { event: event.source, title: event.title, message: event.message, data: event.data ?? {}, projectId, firedAt: at } };
}

export async function deliver(actionType: string, destination: string, event: AutomationEvent, projectId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const request = buildDelivery(actionType, destination, event, projectId, new Date().toISOString());
    const response = await fetch(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(request.body), redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return { ok: false, error: `The other side answered ${response.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not reach the destination" };
  }
}

/** Sends one event to every active rule listening for it, and records how each delivery went. */
export const dispatch = internalAction({
  args: { projectId: v.id("projects"), source: v.string(), title: v.string(), message: v.string(), data: v.optional(v.any()) },
  handler: async (ctx, args): Promise<{ matched: number; sent: number }> => {
    const rules: Doc<"automations">[] = await ctx.runQuery(internal.automations.matching, { projectId: args.projectId, eventSource: args.source });
    const now = Date.now();
    const gap = THROTTLE_MS[args.source] ?? 0;
    let sent = 0;
    for (const rule of rules) {
      if (gap && rule.lastFiredAt && now - rule.lastFiredAt < gap) continue;
      const result = await deliver(rule.actionType, rule.destination, { source: args.source, title: args.title, message: args.message, data: args.data }, args.projectId);
      await ctx.runMutation(internal.automations.recordDelivery, { automationId: rule._id, ok: result.ok, error: result.ok ? undefined : result.error, at: now });
      if (result.ok) sent += 1;
    }
    return { matched: rules.length, sent };
  },
});
