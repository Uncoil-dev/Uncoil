import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString, productJsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { CreamBand, DarkBand, Eyebrow, SectionTitle, StatStrip } from "@/components/marketing/company/blocks";
import { CodePanel } from "@/components/marketing/company/code-panel";
import { FaqList } from "@/components/marketing/company/faq-list";
import { BuyButton } from "@/components/health-report/buy-button";
import { EXAMPLE_SPANS_JSON, HEALTH_REPORT_PRICE_USD } from "@/lib/health-report";

export const metadata = pageMetadata({
  title: "Agent health report",
  description: `Send us a week of your agent's runs. Get back what it costs, where it breaks and which steps are slow, with fixes ranked by money saved. One price: $${HEALTH_REPORT_PRICE_USD}.`,
  path: "/health-report",
});

const faqs = [
  { q: "What do I need to send?", a: "A week or more of steps from your agents, as JSON, JSON lines or CSV. Each step needs a run id and a time. Cost, latency, model, tool and error fields make the report richer. Uncoil SDK exports work as they are, and the format is shown above." },
  { q: "Do you keep my prompts and answers?", a: "No. We read your file once, add up cost, time and errors, and store only those totals so you can open the report again. Prompt and answer text is not kept, and you can leave it out of the file." },
  { q: "How long until I have the report?", a: "A few seconds after you upload. You pay first, upload on the next page, and the report opens right away at a private link you can share or save as a PDF." },
  { q: "What if my data is the wrong shape?", a: "The page tells you what it could not read, and you can upload again with the same payment. If it still does not work, write to us and we will fix the report by hand." },
  { q: "Is this a subscription?", a: "No. You pay once. If you later want the same numbers live, with alerts, send traces to Uncoil. Free covers 5,000 steps a day." },
] as const;

export default function HealthReportPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Agent health report", path: "/health-report" }]), productJsonLd({ name: "Agent health report", description: "A one-off report on the cost, errors and slow steps of an AI agent, built from a week of runs.", path: "/health-report" }), faqJsonLd([...faqs])]) }} />
      <PageHeader eyebrow="One-off report" title="Is your agent healthy? Find out." lede={`Send a week of runs. Get back what it costs, where it breaks and what is slow, with fixes ranked by money saved. $${HEALTH_REPORT_PRICE_USD}, once. No subscription, no account.`}>
        <div className="mt-8 flex flex-wrap items-start gap-3">
          <BuyButton label={`Get my report · $${HEALTH_REPORT_PRICE_USD}`} />
          <Link href="/health-report/sample" className="inline-flex min-h-12 items-center border border-white/60 bg-black/70 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black">See a sample report</Link>
        </div>
      </PageHeader>
      <StatStrip stats={[[`$${HEALTH_REPORT_PRICE_USD}`, "Once, no subscription"], ["~5 min", "Upload to finished report"], ["0", "Prompts or answers kept"], ["Top 6", "Fixes, ranked by money"]]} />

      <CreamBand>
        <Eyebrow dark={false}>How it works</Eyebrow>
        <SectionTitle>Three steps. No setup.</SectionTitle>
        <ol className="mt-12 grid gap-px border border-black bg-black md:grid-cols-3">
          {[["1", "Pay", `Checkout is $${HEALTH_REPORT_PRICE_USD} on Stripe. No login needed.`], ["2", "Upload your runs", "Drop in a file of steps, or paste it. JSON, JSON lines or CSV."], ["3", "Read your report", "A private link opens at once. Share it with your team or save it as a PDF."]].map(([n, title, body]) => (
            <li key={n} className="bg-[#eceae3] p-6 md:p-8">
              <span className="font-pixel text-5xl leading-none tracking-[-0.06em]">{n}</span>
              <h3 className="mt-4 font-pixel text-2xl tracking-[-0.05em]">{title}</h3>
              <p className="mt-2 text-base leading-7 text-black/70">{body}</p>
            </li>
          ))}
        </ol>
      </CreamBand>

      <DarkBand>
        <Eyebrow>What is inside</Eyebrow>
        <SectionTitle>The numbers your team keeps guessing at.</SectionTitle>
        <ul className="mt-12 grid gap-px bg-white/15 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["Cost", "Spend by model and by agent, and the five runs that cost the most."],
            ["Failures", "How many runs end in an error, grouped by cause, with the step that breaks."],
            ["Slow steps", "Typical and worst-case time per step, and which steps eat the clock."],
            ["Waste", "Retries, loops and runaway runs, with a monthly dollar estimate for each."],
            ["Fixes", "Up to six plain-language fixes, ranked by what they save."],
            ["A page to share", "A private link and a print-ready PDF for your team or your boss."],
          ].map(([title, body]) => (
            <li key={title} className="bg-[#090909] p-6 md:p-8">
              <h3 className="font-pixel text-2xl tracking-[-0.05em] text-[#f4d44d]">{title}</h3>
              <p className="mt-2 text-base leading-7 text-white/70">{body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10"><Link href="/health-report/sample" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#f4d44d] underline underline-offset-4 hover:text-white">Open the sample report →</Link></div>
      </DarkBand>

      <CreamBand id="what-to-upload">
        <Eyebrow dark={false}>What to upload</Eyebrow>
        <SectionTitle>The same steps the Uncoil SDK sends.</SectionTitle>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/70">One row per step. Only a run id and a time are required. More fields, such as cost, tokens, model, tool and errors, give you a richer report. CSV works too; use these names as column headers. You can leave out prompts and answers.</p>
        <div className="mt-8 max-w-3xl"><CodePanel code={EXAMPLE_SPANS_JSON} label="steps.json" /></div>
      </CreamBand>

      <DarkBand>
        <Eyebrow>Questions</Eyebrow>
        <SectionTitle>Before you buy.</SectionTitle>
        <div className="mt-10"><FaqList items={faqs} dark /></div>
        <div className="mt-12"><BuyButton label={`Get my report · $${HEALTH_REPORT_PRICE_USD}`} /></div>
      </DarkBand>
    </div>
  );
}
