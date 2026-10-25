import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { PricingPage } from "@/components/marketing/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing: 25,000 free spans a month",
  description: "Start free, then pay by spans per month. Tracify pricing for AI agent tracing, cost tracking and evaluation: Free, Pro, Team and Enterprise plans.",
  alternates: { canonical: "/pricing", languages: languageAlternates("/pricing") },
};

// Reads STRIPE_FOUNDING_COUPON_ID per request so the founding strip appears the moment the coupon is set.
export const dynamic = "force-dynamic";

export default function Page() {
  return <PricingPage founding={Boolean(process.env.STRIPE_FOUNDING_COUPON_ID)} />;
}
