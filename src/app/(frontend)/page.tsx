import { LandingPage } from "@/components/marketing/landing/landing-page";
import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import { ogImageUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Tracify | AI agent observability, tracing and evaluation" },
  description: "Tracify is AI agent observability for production teams: trace every run, tool call and cost, evaluate quality and get alerts. Start free.",
  alternates: { canonical: "/", languages: languageAlternates("/") },
  openGraph: { title: "Tracify | AI agent observability and evaluation", description: "Trace every decision, tool call, cost, quality signal, and deployment change in one debugging timeline.", url: "/", siteName: "Tracify", locale: "en_US", type: "website", images: [{ url: ogImageUrl({ title: "Every agent run, on the record.", kicker: "AI agent observability", sub: "Traces, cost, quality and alerts in one place.", kind: "home" }), width: 1200, height: 630, alt: "Tracify | AI agent observability" }] },
  twitter: { card: "summary_large_image", title: "Tracify | AI agent observability and evaluation", description: "Trace every decision, tool call, cost, quality signal, and deployment change in one debugging timeline.", images: [ogImageUrl({ title: "Every agent run, on the record.", kicker: "AI agent observability", sub: "Traces, cost, quality and alerts in one place.", kind: "home" })] },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#090909]">
      <main id="main-content">
        <LandingPage />
      </main>
    </div>
  );
}
