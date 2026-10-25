/** Sending helpers shared by alert rules, cost budgets and the weekly summary. */

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

export type DeliveryResult = { ok: boolean; status?: number; error?: string };

/** Plain-words reason a Slack or webhook post failed, shown next to the rule. */
export function explainFailure(kind: string, status: number | undefined, body: string): string {
  const text = body.trim().slice(0, 120);
  if (kind === "slack") {
    if (/no_service|invalid_token|token_revoked/.test(text) || status === 404) return "Slack says this link no longer works. Create a new incoming webhook and paste it again.";
    if (/channel_not_found|channel_is_archived/.test(text)) return "Slack can't find the channel for this link. It may have been deleted or archived.";
    if (/action_prohibited/.test(text) || status === 403) return "Slack refused the message. Ask a workspace admin to allow this webhook.";
    if (status === 429) return "Slack is rate-limiting this link. It will work again shortly.";
  }
  if (status === undefined) return "Could not reach the address. Check the link and that the service is online.";
  if (status === 401 || status === 403) return `The address refused the message (${status}). Check any password or key it needs.`;
  if (status === 404 || status === 410) return `The address was not found (${status}). The link may have been removed.`;
  if (status >= 300 && status < 400) return `The address redirected (${status}). Paste the final link instead; redirects are not followed.`;
  if (status === 429) return "The address is rate-limiting us (429).";
  if (status >= 500) return `The address had a server error (${status}).`;
  return `The address replied ${status}.`;
}

/**
 * Posts JSON once and says how it went. Never throws, so one failed destination cannot stop the others.
 * Retries one time on network errors and 5xx. Slack answers 200 with an error word in the body for some problems, so the body is checked too.
 */
export async function postJson(kind: string, url: string, body: unknown): Promise<DeliveryResult> {
  let last: DeliveryResult = { ok: false, error: "Not sent" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "Tracify-Alerts/1.0" }, body: JSON.stringify(body), redirect: "manual", signal: AbortSignal.timeout(10_000) });
      const text = await response.text().catch(() => "");
      const slackRejected = kind === "slack" && response.ok && text.trim() !== "" && text.trim() !== "ok";
      if (response.ok && !slackRejected) return { ok: true, status: response.status };
      last = { ok: false, status: response.status, error: explainFailure(kind, response.status, text) };
      console.error(`[alerts] ${kind} returned`, response.status, text.slice(0, 80));
      if (response.status < 500) return last;
    } catch (error) {
      console.error(`[alerts] ${kind} failed`, error);
      last = { ok: false, error: explainFailure(kind, undefined, "") };
    }
  }
  return last;
}

/** Sends through Resend. Without RESEND_API_KEY it logs and skips, so nothing breaks before the key is added. */
export async function sendEmail(args: { to: string[]; subject: string; text: string; html: string; idempotencyKey: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.info("[alerts] no RESEND_API_KEY set, email skipped:", args.subject); return; }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": args.idempotencyKey },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "Tracify <alerts@tracify.tech>", to: args.to, subject: args.subject, text: args.text, html: args.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("[alerts] email provider returned", response.status);
  } catch (error) {
    console.error("[alerts] email failed", error);
  }
}
