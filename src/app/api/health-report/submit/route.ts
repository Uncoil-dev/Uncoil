import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { getStripe } from "@/lib/stripe";
import { getDeploymentRegion } from "@/lib/regions";
import { MIN_REPORT_SPANS, buildHealthReport, parseSpans } from "@/lib/health-report";

const MAX_BODY_BYTES = 12 * 1024 * 1024;

/** After payment: take the customer's runs, build the report, store it, and return the private link. */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Not set up yet." }, { status: 503 });
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "That file is too big. Send up to about 50,000 steps." }, { status: 413 });
    let body: { sessionId?: string; data?: string };
    try { body = JSON.parse(raw) as typeof body; } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
    if (!body.sessionId?.startsWith("cs_") || typeof body.data !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const session = await getStripe().checkout.sessions.retrieve(body.sessionId);
    if (session.metadata?.product !== "health_report" || session.metadata?.uncoilRegion !== getDeploymentRegion()) return NextResponse.json({ error: "This payment is not for a health report." }, { status: 400 });
    if (session.status !== "complete" || session.payment_status === "unpaid") return NextResponse.json({ error: "Payment is not finished yet. Try again in a moment." }, { status: 409 });

    const { spans, skipped } = parseSpans(body.data);
    if (spans.length < MIN_REPORT_SPANS) {
      return NextResponse.json({ error: `We could read ${spans.length} steps. We need at least ${MIN_REPORT_SPANS}, each with a run id and a time. Check the format below, then try again.` }, { status: 422 });
    }
    const report = buildHealthReport(spans, { skippedRows: skipped });
    const syncSecret = process.env.STRIPE_SYNC_SECRET;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!syncSecret || !convexUrl) return NextResponse.json({ error: "Not set up yet." }, { status: 503 });
    const saved = await new ConvexHttpClient(convexUrl).mutation(api.healthReports.saveReport, {
      syncSecret,
      stripeSessionId: session.id,
      token: randomBytes(24).toString("base64url"),
      email: session.customer_details?.email ?? undefined,
      reportJson: JSON.stringify(report),
    });
    return NextResponse.json({ token: saved.token });
  } catch (error) {
    console.error("Health report build failed", error);
    return NextResponse.json({ error: "Could not build the report. Please try again." }, { status: 500 });
  }
}
