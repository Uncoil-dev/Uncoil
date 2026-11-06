import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { getStripe, planForPrice } from "@/lib/stripe";
import { getDeploymentRegion } from "@/lib/regions";

/** Pay-first checkout: link a paid, unclaimed Stripe session to the project the customer just created. */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    const body = await request.json() as { sessionId?: string; projectId?: string };
    if (!body.sessionId?.startsWith("cs_") || !body.projectId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const client = await getAuthedConvexClient();
    const projectId = body.projectId as Id<"projects">;
    const project = await client.query(api.projects.getProjectForAdmin, { projectId });
    if (!project) return NextResponse.json({ error: "Project not found or admin access required" }, { status: 403 });
    if (project.stripeSubscriptionId && project.stripeSubscriptionStatus !== "canceled") return NextResponse.json({ error: "This project already has a subscription" }, { status: 409 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(body.sessionId, { expand: ["subscription"] });
    if (session.metadata?.guest !== "1" || session.metadata?.uncoilRegion !== getDeploymentRegion()) return NextResponse.json({ error: "This payment cannot be linked" }, { status: 400 });
    if (session.status !== "complete" || session.payment_status === "unpaid" || !session.customer || !session.subscription || typeof session.subscription === "string") {
      return NextResponse.json({ error: "Payment is not finished yet. Try again in a moment." }, { status: 409 });
    }
    const subscription = session.subscription;
    if (subscription.metadata.projectId) return NextResponse.json({ error: "This payment is already linked to a project" }, { status: 409 });
    const customerId = String(session.customer);
    const syncSecret = process.env.STRIPE_SYNC_SECRET;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!syncSecret || !convexUrl) return NextResponse.json({ error: "Billing sync not configured" }, { status: 503 });

    // Mark it claimed first so a second request cannot reuse the same payment.
    await stripe.subscriptions.update(subscription.id, { metadata: { projectId, guest: "" } });
    await stripe.customers.update(customerId, { name: project.name, metadata: { projectId, uncoilRegion: getDeploymentRegion() } });
    const item = subscription.items.data[0];
    await new ConvexHttpClient(convexUrl).mutation(api.billing.syncSubscription, {
      syncSecret,
      projectId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      stripePriceId: item?.price.id,
      planTier: planForPrice(item?.price.id),
      currentPeriodEnd: item?.current_period_end ? item.current_period_end * 1000 : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Stripe claim failed", error);
    return NextResponse.json({ error: "Could not link your payment. Contact support with your receipt." }, { status: 502 });
  }
}
