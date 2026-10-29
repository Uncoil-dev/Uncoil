import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { ABUSE_STRIKE_LIMIT, ABUSE_STRIKE_WINDOW_SECONDS, dailySpanLimit, enforcedSpanLimit, monthKey, planLimitMessage, secondsUntilNextDay, secondsUntilNextMonth } from "@/lib/plan-limits";
import { consumeRateLimit } from "@/lib/redis-cache";

/**
 * Counts incoming spans against the project's monthly plan limit.
 * Returns a 429 response when the project is over its limit, or null when the data may be saved.
 * A batch that crosses the limit is refused whole.
 */
export async function planLimitResponse(project: { _id: unknown; planTier?: string; name?: string }, spans = 1): Promise<Response | null> {
  const spanLimit = enforcedSpanLimit(project.planTier);
  if (spanLimit === null || spans < 1) return null;
  const month = new Date();
  try {
    const dayLimit = dailySpanLimit(project.planTier);
    if (dayLimit !== null) {
      const daily = await consumeRateLimit(`ingest-day:${String(project._id)}:${month.toISOString().slice(0, 10)}`, spans, dayLimit, 2 * 24 * 3600);
      if (!daily.allowed) {
        void alertUncoilOnce(project, `daily-cap:${month.toISOString().slice(0, 10)}`, `Free project hit its daily cap of ${dayLimit.toLocaleString("en-US")} spans`);
        const retryAfterSeconds = secondsUntilNextDay(month);
        return Response.json(
          { error: `This Free project reached its daily limit of ${dayLimit.toLocaleString("en-US")} spans. New data is saved again after midnight UTC.`, code: "daily_limit_reached", limit: dayLimit, retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "X-Uncoil-Daily-Limit": String(dayLimit) } },
        );
      }
    }
    const monthly = await consumeRateLimit(`ingest-month:${String(project._id)}:${monthKey(month)}`, spans, spanLimit, 40 * 24 * 3600);
    if (monthly.allowed) return null;
    const retryAfterSeconds = secondsUntilNextMonth(month);
    return Response.json(
      { error: planLimitMessage(spanLimit, project.planTier), code: "plan_limit_reached", limit: spanLimit, retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "X-Uncoil-Plan-Limit": String(spanLimit) } },
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
export async function recordRateLimitStrike(project: { _id: unknown; planTier?: string; name?: string }, apiKeyHash: string) {
  if ((project.planTier ?? "free") !== "free") return;
  try {
    const strike = await consumeRateLimit(`ingest-strikes:${String(project._id)}`, 1, ABUSE_STRIKE_LIMIT, ABUSE_STRIKE_WINDOW_SECONDS);
    if (strike.allowed) return;
    await getConvexClient().mutation(api.projects.pauseApiKeyForAbuse, {
      projectId: project._id as Id<"projects">,
      apiKeyHash,
      reason: "Repeated rate-limit refusals on the Free plan",
    });
    await alertUncoilOnce(project, "paused", "Free API key paused after repeated rate-limit refusals");
  } catch (error) {
    console.warn("Abuse check unavailable; leaving the key active:", error);
  }
}

/** Emails the Uncoil team once per project and event, so we notice a spike before the database does. Never throws. */
async function alertUncoilOnce(project: { _id: unknown; name?: string }, event: string, what: string) {
  try {
    const first = await consumeRateLimit(`abuse-alert:${String(project._id)}:${event}`, 1, 1, 2 * 24 * 3600);
    if (!first.allowed) return;
    const to = (process.env.UNCOIL_ABUSE_ALERT_EMAIL ?? process.env.TRACIFY_ABUSE_ALERT_EMAIL) || "kb@uncoil.dev";
    const label = project.name ? `${project.name} (${String(project._id)})` : String(project._id);
    await sendTransactionalEmail({
      to,
      subject: `[Uncoil] ${what}`,
      text: `${what}.\n\nProject: ${label}\nTime: ${new Date().toISOString()}\n\nSee it in the admin page: https://eu.cloud.uncoil.dev/admin`,
      html: `<p>${what}.</p><p>Project: ${label}<br>Time: ${new Date().toISOString()}</p><p><a href="https://eu.cloud.uncoil.dev/admin">Open the admin page</a></p>`,
      idempotencyKey: `abuse-alert-${String(project._id)}-${event}`,
    });
  } catch (error) {
    console.warn("Abuse alert email could not be sent:", error);
  }
}
