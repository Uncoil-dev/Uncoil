// The design the site root renders. Only this one is imported, so the other design's code is not
// shipped with the homepage. To go back to the previous homepage (still at /classic), change this
// import to `import { LandingPage as HomePage } from "@/components/marketing/landing/landing-page";`
// and set HOME_DESIGN to "classic" in src/lib/homepage.ts, which also moves the nav back.
import { HomePage } from "@/components/marketing/home/home-page";
import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Uncoil | AI agent observability, tracing and evaluation" },
  description: "Uncoil is AI agent observability for production teams: trace every run, tool call and cost, evaluate quality and get alerts. Start free.",
  alternates: { canonical: "/" },
  openGraph: { title: "Uncoil | AI agent observability and evaluation", description: "Trace every decision, tool call, cost, quality signal, and deployment change in one debugging timeline.", url: "/", siteName: "Uncoil", locale: "en_US", type: "website", images: [{ url: ogImageUrl({ title: "Every agent run, on the record.", kicker: "AI agent observability", sub: "Traces, cost, quality and alerts in one place.", kind: "home" }), width: 1200, height: 630, alt: "Uncoil | AI agent observability" }] },
  twitter: { card: "summary_large_image", title: "Uncoil | AI agent observability and evaluation", description: "Trace every decision, tool call, cost, quality signal, and deployment change in one debugging timeline.", images: [ogImageUrl({ title: "Every agent run, on the record.", kicker: "AI agent observability", sub: "Traces, cost, quality and alerts in one place.", kind: "home" })] },
};

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-[#090909]">
      <HomePage />
    </main>
  );
}
