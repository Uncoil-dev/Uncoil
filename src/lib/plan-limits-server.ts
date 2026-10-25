import { enforcedSpanLimit, monthKey, planLimitMessage, secondsUntilNextMonth } from "@/lib/plan-limits";
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
