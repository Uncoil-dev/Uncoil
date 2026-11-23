import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Stripe is not configured");
  // Keep requests pinned to the API version in use today. The SDK types only accept
  // its own newest literal, so the cast is intentional and must not be "fixed" by bumping.
  stripeClient ??= new Stripe(apiKey, { apiVersion: "2026-08-26.dahlia" as Stripe.LatestApiVersion });
  return stripeClient;
}

export const stripePriceIds = {
  pro: { monthly: process.env.STRIPE_PRICE_PRO_MONTHLY, annual: process.env.STRIPE_PRICE_PRO_ANNUAL },
  team: { monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY, annual: process.env.STRIPE_PRICE_TEAM_ANNUAL },
} as const;

export function planForPrice(priceId: string | null | undefined) {
  if (!priceId) return undefined;
  if ([stripePriceIds.pro.monthly, stripePriceIds.pro.annual].includes(priceId)) return "pro" as const;
  if ([stripePriceIds.team.monthly, stripePriceIds.team.annual].includes(priceId)) return "team" as const;
  return undefined;
}
