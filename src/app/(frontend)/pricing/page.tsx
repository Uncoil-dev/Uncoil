import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { PricingPage } from "@/components/marketing/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing: 25,000 free spans a month",
  description: "Start free, then pay by spans per month. Tracify pricing for AI agent tracing, cost tracking and evaluation: Free, Pro, Team and Enterprise plans.",
  alternates: { canonical: "/pricing", languages: languageAlternates("/pricing") },
};

// Served as a cached static page and rebuilt every 5 minutes, so the founding strip (STRIPE_FOUNDING_COUPON_ID) appears within minutes without a per-request render.
export const revalidate = 300;

export default function Page() {
  return <PricingPage founding={Boolean(process.env.STRIPE_FOUNDING_COUPON_ID)} />;
}
