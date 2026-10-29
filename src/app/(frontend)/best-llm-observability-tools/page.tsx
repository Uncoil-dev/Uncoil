import { appHref } from "@/lib/app-links";
import Link from "next/link";
import { pageMetadata, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/seo";
import { comparisons, type Faq } from "@/lib/seo-pages";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, CreamBand, DarkBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";
import { FaqList } from "@/components/marketing/company/faq-list";

export const metadata = pageMetadata({
  title: "Best LLM observability tools for AI agents",
  description: "How to choose an LLM and AI agent observability tool, with a plain comparison of Uncoil, Langfuse, LangSmith, Helicone, Arize Phoenix, Braintrust and Datadog.",
  path: "/best-llm-observability-tools",
});

const criteria = [
  ["How traces get in", "Look for OpenTelemetry support so your instrumentation is not locked to one vendor."],
  ["Whole runs, not single calls", "An agent makes many model and tool calls per task. You want them in one trace, in order."],
  ["Cost you can act on", "Cost per run and per task matters more than the monthly total."],
  ["Evaluation and alerts", "Tracing tells you what happened. Evaluation and alerts tell you what to fix first."],
  ["Where data lives", "Check hosting options, such as an EU region or self-hosting, before you commit."],
] as const;

const faq: readonly Faq[] = [
  { q: "What is LLM observability?", a: "LLM observability is recording the model calls, tool calls, cost, latency and errors of an AI application so its behavior can be inspected and debugged in production." },
  { q: "What is the difference between LLM observability and AI agent observability?", a: "Agent observability follows whole multi-step runs, including tool calls, retries and handoffs, instead of single model requests." },
  { q: "Do I need a dedicated tool or can I use general APM?", a: "General monitoring tools can show that a request was slow. A dedicated tool also shows prompts, tool calls, token cost and quality scores for each step." },
  { q: "Can I switch tools later?", a: "It is easier if you send traces over OpenTelemetry, because the instrumentation stays the same when the backend changes." },
  { q: "Is Uncoil the best choice?", a: "It depends on your needs. Uncoil fits teams that want managed tracing, cost, alerts and evaluation for agents, with an EU region. Other tools fit other needs, and each comparison page says when." },
];

export default function BestToolsPage() {
  const schema = [
    breadcrumbJsonLd([{ name: "Uncoil", path: "/" }, { name: "Best LLM observability tools", path: "/best-llm-observability-tools" }]),
    faqJsonLd(faq),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "LLM observability tools",
      itemListElement: [{ name: "Uncoil", url: "https://www.uncoil.dev" }, ...comparisons.map((c) => ({ name: c.name, url: `https://www.uncoil.dev/compare/${c.slug}` }))].map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, url: item.url })),
    },
  ];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      <PageHeader eyebrow="Guide / Choosing a tool" title="Best LLM observability tools." lede="The best tool is the one that matches how you collect traces, what you need to see and where your data has to live. Here is how to choose, and who each option fits.">
        <HeaderAction href="/compare">Compare Uncoil</HeaderAction>
        <HeaderAction href={appHref("/sign-up")} kind="secondary">Start free</HeaderAction>
      </PageHeader>

      <CreamBand>
        <Eyebrow dark={false}>How to choose</Eyebrow>
        <SectionTitle>Five questions that decide it.</SectionTitle>
        <ol className="mt-12 grid gap-px border border-black bg-black md:grid-cols-2">
          {criteria.map(([title, body], i) => (
            <li key={title} className="bg-[#eceae3] p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">0{i + 1}</p>
              <h3 className="mt-3 font-pixel text-2xl tracking-[-0.05em]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-black/70">{body}</p>
            </li>
          ))}
        </ol>
      </CreamBand>

      <DarkBand>
        <Eyebrow>The options</Eyebrow>
        <SectionTitle>Who each one fits.</SectionTitle>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-white/60">We make Uncoil, so read this with that in mind. Descriptions of other tools are short summaries; check their sites for current features and pricing.</p>
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/30 font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                <th scope="col" className="py-4 pr-6">Tool</th>
                <th scope="col" className="py-4 pr-6">Best when you</th>
                <th scope="col" className="py-4">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/15 align-top">
                <th scope="row" className="py-5 pr-6 font-pixel text-xl tracking-[-0.04em] text-[#f4d44d]">Uncoil</th>
                <td className="py-5 pr-6 leading-6 text-[#eceae3]">Run agents and want managed tracing, cost, alerts and evaluation, with an EU region.</td>
                <td className="py-5"><Link href="/product/trace-viewer" className="underline">Trace viewer</Link></td>
              </tr>
              {comparisons.map((c) => (
                <tr key={c.slug} className="border-b border-white/15 align-top">
                  <th scope="row" className="py-5 pr-6 font-pixel text-xl tracking-[-0.04em]">{c.name}</th>
                  <td className="py-5 pr-6 leading-6 text-white/75">{c.pickThem[0]}.</td>
                  <td className="py-5"><Link href={`/compare/${c.slug}`} className="underline">Uncoil vs {c.name}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DarkBand>

      <CreamBand>
        <Eyebrow dark={false}>Questions</Eyebrow>
        <SectionTitle>Quick answers.</SectionTitle>
        <div className="mt-10"><FaqList items={faq} /></div>
        <p className="mt-10 text-sm text-black/60">Next: <Link className="underline" href="/glossary/llm-observability">what is LLM observability</Link>, <Link className="underline" href="/integrations/opentelemetry">send OpenTelemetry traces</Link>, <Link className="underline" href="/pricing">pricing</Link>.</p>
      </CreamBand>
      <ClosingBand title="Try it on your own agent." body="Free to start. First trace in minutes." actions={[{ href: appHref("/sign-up"), label: "Start free", primary: true }, { href: "/compare", label: "See comparisons" }]} />
    </div>
  );
}
