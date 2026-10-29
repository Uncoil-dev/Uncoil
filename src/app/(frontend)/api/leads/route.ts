import { NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { consumeRateLimit } from "@/lib/redis-cache";
import { createHash } from "node:crypto";

const limits: Record<string, number> = { name: 120, email: 200, company: 160, intent: 80, role: 120, useCase: 500, stack: 300, message: 4000, preferredTime: 120, sourcePath: 300, campaign: 160 };
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  let browserForm = false;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) { body = Object.fromEntries((await request.formData()).entries()); browserForm = true; }
    else {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as Record<string, unknown>;
    }
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 422 }); }
  if (JSON.stringify(body).length > 16_000) return browserForm ? NextResponse.redirect(new URL("/contact?submitted=error", request.url)) : NextResponse.json({ error: "Invalid request" }, { status: 422 });
  if (clean(body.website)) return NextResponse.json({ ok: true });
  if (Object.entries(body).some(([key, value]) => key !== "website" && key !== "marketingConsent" && typeof value !== "string") || Object.entries(limits).some(([key, max]) => typeof body[key] === "string" && clean(body[key]).length > max)) return browserForm ? NextResponse.redirect(new URL("/contact?submitted=error", request.url)) : NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const name = clean(body.name) || "Newsletter subscriber", email = clean(body.email).toLowerCase(), message = clean(body.message) || (clean(body.intent) === "newsletter" ? "Newsletter subscription" : "Contact request");
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || (!clean(body.intent) && !clean(body.message))) return browserForm ? NextResponse.redirect(new URL("/contact?submitted=error", request.url)) : NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const sourcePath = clean(body.sourcePath) || "/contact";
  const dedupeKey = createHash("sha256").update(`${email}|${sourcePath}|${message}`).digest("hex").slice(0, 32);
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    let rate = { allowed: true };
    try { rate = await consumeRateLimit(`uncoil:lead:${ip}`, 1, 5, 600); } catch { /* Redis is optional for local development. */ }
    if (!rate.allowed) return NextResponse.json({ error: "Please try again later" }, { status: 429 });
    const intent = clean(body.intent) || "contact";
    const marketingConsent = body.marketingConsent === true || clean(body.marketingConsent).toLowerCase() === "true" || intent === "newsletter";
    const leadId = await getConvexClient().mutation(api.leads.submit, { name, email, company: clean(body.company) || undefined, intent, role: clean(body.role) || undefined, useCase: clean(body.useCase) || undefined, stack: clean(body.stack) || undefined, message, preferredTime: clean(body.preferredTime) || undefined, marketingConsent, sourcePath, campaign: clean(body.campaign) || undefined, dedupeKey });
    const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    const text = `New Uncoil lead\n\n${name} <${email}>\nSource: ${sourcePath}`;
    let internalEmailStatus: "sent" | "failed" = "sent";
    let acknowledgementEmailStatus: "pending" | "sent" | "failed" = "pending";
    let emailError: string | undefined;
    try {
      await sendTransactionalEmail({ to: process.env.LEADS_TO_EMAIL || "hello@uncoil.dev", subject: "[Uncoil lead] New request", text, html: `<h2>New Uncoil lead</h2><p><strong>${escape(name)}</strong> &lt;${escape(email)}&gt;</p><p>${escape(message).replaceAll("\n", "<br>")}</p><p>Source: ${escape(sourcePath)}</p>`, replyTo: email, idempotencyKey: `lead-${leadId}` });
    } catch (error) { internalEmailStatus = "failed"; emailError = error instanceof Error ? error.message.slice(0, 200) : "provider failure"; }
    if (body.marketingConsent === true || clean(body.marketingConsent).toLowerCase() === "true") {
      try { await sendTransactionalEmail({ to: email, subject: "We received your Uncoil request", text: "Thanks—we received your request and usually reply within one business day.", html: "<p>Thanks—we received your request and usually reply within one business day.</p>", idempotencyKey: `lead-ack-${leadId}` }); } catch (error) { acknowledgementEmailStatus = "failed"; emailError ??= error instanceof Error ? error.message.slice(0, 200) : "provider failure"; }
    } else { acknowledgementEmailStatus = "pending"; }
    if (internalEmailStatus === "failed" || acknowledgementEmailStatus === "failed") console.error("Lead email delivery failed", { leadId, internalEmailStatus, acknowledgementEmailStatus, error: emailError });
    const deliverySecret = process.env.UNCOIL_LEAD_DELIVERY_SECRET ?? process.env.TRACIFY_LEAD_DELIVERY_SECRET;
    if (deliverySecret) await getConvexClient().mutation(api.leads.recordDelivery, { deliverySecret, leadId, internalEmailStatus, acknowledgementEmailStatus, emailError });
    return browserForm ? NextResponse.redirect(new URL("/contact?submitted=success", request.url)) : NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to submit" }, { status: 503 }); }
}
