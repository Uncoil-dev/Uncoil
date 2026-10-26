import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { ABUSE_STRIKE_LIMIT, ABUSE_STRIKE_WINDOW_SECONDS, dailySpanLimit, enforcedSpanLimit, monthKey, planLimitMessage, secondsUntilNextDay, secondsUntilNextMonth } from "@/lib/plan-limits";
import { consumeRateLimit } from "@/lib/redis-cache";

/**
 * Counts incoming spans against the project's monthly plan limit.
 * Returns a 429 response when the project is over its limit, or null when the data may be saved.
 * A batch that crosses the limit is refused whole.
 */
export async function planLimitResponse(project: { _id: unknown; planTier?: string }, spans = 1): Promise<Response | null> {
  const spanLimit = enforcedSpanLimit(project.planTier);
  if (spanLimit === null || spans < 1) return null;
  const month = new Date();
  try {
    const dayLimit = dailySpanLimit(project.planTier);
    if (dayLimit !== null) {
      const daily = await consumeRateLimit(`ingest-day:${String(project._id)}:${month.toISOString().slice(0, 10)}`, spans, dayLimit, 2 * 24 * 3600);
      if (!daily.allowed) {
        const retryAfterSeconds = secondsUntilNextDay(month);
        return Response.json(
          { error: `This Free project reached its daily limit of ${dayLimit.toLocaleString("en-US")} spans. New data is saved again after midnight UTC.`, code: "daily_limit_reached", limit: dayLimit, retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "X-Tracify-Daily-Limit": String(dayLimit) } },
        );
      }
    }
    const monthly = await consumeRateLimit(`ingest-month:${String(project._id)}:${monthKey(month)}`, spans, spanLimit, 40 * 24 * 3600);
    if (monthly.allowed) return null;
    const retryAfterSeconds = secondsUntilNextMonth(month);
    return Response.json(
      { error: planLimitMessage(spanLimit, project.planTier), code: "plan_limit_reached", limit: spanLimit, retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "X-Tracify-Plan-Limit": String(spanLimit) } },
    );
  } catch (error) {
    // A broken counter must never drop customer data: accept the span and carry on.
    console.warn("Monthly plan counter unavailable; accepting data:", error);
    return null;
  }
}

/**
 * Counts a rate-limit refusal against a Free key. Too many in ten minutes pauses the key
 * (the owner can make a new one on the API keys page). Paid plans are never paused here.
 */
export async function recordRateLimitStrike(project: { _id: unknown; planTier?: string }, apiKeyHash: string) {
  if ((project.planTier ?? "free") !== "free") return;
  try {
    const strike = await consumeRateLimit(`ingest-strikes:${String(project._id)}`, 1, ABUSE_STRIKE_LIMIT, ABUSE_STRIKE_WINDOW_SECONDS);
    if (strike.allowed) return;
    await getConvexClient().mutation(api.projects.pauseApiKeyForAbuse, {
      projectId: project._id as Id<"projects">,
      apiKeyHash,
      reason: "Repeated rate-limit refusals on the Free plan",
    });
  } catch (error) {
    console.warn("Abuse check unavailable; leaving the key active:", error);
  }
}
