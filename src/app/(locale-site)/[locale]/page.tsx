import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedHome } from "@/components/marketing/locale/localized-home";
import { getCopy, isLocale, languageAlternates, localizedPath, ogLocale } from "@/lib/i18n";
import { ogImageUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const h = getCopy(locale).home;
  const path = localizedPath(locale, "/");
  const image = ogImageUrl({ title: `${h.heroA} ${h.heroB}`, kicker: "Tracify", sub: h.metaDescription, kind: "home" });
  return {
    title: { absolute: h.metaTitle },
    description: h.metaDescription,
    alternates: { canonical: path, languages: languageAlternates("/") },
    openGraph: { title: h.metaTitle, description: h.metaDescription, url: path, siteName: "Tracify", locale: ogLocale[locale], type: "website", images: [{ url: image, width: 1200, height: 630, alt: h.metaTitle }] },
    twitter: { card: "summary_large_image", title: h.metaTitle, description: h.metaDescription, images: [image] },
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="min-h-screen bg-[#090909]">
      <main id="main-content">
        <LocalizedHome locale={locale} />
      </main>
    </div>
  );
}
