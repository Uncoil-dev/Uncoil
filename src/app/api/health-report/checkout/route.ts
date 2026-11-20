import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDeploymentRegion } from "@/lib/regions";
import { getPublicOrigin } from "@/lib/public-origin";

/** One-off checkout for the agent health report. No login needed: the customer pays, then uploads their runs. */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Checkout is not set up yet." }, { status: 503 });
    const price = process.env.STRIPE_PRICE_HEALTH_REPORT;
    if (!price) return NextResponse.json({ error: "The health report is not on sale yet." }, { status: 503 });
    const origin = getPublicOrigin(request);
    const region = getDeploymentRegion();
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        managed_payments: { enabled: true },
        line_items: [{ price, quantity: 1 }],
        allow_promotion_codes: true,
        metadata: { product: "health_report", uncoilRegion: region },
        payment_intent_data: { metadata: { product: "health_report", uncoilRegion: region } },
        success_url: `${origin}/pricing/checkout/health-report?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/health-report`,
        integration_identifier: "uncoil_checkout_qplmzvka",
      },
      { apiVersion: "2026-02-25.preview" },
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Health report checkout failed", error);
    return NextResponse.json({ error: "Checkout is unavailable right now. Please try again in a minute." }, { status: 502 });
  }
}
