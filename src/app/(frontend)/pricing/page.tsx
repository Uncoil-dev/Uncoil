import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/pricing/pricing-page";
import { breadcrumbJsonLd, faqJsonLd, jsonLdString, productJsonLd } from "@/lib/seo";
import { getCopy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Pricing: 25,000 free spans a month",
  description: "Start free, then pay by spans per month. Uncoil pricing for AI agent tracing, cost tracking and evaluation: Free, Pro, Team and Enterprise plans.",
  alternates: { canonical: "/pricing" },
};

// Served as a cached static page and rebuilt every 5 minutes, so the founding strip (STRIPE_FOUNDING_COUPON_ID) appears within minutes without a per-request render.
export const revalidate = 300;

export default function Page() {
  const founding = Boolean(process.env.STRIPE_FOUNDING_COUPON_ID);
  const { faqs, foundingFaq } = getCopy("en").pricing;
  const items = (founding ? [...faqs, foundingFaq] : faqs).map(([q, a]) => ({ q, a }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Pricing", path: "/pricing" }]), productJsonLd({ name: "Uncoil pricing", description: "Free, Pro, Team and Enterprise plans for AI agent tracing, cost tracking and evaluation.", path: "/pricing" }), faqJsonLd(items)]) }} />
      <PricingPage founding={founding} />
    </>
  );
}
