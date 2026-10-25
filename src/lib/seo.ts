import type { Metadata } from "next";

export const SITE_URL = "https://www.tracify.tech";
export const SITE_NAME = "Tracify";

type PageMetadataInput = {
  title: string;
  description: string;
  /** Canonical path such as `/pricing`. Always the final www URL, no redirects. */
  path: string;
  /** Optional absolute or root-relative image. Falls back to the generated site card. */
  image?: string;
  type?: "website" | "article";
};

/**
 * One place that builds the title, canonical, Open Graph and X card values so
 * every public page ships the full set the SEO release checklist requires.
 */
export function pageMetadata({ title, description, path, image, type = "website" }: PageMetadataInput): Metadata {
  const card = image ?? ogImageUrl({ title, kicker: kickerForPath(path) });
  const images = [{ url: card, width: 1200, height: 630, alt: `${title} | ${SITE_NAME}` }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, locale: "en_US", type, images },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [card] },
  };
}

/** Utility routes (auth, onboarding, checkout, previews) must never be indexed. */
export const noIndex: Metadata = { robots: { index: false, follow: false } };

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqJsonLd(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

const publisher = { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` } };

/** Article markup for blog posts and docs pages (Google and Ahrefs both expect `Article`). */
export function articleJsonLd({ headline, description, path, image, datePublished, dateModified, author }: {
  headline: string;
  description: string;
  path: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
}) {
  const url = path.startsWith("http") ? path : `${SITE_URL}${path}`;
  const picture = image ? (image.startsWith("http") ? image : `${SITE_URL}${image}`) : `${SITE_URL}${ogImageUrl({ title: headline, kicker: kickerForPath(path) })}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: headline.slice(0, 110),
    description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: [picture],
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified || datePublished ? { dateModified: dateModified ?? datePublished } : {}),
    author: author && author !== "Tracify Team" ? { "@type": "Person", name: author } : { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher,
  };
}

/** Real plans only: Pro $19 and Team $39 per month, plus the free tier. No ratings or reviews. */
const PLAN_OFFERS = [
  { name: "Free", price: "0" },
  { name: "Pro", price: "19" },
  { name: "Team", price: "39" },
] as const;

export function productJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: `${SITE_URL}${path}`,
    image: `${SITE_URL}/logo.png`,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: "AI agent observability software",
    offers: PLAN_OFFERS.map((plan) => ({
      "@type": "Offer",
      name: `Tracify ${plan.name}`,
      url: `${SITE_URL}/pricing`,
      price: plan.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceSpecification: { "@type": "UnitPriceSpecification", price: plan.price, priceCurrency: "USD", billingDuration: "P1M", unitCode: "MON" },
    })),
  };
}

export function itemListJsonLd(name: string, items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, url: `${SITE_URL}${item.path}` })),
  };
}

/** Serialises JSON-LD safely for an inline script tag. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Share-card URL for a page. Rendered by `/og` in the Dissolve style (ink, cream, yellow
 * pixel bars) with the page's own title on it.
 */
export function ogImageUrl({ title, kicker, sub, kind }: { title: string; kicker?: string; sub?: string; kind?: "home" | "page" | "blog" }) {
  const query = new URLSearchParams({ title });
  if (kicker) query.set("kicker", kicker);
  if (sub) query.set("sub", sub);
  if (kind) query.set("kind", kind);
  return `/og?${query.toString()}`;
}

/** Picks a share-card label from the route so each page type reads differently. */
export function kickerForPath(path: string) {
  if (path.startsWith("/blog")) return "Blog";
  if (path.startsWith("/docs")) return "Documentation";
  if (path.startsWith("/product")) return "Product";
  if (path.startsWith("/use-cases")) return "Use case";
  if (path.startsWith("/pricing")) return "Pricing";
  return "AI agent observability";
}
