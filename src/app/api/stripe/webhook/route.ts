import Stripe from "stripe";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getStripe, planForPrice } from "@/lib/stripe";
import { getDeploymentRegion } from "@/lib/regions";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return new NextResponse("Stripe is not configured", { status: 503 });
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Webhook not configured", { status: 503 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return new NextResponse("Invalid signature", { status: 400 }); }

  const eventRegion = "metadata" in event.data.object
    ? (event.data.object.metadata as Record<string, string> | null)?.uncoilRegion
    : undefined;
  if (eventRegion && eventRegion !== getDeploymentRegion()) {
    return new NextResponse("Event belongs to another Uncoil region", { status: 409 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const syncSecret = process.env.STRIPE_SYNC_SECRET;
  if (!convexUrl || !syncSecret) return new NextResponse("Billing sync not configured", { status: 503 });
  const client = new ConvexHttpClient(convexUrl);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await client.mutation(api.billing.syncSubscription, {
      syncSecret,
      projectId: session.client_reference_id as Id<"projects">,
      stripeCustomerId: String(session.customer),
      stripeSubscriptionId: session.subscription ? String(session.subscription) : undefined,
    });
  }
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    const item = subscription.items.data[0];
    await client.mutation(api.billing.syncSubscription, {
      syncSecret,
      projectId: subscription.metadata.projectId as Id<"projects"> | undefined,
      stripeCustomerId: String(subscription.customer),
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      stripePriceId: item?.price.id,
      planTier: planForPrice(item?.price.id),
      currentPeriodEnd: item?.current_period_end ? item.current_period_end * 1000 : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }
  return NextResponse.json({ received: true });
}
