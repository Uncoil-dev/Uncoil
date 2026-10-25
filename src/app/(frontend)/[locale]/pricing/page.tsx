import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingPage } from "@/components/marketing/pricing/pricing-page";
import { getCopy, isLocale, languageAlternates, localizedPath, ogLocale } from "@/lib/i18n";
import { ogImageUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getCopy(locale).pricing;
  const path = localizedPath(locale, "/pricing");
  const image = ogImageUrl({ title: t.metaTitle, kicker: "Tracify" });
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: path, languages: languageAlternates("/pricing") },
    openGraph: { title: `${t.metaTitle} | Tracify`, description: t.metaDescription, url: path, siteName: "Tracify", locale: ogLocale[locale], type: "website", images: [{ url: image, width: 1200, height: 630, alt: `${t.metaTitle} | Tracify` }] },
    twitter: { card: "summary_large_image", title: `${t.metaTitle} | Tracify`, description: t.metaDescription, images: [image] },
  };
}

// Served as a cached static page and rebuilt every 5 minutes, so the founding strip (STRIPE_FOUNDING_COUPON_ID) appears within minutes without a per-request render.
export const revalidate = 300;

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PricingPage locale={locale} founding={Boolean(process.env.STRIPE_FOUNDING_COUPON_ID)} />;
}
