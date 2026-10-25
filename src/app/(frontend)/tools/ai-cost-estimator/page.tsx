import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd, jsonLdString } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { CostEstimator } from "@/components/marketing/cost-estimator";
import { NewsletterPanel } from "@/components/marketing/newsletter-panel";

const path = "/tools/ai-cost-estimator";

export const metadata = pageMetadata({
  title: "Free AI agent cost estimator",
  description: "Estimate what an AI agent will cost per run, per finished task and per month. Free, no sign-up, nothing leaves your browser.",
  path,
});

const faqs = [
  { q: "How is the monthly cost worked out?", a: "Each model call costs its input tokens times the input price plus its output tokens times the output price. That is multiplied by the calls per run, repeated for the share of runs that retry, then multiplied by runs per day and 30 days." },
  { q: "Where do the example prices come from?", a: "They are round numbers for a small, a mid and a frontier model, so the page works out of the box. They are not a provider price list. Type the rates from your own provider bill." },
  { q: "Why is cost per finished task higher than cost per run?", a: "Runs that fail still spend tokens. Dividing the total by only the runs that succeed shows what a delivered result really costs." },
  { q: "Does this page store my numbers?", a: "No. The maths runs in your browser. The copy link button puts your numbers in the web address so you can share them, and nothing is saved on our side." },
  { q: "How accurate is it?", a: "It is as accurate as your inputs. Real agents vary run to run, so treat the result as a planning range and check it against measured spend once you have traces." },
];

export default function CostEstimatorPage() {
  const schema = [
    breadcrumbJsonLd([{ name: "Tracify", path: "/" }, { name: "Tools", path }, { name: "AI cost estimator", path }]),
    { "@context": "https://schema.org", "@type": "WebApplication", name: "AI agent cost estimator", url: `https://www.tracify.tech${path}`, applicationCategory: "BusinessApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Free tool / cost" title="What will your agent cost?" lede="Type in your traffic and token counts. See the cost per run, per finished task and per month, and which change saves the most.">
        <HeaderAction href="#estimator">Open the estimator</HeaderAction>
        <HeaderAction href="/blog/how-to-estimate-ai-agent-costs" kind="secondary">How the maths works</HeaderAction>
      </PageHeader>
      <CreamBand id="estimator">
        <Eyebrow dark={false}>No sign-up / runs in your browser</Eyebrow>
        <SectionTitle>Plan the bill before it arrives.</SectionTitle>
        <div className="mt-12"><CostEstimator /></div>
      </CreamBand>
      <section className="border-t-2 border-black bg-[#eceae3] px-5 pb-20 text-black md:px-10 md:pb-28">
        <div className="mx-auto grid max-w-[1320px] gap-12 border-t border-black/20 pt-16 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow dark={false}>Read next</Eyebrow>
            <h2 className="mt-5 font-pixel text-[clamp(2rem,4vw,3.4rem)] leading-[0.95] tracking-[-0.06em]">Questions people ask.</h2>
            <ul className="mt-8 space-y-3 text-sm leading-6">
              <li><Link className="underline decoration-[#f4d44d] decoration-2 underline-offset-4 hover:bg-[#f4d44d]" href="/blog/how-to-estimate-ai-agent-costs">How to estimate AI agent costs before launch</Link></li>
              <li><Link className="underline decoration-[#f4d44d] decoration-2 underline-offset-4 hover:bg-[#f4d44d]" href="/blog/how-to-track-llm-token-usage">How to track LLM token usage per request</Link></li>
              <li><Link className="underline decoration-[#f4d44d] decoration-2 underline-offset-4 hover:bg-[#f4d44d]" href="/blog/ai-agent-cost-per-task">AI agent cost per task</Link></li>
            </ul>
          </div>
          <div className="divide-y divide-black/15 border-y border-black/15">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span aria-hidden className="font-mono text-lg transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 max-w-xl text-sm leading-6 text-black/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-[1320px]"><NewsletterPanel source="cost-estimator" heading="Get the cost guides when they land." /></div>
      </section>
      <ClosingBand title="Now measure the real thing." body="Send a first trace and see the true cost of every run." actions={[{ href: appHref("/sign-up"), label: "Start free", primary: true }, { href: "/docs/quickstart", label: "Read the quickstart" }]} />
    </div>
  );
}
