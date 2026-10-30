import { ORG_PROFILES } from "@/lib/about";
import { ConvexClientProvider } from "@/components/convex-provider";
import { cookies } from "next/headers";
import { getToken } from "@/lib/auth-server";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/seo";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ConsentBanner } from "@/components/privacy/consent-banner-lazy";
import { ReferralCapture } from "@/components/marketing/referral-capture";
import { CloudPrewarm } from "@/components/marketing/cloud-prewarm";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Only the Square cut of Geist Pixel is used. Importing from geist/font/pixel
// registers and preloads all five cuts, which is ~110 KB of unused fonts.
const GeistPixelSquare = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2",
  variable: "--font-geist-pixel-square",
  weight: "500",
  fallback: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Roboto Mono", "Menlo", "Monaco", "Liberation Mono", "DejaVu Sans Mono", "Courier New", "monospace"],
  adjustFontFallback: false,
});

const isCloudDeployment = (process.env.NEXT_PUBLIC_UNCOIL_DEPLOYMENT_KIND ?? process.env.NEXT_PUBLIC_TRACIFY_DEPLOYMENT_KIND) === "cloud";

export const rootMetadata: Metadata = {
  metadataBase: new URL("https://www.uncoil.dev"),
  title: { default: "Uncoil | AI agent observability and evaluation", template: "%s | Uncoil" },
  description: "Trace, evaluate, and improve AI agents with one operational record for failures, cost, quality, prompts, and releases.",
  applicationName: "Uncoil",
  category: "AI agent observability",
  keywords: ["AI agent observability", "LLM observability", "AI agent evaluation", "OpenTelemetry tracing", "agent tracing", "LLM cost monitoring"],
  robots: isCloudDeployment
    ? { index: false, follow: false }
    : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: {
    title: "Uncoil | AI agent observability and evaluation",
    description: "Trace every decision, tool call, cost, quality signal, and deployment change in one debugging timeline.",
    type: "website",
    siteName: "Uncoil",
    locale: "en_US",
    images: [{ url: ogImageUrl({ title: "Every agent run, on the record.", kicker: "AI agent observability", sub: "Traces, cost, quality and alerts in one place.", kind: "home" }), width: 1200, height: 630, alt: "Uncoil | AI agent observability" }],
  },
  twitter: { card: "summary_large_image", title: "Uncoil | AI agent observability and evaluation", description: "Agent observability for traces, cost, quality, prompts, and alerts.", images: [ogImageUrl({ title: "Every agent run, on the record.", kicker: "AI agent observability", sub: "Traces, cost, quality and alerts in one place.", kind: "home" })] },
};

const structuredData = [
  { "@context": "https://schema.org", "@type": "Organization", name: "Uncoil", url: "https://www.uncoil.dev", logo: "https://www.uncoil.dev/logo.png", alternateName: ["Uncoil AI agent observability", "uncoil.dev"], description: "Uncoil is an observability and evaluation platform for AI agents, at uncoil.dev.", sameAs: ORG_PROFILES },
  { "@context": "https://schema.org", "@type": "WebSite", name: "Uncoil", url: "https://www.uncoil.dev", description: "AI agent observability and evaluation." },
];

/** Asking Convex for a token costs a backend call on every page load. Signed-out visitors, crawlers and uptime checks have no session cookie, so they skip it. */
async function initialConvexToken() {
  if (!isCloudDeployment) return null;
  const hasSession = (await cookies()).getAll().some((cookie) => cookie.name.endsWith("session_token"));
  return hasSession ? getToken() : null;
}

/** Shared document shell. `lang` is rendered on the server so crawlers see the page language that matches its hreflang. */
export async function SiteRoot({ lang = "en", children }: Readonly<{ lang?: string; children: React.ReactNode }>) {
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <ConvexClientProvider initialToken={await initialConvexToken()}>
          <TooltipProvider><SiteChrome>{children}</SiteChrome><ConsentBanner /></TooltipProvider>
        </ConvexClientProvider>
        {isCloudDeployment ? null : <CloudPrewarm />}
        <ReferralCapture />
        <GoogleTagManager />
      </body>
    </html>
  );
}
