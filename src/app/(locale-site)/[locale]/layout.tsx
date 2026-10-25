import "../../(frontend)/globals.css";
import { notFound } from "next/navigation";
import { SiteRoot, rootMetadata } from "@/components/site-root";
import { htmlLang, isLocale, otherLocales } from "@/lib/i18n";

export const metadata = rootMetadata;
export const dynamicParams = false;

export function generateStaticParams() {
  return otherLocales.map((locale) => ({ locale }));
}

// Root layout of its own for the translated pages, so <html lang> is nb / de in the served HTML
// and matches the hreflang annotations (the shared English layout can only render lang="en").
export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "en") notFound();
  // Umlauts and the Norwegian ring-above letters sit above the cap height of the pixel font,
  // so display headings need looser line spacing here than in English.
  return <SiteRoot lang={htmlLang[locale]}><div lang={htmlLang[locale]} className="pixel-loose">{children}</div></SiteRoot>;
}
