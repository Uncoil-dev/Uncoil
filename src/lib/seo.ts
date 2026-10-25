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

const TITLE_SUFFIX = " | Tracify";
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 110;
const DESCRIPTION_MAX = 160;
const DESCRIPTION_TAILS = [
  "Tracify is AI agent observability.",
  "Trace runs, tool calls, cost and quality in one place.",
  "Start free with 25,000 spans a month.",
];

/**
 * Keeps the full `<title>` (page title + " | Tracify") within 60 characters so search results do not cut it.
 * Fits as-is when it can, drops the brand suffix when the title alone fits, and otherwise shortens the
 * title at its last natural break (colon, dash, bracket, comma) or word.
 */
export function fitTitle(title: string): NonNullable<Metadata["title"]> {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length + TITLE_SUFFIX.length <= TITLE_MAX) return clean;
  if (clean.length <= TITLE_MAX) return { absolute: clean };
  const window = clean.slice(0, TITLE_MAX + 1);
  for (const marks of [[": ", " - ", " — ", " ("], [", "]]) {
    const at = Math.max(...marks.map((mark) => window.lastIndexOf(mark)));
    if (at >= 25 && at <= TITLE_MAX) return { absolute: clean.slice(0, at).trim() };
  }
  const cut = window.lastIndexOf(" ", TITLE_MAX - 1);
  return { absolute: clean.slice(0, cut > 0 ? cut : TITLE_MAX - 1).replace(/[\s,:;-]+$/, "") };
}

/** Plain string form of {@link fitTitle}, for Open Graph and X titles. */
export function fitTitleText(title: string) {
  const fitted = fitTitle(title);
  return typeof fitted === "string" ? `${fitted}${TITLE_SUFFIX}` : (fitted as { absolute: string }).absolute;
}

/**
 * Keeps a meta description between 110 and 160 characters: trims long ones at a sentence or word
 * boundary and tops short ones up with a short Tracify line so snippets are neither cut nor thin.
 */
export function fitDescription(description: string) {
  let text = description.replace(/\s+/g, " ").trim();
  if (text.length > DESCRIPTION_MAX) {
    const window = text.slice(0, DESCRIPTION_MAX);
    const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
    if (sentence >= DESCRIPTION_MIN - 1) return window.slice(0, sentence + 1);
    const cut = text.slice(0, DESCRIPTION_MAX - 1).lastIndexOf(" ");
    return `${text.slice(0, cut).replace(/[\s,;:.-]+$/, "")}…`;
  }
  if (!/[.!?…]$/.test(text)) text += ".";
  for (const tail of DESCRIPTION_TAILS) {
    if (text.length >= DESCRIPTION_MIN) break;
    if (text.length + 1 + tail.length <= DESCRIPTION_MAX) text += ` ${tail}`;
  }
  return text;
}

/**
 * One place that builds the title, canonical, Open Graph and X card values so
 * every public page ships the full set the SEO release checklist requires.
 */
export function pageMetadata({ title, description, path, image, type = "website" }: PageMetadataInput): Metadata {
  const card = image ?? ogImageUrl({ title, kicker: kickerForPath(path) });
  const images = [{ url: card, width: 1200, height: 630, alt: `${title} | ${SITE_NAME}` }];
  const shareTitle = fitTitleText(title);
  description = fitDescription(description);
  return {
    title: fitTitle(title),
    description,
    alternates: { canonical: path },
    openGraph: { title: shareTitle, description, url: path, siteName: SITE_NAME, locale: "en_US", type, images },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [card] },
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
