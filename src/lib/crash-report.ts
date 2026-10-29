import { createHash } from "node:crypto";

import { consumeRateLimit } from "@/lib/redis-cache";
import { sendTransactionalEmail } from "@/lib/transactional-email";

export type CrashReport = {
  source: "server" | "browser";
  message: string;
  stack?: string;
  route?: string;
  digest?: string;
};

// One email per distinct error per hour, and never more than 20 crash emails an hour overall.
const PER_ERROR_WINDOW_SECONDS = 60 * 60;
const GLOBAL_LIMIT_PER_HOUR = 20;

const clip = (value: string | undefined, max: number) => (value ?? "").slice(0, max);

// Strip emails and long tokens so a crash email never carries customer data or keys.
export function scrub(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:tracify_sk_live_|sk-|Bearer\s+)[A-Za-z0-9_\-.]{8,}/g, "[key]");
}

export function crashFingerprint(report: CrashReport) {
  const firstFrame = clip(report.stack, 2000).split("\n").find((line) => line.trim().startsWith("at ")) ?? "";
  return createHash("sha256").update([report.source, report.message, firstFrame].join("|")).digest("hex").slice(0, 16);
}

export async function reportCrash(input: CrashReport) {
  const report: CrashReport = {
    source: input.source,
    message: scrub(clip(input.message, 500)),
    stack: scrub(clip(input.stack, 4000)),
    route: clip(input.route, 200),
    digest: clip(input.digest, 64),
  };
  const fingerprint = crashFingerprint(report);
  // Always lands in the Coolify container log, even if email or Redis is down.
  console.error("[crash]", JSON.stringify({ fingerprint, ...report }));

  try {
    const perError = await consumeRateLimit(`crash:${fingerprint}`, 1, 1, PER_ERROR_WINDOW_SECONDS);
    if (!perError.allowed) return { emailed: false as const, reason: "duplicate" as const };
    const overall = await consumeRateLimit("crash:all", 1, GLOBAL_LIMIT_PER_HOUR, 60 * 60);
    if (!overall.allowed) return { emailed: false as const, reason: "throttled" as const };

    const to = process.env.CRASH_ALERT_EMAIL || process.env.EMAIL_REPLY_TO || "kb@tracify.tech";
    const env = process.env.UNCOIL_ENVIRONMENT || process.env.TRACIFY_ENVIRONMENT || process.env.NODE_ENV || "production";
    const lines = [
      `Where: ${report.source}${report.route ? ` ${report.route}` : ""}`,
      `Environment: ${env}`,
      report.digest ? `Ref: ${report.digest}` : "",
      "",
      report.message,
      "",
      report.stack ?? "",
    ].filter((line, i, all) => line || all[i - 1] !== "");
    const text = lines.join("\n");
    const html = `<pre style="font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
    await sendTransactionalEmail({
      to,
      subject: `Tracify crash: ${report.message.slice(0, 80) || "unknown error"}`,
      html,
      text,
      idempotencyKey: `crash-${fingerprint}-${Math.floor(Date.now() / (PER_ERROR_WINDOW_SECONDS * 1000))}`,
    });
    return { emailed: true as const };
  } catch (error) {
    console.error("[crash] alert not sent", error instanceof Error ? error.message : error);
    return { emailed: false as const, reason: "error" as const };
  }
}
