import { NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { getStripe, stripePriceIds } from "@/lib/stripe";
import { getDeploymentRegion } from "@/lib/regions";
import { getPublicOrigin } from "@/lib/public-origin";

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  const stripe = getStripe();
  const region = getDeploymentRegion();
  const body = await request.json() as { projectId?: string; plan?: "pro" | "team"; interval?: "monthly" | "annual"; promo?: boolean };
  if (!body.plan || !body.interval || !["pro", "team"].includes(body.plan) || !["monthly", "annual"].includes(body.interval)) return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  // Pay-first: no project yet. The customer pays, then signs up and names the project on the welcome page.
  const guest = !body.projectId;
  const client = guest ? null : await getAuthedConvexClient();
  const projectId = body.projectId as Id<"projects"> | undefined;
  const project = client && projectId ? await client.query(api.projects.getProjectForAdmin, { projectId }) : null;
  if (!guest && !project) return NextResponse.json({ error: "Project not found or admin access required" }, { status: 403 });
  if (project?.stripeSubscriptionId && project.stripeSubscriptionStatus !== "canceled") {
    return NextResponse.json({ error: "Manage the existing subscription in the billing portal" }, { status: 409 });
  }
  const price = stripePriceIds[body.plan][body.interval];
  if (!price) return NextResponse.json({ error: "Stripe price is not configured" }, { status: 503 });

  let customer = project?.stripeCustomerId ?? undefined;
  if (client && project && projectId && !customer) {
    const created = await stripe.customers.create({ name: project.name, metadata: { projectId, uncoilRegion: region } });
    customer = created.id;
    await client.mutation(api.billing.attachCustomer, { projectId, stripeCustomerId: customer });
  }
  const origin = getPublicOrigin(request);
  const plan = body.plan;
  const createSession = (discounts?: { coupon: string }[]) =>
    stripe.checkout.sessions.create(
      {
        mode: "subscription",
        managed_payments: { enabled: true },
        ...(customer ? { customer } : {}),
        line_items: [{ price, quantity: 1 }],
        // Stripe does not allow preset discounts and the promo code box together.
        ...(discounts ? { discounts } : { allow_promotion_codes: true }),
        ...(projectId ? { client_reference_id: projectId } : {}),
        metadata: { ...(projectId ? { projectId } : { guest: "1" }), plan, uncoilRegion: region },
        subscription_data: { metadata: { ...(projectId ? { projectId } : { guest: "1" }), plan, uncoilRegion: region }, billing_mode: { type: "flexible" } },
        success_url: projectId ? `${origin}/dashboard/${projectId}/billing?checkout=success` : `${origin}/pricing/checkout/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: projectId ? `${origin}/dashboard/${projectId}/billing?checkout=cancelled` : `${origin}/pricing/checkout?plan=${plan}&interval=${body.interval}&cancelled=1`,
        integration_identifier: "uncoil_checkout_qplmzvka",
      },
      { apiVersion: "2026-02-25.preview" },
    );
  // Founding-member coupon: 40% off forever, capped at 20 redemptions inside Stripe itself.
  // When it is used up (or rejected), fall back to the normal price rather than blocking checkout.
  const foundingCoupon = process.env.STRIPE_FOUNDING_COUPON_ID;
  let session;
  // "Have a code?": skip the automatic discount so Stripe shows its promotion code box.
  if (foundingCoupon && !body.promo) {
    try {
      session = await createSession([{ coupon: foundingCoupon }]);
    } catch (error) {
      console.warn("Founding coupon not applied, using the normal price", error);
    }
  }
  session ??= await createSession();
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    const message = error instanceof Error ? error.message : "Checkout is unavailable right now.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
