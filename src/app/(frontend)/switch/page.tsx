import Link from "next/link";
import { appHref } from "@/lib/app-links";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/seo";
import { comparisons } from "@/lib/seo-pages";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, DarkBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { FaqList } from "@/components/marketing/company/faq-list";

export const metadata = pageMetadata({
  title: "Switch to Uncoil: move from Langfuse, LangSmith or Helicone",
  description: "A step-by-step guide to moving AI agent tracing to Uncoil from Langfuse, LangSmith, Helicone or plain OpenTelemetry. Run both side by side, then switch off the old one.",
  path: "/switch",
});

const moving = ["langfuse", "langsmith", "helicone"] as const;

const faq = [
  { q: "Do I have to rewrite my instrumentation?", a: "Usually not. Uncoil accepts OpenTelemetry (OTLP) over HTTP, so instrumentation that already exports OpenTelemetry spans only needs a new endpoint and key. Otherwise add the TypeScript or Python SDK." },
  { q: "Can I run Uncoil next to my current tool?", a: "Yes, and we suggest it. Send traces to both for a week, check that runs and tool calls look right, then switch the old one off." },
  { q: "Will my old traces move over?", a: "No. Uncoil starts with new traces. Keep your old tool read-only for as long as you want the history." },
  { q: "What does it cost?", a: "Free for 25k spans a month. Pro is a flat $19 and Team a flat $39. Use the bill calculator to compare your own traffic." },
  { q: "Does Uncoil sit in my request path?", a: "No. Uncoil receives traces after the work is done, so it cannot slow or break a model call." },
];

export default function SwitchPage() {
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Switch to Uncoil", path: "/switch" }]),
    faqJsonLd(faq),
  ];
  const guides = moving.map((slug) => comparisons.find((c) => c.slug === slug)).filter((c) => c !== undefined);
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Switch" title="Switch to Uncoil." lede="Already tracing your agents somewhere else? Move in an afternoon. Run both tools side by side, then turn the old one off.">
        <HeaderAction href={appHref("/sign-up")}>Start free</HeaderAction>
        <HeaderAction href="/tools/ai-observability-cost-calculator" kind="secondary">Compare your bill</HeaderAction>
      </PageHeader>

      <CreamBand>
        <Eyebrow dark={false}>The plan</Eyebrow>
        <SectionTitle>Four steps, any tool.</SectionTitle>
        <ol className="mt-10 grid gap-px border border-black bg-black md:grid-cols-2">
          {[
            "Create an Uncoil project and copy its API key. It takes about a minute.",
            "Add the Uncoil SDK, or point your OpenTelemetry exporter at Uncoil. Leave your old tool on.",
            "Run your agent. Check that every run shows its model calls, tool calls, cost and errors.",
            "After a week of matching results, remove the old tool.",
          ].map((t, i) => (
            <li key={t} className="bg-[#eceae3] p-6 text-sm leading-6 text-black/80">
              <span className="mb-3 block font-pixel text-2xl tracking-[-0.05em]">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </CreamBand>

      <DarkBand>
        <Eyebrow>Coming from</Eyebrow>
        <SectionTitle>Pick your current tool.</SectionTitle>
        <div className="mt-10 grid gap-px border border-white/20 bg-white/20 md:grid-cols-3">
          {guides.map((c) => (
            <section key={c.slug} id={c.slug} className="scroll-mt-24 bg-[#090909] p-6">
              <h3 className="font-pixel text-2xl tracking-[-0.05em] text-[#f4d44d]">{c.name}</h3>
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/80">
                {c.switching?.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <Link href={`/compare/${c.slug}`} className="mt-6 inline-block border border-[#f4d44d] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#f4d44d] hover:bg-[#f4d44d] hover:text-black">Uncoil vs {c.name}</Link>
            </section>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-white/60">Using something else, or plain OpenTelemetry? Uncoil takes standard OTLP spans over HTTP, so most setups only change the endpoint and the key. See the <Link href="/integrations/opentelemetry" className="underline decoration-[#f4d44d] underline-offset-4">OpenTelemetry guide</Link> or the <Link href="/docs/quickstart" className="underline decoration-[#f4d44d] underline-offset-4">quickstart</Link>.</p>
      </DarkBand>

      <CreamBand>
        <Eyebrow dark={false}>Questions</Eyebrow>
        <SectionTitle>Before you move.</SectionTitle>
        <div className="mt-10"><FaqList items={faq} /></div>
      </CreamBand>
      <ClosingBand title="Try it next to your current tool." body="Free to start. First trace in minutes." actions={[{ href: appHref("/sign-up"), label: "Start free", primary: true }, { href: "/tools/ai-observability-cost-calculator", label: "Compare your bill" }]} />
    </div>
  );
}
